import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { getDb } from "./db";
import {
  activityLog,
  budgetItems,
  changeOrders,
  documentVersions,
  documents,
  manufacturers,
  messages,
  milestones,
  notifications,
  products,
  projectTeam,
  projects,
  submittals,
  users,
} from "../drizzle/schema";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";
import { seedRouter } from "./routers/seed";
import { invitesRouter } from "./routers/invites";
import { searchRouter } from "./routers/search";
import { prospectRadarRouter } from "./routers/prospectRadar";
import { pursuitsRouter } from "./routers/pursuits";

// ─── Role helpers ─────────────────────────────────────────────────────────────
const INTERNAL_ROLES = ["sls_admin", "sls_rep", "sls_pm", "admin"] as const;
const ADMIN_ROLES = ["sls_admin", "admin"] as const;
const PM_ROLES = ["sls_pm", "sls_admin", "admin"] as const;

function isInternal(role: string) {
  return (INTERNAL_ROLES as readonly string[]).includes(role);
}
function isAdmin(role: string) {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

// ─── Log activity helper ──────────────────────────────────────────────────────
async function logActivity(
  userId: number,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: string,
  projectId?: number
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLog).values({
    userId,
    projectId,
    action,
    entityType,
    entityId,
    details,
  });
}

// ─── Create notification helper ───────────────────────────────────────────────
async function createNotification(
  userId: number,
  type: typeof notifications.$inferInsert["type"],
  title: string,
  body?: string,
  projectId?: number,
  actionUrl?: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ userId, type, title, body, projectId, actionUrl });
}

// ─── Project access check ─────────────────────────────────────────────────────
async function checkProjectAccess(userId: number, projectId: number, role: string) {
  if (isAdmin(role) || role === "sls_pm") return true;
  const db = await getDb();
  if (!db) return false;

  // Check if internal rep assigned
  if (role === "sls_rep") {
    const proj = await db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.assignedRepId, userId))
    ).limit(1);
    if (proj.length > 0) return true;
  }

  // Check team membership
  const team = await db.select().from(projectTeam).where(
    and(eq(projectTeam.projectId, projectId), eq(projectTeam.userId, userId))
  ).limit(1);
  return team.length > 0;
}

// ─── Projects Router ──────────────────────────────────────────────────────────
const projectsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      region: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const role = ctx.user.role;
      let query = db.select().from(projects).where(eq(projects.isArchived, false));

      const allProjects = await db.select().from(projects).where(eq(projects.isArchived, false));

      // Filter by role
      if (!isAdmin(role) && role !== "sls_pm") {
        if (role === "sls_rep") {
          const repProjects = allProjects.filter(p => p.assignedRepId === ctx.user.id);
          const teamRows = await db.select().from(projectTeam).where(eq(projectTeam.userId, ctx.user.id));
          const teamProjectIds = teamRows.map(t => t.projectId);
          return allProjects.filter(p =>
            p.assignedRepId === ctx.user.id || teamProjectIds.includes(p.id)
          );
        } else {
          // Client roles - only team projects
          const teamRows = await db.select().from(projectTeam).where(eq(projectTeam.userId, ctx.user.id));
          const teamProjectIds = teamRows.map(t => t.projectId);
          return allProjects.filter(p => teamProjectIds.includes(p.id));
        }
      }

      return allProjects;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const hasAccess = await checkProjectAccess(ctx.user.id, input.id, ctx.user.role);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      const result = await db.select().from(projects).where(eq(projects.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      region: z.enum(["georgia", "tennessee", "alabama", "national", "other"]).optional(),
      buildingType: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      originalBudget: z.string().optional(),
      assignedRepId: z.number().optional(),
      assignedPmId: z.number().optional(),
      targetDeliveryAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(projects).values({
        ...input,
        originalBudget: input.originalBudget,
        currentBudget: input.originalBudget,
        createdBy: ctx.user.id,
      });
      const id = Number((result as any).insertId);
      await logActivity(ctx.user.id, "project_created", "project", id, input.name);
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["intake", "active", "pending_approval", "ordered", "delivered", "complete", "archived"]).optional(),
      region: z.enum(["georgia", "tennessee", "alabama", "national", "other"]).optional(),
      buildingType: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      originalBudget: z.string().optional(),
      currentBudget: z.string().optional(),
      budgetStatus: z.enum(["on_budget", "at_risk", "over_budget"]).optional(),
      timelineStatus: z.enum(["on_track", "at_risk", "delayed"]).optional(),
      assignedRepId: z.number().optional(),
      assignedPmId: z.number().optional(),
      targetDeliveryAt: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(projects).set(data).where(eq(projects.id, id));
      await logActivity(ctx.user.id, "project_updated", "project", id);
      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { total: 0, active: 0, onTime: 0, onBudget: 0 };
    const all = await db.select().from(projects).where(eq(projects.isArchived, false));
    const active = all.filter(p => p.status === "active" || p.status === "ordered");
    const onTime = all.filter(p => p.timelineStatus === "on_track").length;
    const onBudget = all.filter(p => p.budgetStatus === "on_budget").length;
    return {
      total: all.length,
      active: active.length,
      onTime: all.length > 0 ? Math.round((onTime / all.length) * 100) : 100,
      onBudget: all.length > 0 ? Math.round((onBudget / all.length) * 100) : 100,
    };
  }),
});

// ─── Products Router ──────────────────────────────────────────────────────────
const productsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const hasAccess = await checkProjectAccess(ctx.user.id, input.projectId, ctx.user.role);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      return db.select().from(products).where(eq(products.projectId, input.projectId));
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      manufacturerName: z.string().optional(),
      modelNumber: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      quantity: z.number().default(1),
      unitCost: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const totalCost = input.unitCost && input.quantity
        ? String(parseFloat(input.unitCost) * input.quantity)
        : undefined;
      const result = await db.insert(products).values({
        ...input,
        totalCost,
        createdBy: ctx.user.id,
      });
      return { id: Number((result as any).insertId) };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      manufacturerName: z.string().optional(),
      modelNumber: z.string().optional(),
      description: z.string().optional(),
      quantity: z.number().optional(),
      unitCost: z.string().optional(),
      status: z.enum(["specified", "submitted", "approved", "ordered", "shipped", "delivered", "installed"]).optional(),
      orderStatus: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const totalCost = data.unitCost && data.quantity
        ? String(parseFloat(data.unitCost) * data.quantity)
        : undefined;
      await db.update(products).set({ ...data, ...(totalCost ? { totalCost } : {}) }).where(eq(products.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(products).where(eq(products.id, input.id));
      return { success: true };
    }),
});

// ─── Documents Router ─────────────────────────────────────────────────────────
const documentsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number(), type: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const hasAccess = await checkProjectAccess(ctx.user.id, input.projectId, ctx.user.role);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      return db.select().from(documents).where(eq(documents.projectId, input.projectId));
    }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    if (isInternal(ctx.user.role)) {
      return db.select().from(documents).orderBy(desc(documents.createdAt)).limit(100);
    }
    const teamRows = await db.select().from(projectTeam).where(eq(projectTeam.userId, ctx.user.id));
    const projectIds = teamRows.map(t => t.projectId);
    if (projectIds.length === 0) return [];
    return db.select().from(documents).where(
      or(...projectIds.map(id => eq(documents.projectId, id)))
    ).orderBy(desc(documents.createdAt)).limit(100);
  }),

  upload: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      name: z.string(),
      type: z.enum(["spec_sheet", "submittal", "approval", "change_order", "invoice", "cut_sheet", "as_built", "warranty", "field_photo", "marketing_materials", "case_study", "other"]),
      fileDataBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const buffer = Buffer.from(input.fileDataBase64, "base64");
      const fileKey = `sls-docs/${ctx.user.id}/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      const result = await db.insert(documents).values({
        projectId: input.projectId,
        name: input.name,
        type: input.type,
        fileUrl: url,
        fileKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        uploadedBy: ctx.user.id,
      });
      const id = Number((result as any).insertId);
      await logActivity(ctx.user.id, "document_uploaded", "document", id, input.name, input.projectId);
      if (input.projectId) {
        const teamRows = await db.select().from(projectTeam).where(eq(projectTeam.projectId, input.projectId));
        for (const member of teamRows) {
          if (member.userId !== ctx.user.id) {
            await createNotification(member.userId, "new_document", `New document: ${input.name}`, undefined, input.projectId, `/projects/${input.projectId}`);
          }
        }
      }
      return { id, url };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(documents).where(eq(documents.id, input.id));
      return { success: true };
    }),

  getBulkDownloadUrls: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1).max(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select({ id: documents.id, name: documents.name, fileUrl: documents.fileUrl, fileName: documents.fileName, mimeType: documents.mimeType })
        .from(documents)
        .where(inArray(documents.id, input.ids));
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        fileUrl: r.fileUrl,
        fileName: r.fileName ?? r.name,
        mimeType: r.mimeType ?? "application/octet-stream",
      }));
    }),

  // ── Version History ──────────────────────────────────────────────────────
  listVersions: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      // Fetch the parent document to verify access
      const [doc] = await db.select().from(documents).where(eq(documents.id, input.documentId)).limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      if (doc.projectId) {
        const hasAccess = await checkProjectAccess(ctx.user.id, doc.projectId, ctx.user.role);
        if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      }
      const versions = await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, input.documentId))
        .orderBy(desc(documentVersions.versionNumber));
      // Also include the current live version as "v{currentVersion}" if no version rows yet
      return versions;
    }),

  uploadVersion: protectedProcedure
    .input(z.object({
      documentId: z.number(),
      fileDataBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      fileSize: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Fetch parent document
      const [doc] = await db.select().from(documents).where(eq(documents.id, input.documentId)).limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      if (doc.projectId) {
        const hasAccess = await checkProjectAccess(ctx.user.id, doc.projectId, ctx.user.role);
        if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Snapshot current version into document_versions before replacing
      const nextVersion = (doc.currentVersion ?? doc.version ?? 1) + 1;
      await db.insert(documentVersions).values({
        documentId: doc.id,
        versionNumber: doc.currentVersion ?? doc.version ?? 1,
        fileUrl: doc.fileUrl,
        fileKey: doc.fileKey,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize ?? undefined,
        uploadedBy: doc.uploadedBy,
        notes: null,
        createdAt: doc.createdAt,
      });
      // Upload the new file
      const buffer = Buffer.from(input.fileDataBase64, "base64");
      const fileKey = `sls-docs/${ctx.user.id}/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      // Update the parent document to point at the new file
      await db.update(documents).set({
        fileUrl: url,
        fileKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        currentVersion: nextVersion,
        version: nextVersion,
        updatedAt: new Date(),
      }).where(eq(documents.id, input.documentId));
      await logActivity(ctx.user.id, "document_version_uploaded", "document", input.documentId, `v${nextVersion}: ${doc.name}`, doc.projectId ?? undefined);
      return { id: input.documentId, versionNumber: nextVersion, url };
    }),
});

// ─── Milestones Router ────────────────────────────────────────────────────────
const milestonesRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const hasAccess = await checkProjectAccess(ctx.user.id, input.projectId, ctx.user.role);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      return db.select().from(milestones).where(eq(milestones.projectId, input.projectId));
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string(),
      type: z.enum(["quote_submitted", "quote_approved", "order_placed", "in_production", "shipped", "delivered", "installed", "project_complete", "custom"]).optional(),
      targetDate: z.date().optional(),
      status: z.enum(["pending", "on_track", "at_risk", "delayed", "complete"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(milestones).values({ ...input, createdBy: ctx.user.id });
      return { id: Number((result as any).insertId) };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      targetDate: z.date().optional(),
      actualDate: z.date().optional(),
      status: z.enum(["pending", "on_track", "at_risk", "delayed", "complete"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(milestones).set(data).where(eq(milestones.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(milestones).where(eq(milestones.id, input.id));
      return { success: true };
    }),
});

// ─── Budget Router ────────────────────────────────────────────────────────────
const budgetRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const hasAccess = await checkProjectAccess(ctx.user.id, input.projectId, ctx.user.role);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      return db.select().from(budgetItems).where(eq(budgetItems.projectId, input.projectId));
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      description: z.string(),
      category: z.string().optional(),
      originalAmount: z.string(),
      type: z.enum(["original", "change_order", "credit", "allowance"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(budgetItems).values({
        ...input,
        currentAmount: input.originalAmount,
        createdBy: ctx.user.id,
      });
      return { id: Number((result as any).insertId) };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().optional(),
      currentAmount: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(budgetItems).set(data).where(eq(budgetItems.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(budgetItems).where(eq(budgetItems.id, input.id));
      return { success: true };
    }),

  getSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { total: 0, original: 0, variance: 0 };
      const items = await db.select().from(budgetItems).where(eq(budgetItems.projectId, input.projectId));
      const total = items.reduce((sum, i) => sum + parseFloat(i.currentAmount ?? "0"), 0);
      const original = items.filter(i => i.type === "original").reduce((sum, i) => sum + parseFloat(i.originalAmount ?? "0"), 0);
      return { total, original, variance: total - original };
    }),
});

// ─── Submittals Router ────────────────────────────────────────────────────────
const submittalsRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const hasAccess = await checkProjectAccess(ctx.user.id, input.projectId, ctx.user.role);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      return db.select().from(submittals).where(eq(submittals.projectId, input.projectId));
    }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    if (isInternal(ctx.user.role)) {
      return db.select().from(submittals).orderBy(desc(submittals.createdAt)).limit(100);
    }
    const teamRows = await db.select().from(projectTeam).where(eq(projectTeam.userId, ctx.user.id));
    const projectIds = teamRows.map(t => t.projectId);
    if (projectIds.length === 0) return [];
    return db.select().from(submittals).where(
      or(...projectIds.map(id => eq(submittals.projectId, id)))
    ).orderBy(desc(submittals.createdAt)).limit(100);
  }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      documentId: z.number().optional(),
      dueDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(submittals).values({
        ...input,
        submittedBy: ctx.user.id,
        status: "submitted",
      });
      const id = Number((result as any).insertId);
      await logActivity(ctx.user.id, "submittal_created", "submittal", id, input.title, input.projectId);
      return { id };
    }),

  review: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected", "needs_revision"]),
      comments: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(submittals).set({
        ...data,
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
      }).where(eq(submittals.id, id));
      const submittal = await db.select().from(submittals).where(eq(submittals.id, id)).limit(1);
      if (submittal[0]) {
        const teamRows = await db.select().from(projectTeam).where(eq(projectTeam.projectId, submittal[0].projectId));
        for (const member of teamRows) {
          await createNotification(
            member.userId,
            "submittal_decision",
            `Submittal ${data.status}: ${submittal[0].title}`,
            data.comments,
            submittal[0].projectId,
            `/projects/${submittal[0].projectId}`
          );
        }
      }
      return { success: true };
    }),
});

// ─── Messages Router ──────────────────────────────────────────────────────────
const messagesRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const hasAccess = await checkProjectAccess(ctx.user.id, input.projectId, ctx.user.role);
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });
      return db.select().from(messages).where(eq(messages.projectId, input.projectId)).orderBy(messages.createdAt);
    }),

  send: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      content: z.string().min(1),
      parentId: z.number().optional(),
      linkedDocumentId: z.number().optional(),
      linkedMilestoneId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(messages).values({ ...input, authorId: ctx.user.id });
      const id = Number((result as any).insertId);
      // Notify team
      const teamRows = await db.select().from(projectTeam).where(eq(projectTeam.projectId, input.projectId));
      for (const member of teamRows) {
        if (member.userId !== ctx.user.id) {
          await createNotification(member.userId, "new_message", "New project message", input.content.substring(0, 100), input.projectId, `/messages`);
        }
      }
      return { id };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const result = await db.select({ count: sql<number>`count(*)` }).from(messages)
      .where(and(eq(messages.isRead, false), sql`${messages.authorId} != ${ctx.user.id}`));
    return { count: Number(result[0]?.count ?? 0) };
  }),
});

// ─── Notifications Router ─────────────────────────────────────────────────────
const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const result = await db.select({ count: sql<number>`count(*)` }).from(notifications)
      .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));
    return { count: Number(result[0]?.count ?? 0) };
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(notifications).set({ isRead: true })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, ctx.user.id));
    return { success: true };
  }),
});

// ─── Team Router ──────────────────────────────────────────────────────────────
const teamRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(projectTeam).where(eq(projectTeam.projectId, input.projectId));
      const userIds = rows.map(r => r.userId);
      if (userIds.length === 0) return [];
      const userRows = await db.select().from(users).where(
        or(...userIds.map(id => eq(users.id, id)))
      );
      return rows.map(r => ({
        ...r,
        user: userRows.find(u => u.id === r.userId),
      }));
    }),

  addMember: protectedProcedure
    .input(z.object({ projectId: z.number(), userId: z.number(), role: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(projectTeam).values(input);
      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(projectTeam).where(eq(projectTeam.id, input.id));
      return { success: true };
    }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(users).where(eq(users.isActive, true));
  }),
});

// ─── Manufacturers Router ─────────────────────────────────────────────────────
const manufacturersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(manufacturers).where(eq(manufacturers.isActive, true));
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      website: z.string().optional(),
      repName: z.string().optional(),
      repEmail: z.string().optional(),
      repPhone: z.string().optional(),
      region: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(manufacturers).values({ ...input, createdBy: ctx.user.id });
      return { id: Number((result as any).insertId) };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      website: z.string().optional(),
      repName: z.string().optional(),
      repEmail: z.string().optional(),
      repPhone: z.string().optional(),
      region: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(manufacturers).set(data).where(eq(manufacturers.id, id));
      return { success: true };
    }),
});

// ─── Change Orders Router ─────────────────────────────────────────────────────
const changeOrdersRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(changeOrders).where(eq(changeOrders.projectId, input.projectId));
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      costImpact: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const count = await db.select({ count: sql<number>`count(*)` }).from(changeOrders).where(eq(changeOrders.projectId, input.projectId));
      const number = `CO-${String(Number(count[0]?.count ?? 0) + 1).padStart(3, "0")}`;
      const result = await db.insert(changeOrders).values({ ...input, number, requestedBy: ctx.user.id });
      return { id: Number((result as any).insertId) };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(changeOrders).set({ status: "approved", approvedBy: ctx.user.id, approvedAt: new Date() }).where(eq(changeOrders.id, input.id));
      return { success: true };
    }),
});

// ─── Activity Router ──────────────────────────────────────────────────────────
const activityRouter = router({
  recent: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(20);
  }),
});

// ─── Users/Admin Router ───────────────────────────────────────────────────────
const usersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(users).where(eq(users.isActive, true));
  }),

  updateRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["sls_admin", "sls_rep", "sls_pm", "client_architect", "client_gc", "user", "admin"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      await logActivity(ctx.user.id, "role_changed", "user", input.userId, `Role changed to ${input.role}`);
      return { success: true };
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set(input).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  deactivate: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(users).set({ isActive: false }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Remove from project team memberships first
      await db.delete(projectTeam).where(eq(projectTeam.userId, input.userId));
      // Hard delete the user record
      await db.delete(users).where(eq(users.id, input.userId));
      await logActivity(ctx.user.id, "user_deleted", "user", input.userId, `User #${input.userId} deleted`);
      return { success: true };
    }),
});

// ─── Onboarding Router ──────────────────────────────────────────────────────
const onboardingRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const result = await db.select({ onboardingCompleted: users.onboardingCompleted }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
    return { completed: result[0]?.onboardingCompleted ?? false };
  }),
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.update(users).set({ onboardingCompleted: true }).where(eq(users.id, ctx.user.id));
    return { success: true };
  }),
});

// ─── Ask The Grid Chatbot Router ─────────────────────────────────────────────
const gridChatRouter = router({
  ask: protectedProcedure
    .input(z.object({
      message: z.string().min(1).max(2000),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const systemPrompt = `You are "The GRID Assistant" — the built-in help chatbot for The GRID by SLS, a client portal built by Southern Lighting Source (SLS), an Atlanta-based commercial lighting manufacturers representative serving architects, GCs, and designers across Georgia, Tennessee, Alabama, and National Accounts.

Your job is to help users get the most out of The GRID portal. You are friendly, direct, and knowledgeable. You speak like a helpful colleague, not a robot. SLS tagline: "On Time. On Budget. Beautiful."

Current user: ${ctx.user.name ?? "User"} (Role: ${ctx.user.role})

## THE GRID PORTAL — COMPLETE FEATURE GUIDE

### Dashboard
The home screen. Shows key stats: Total Projects, Active Projects, On-Time %, On-Budget %. Also shows Recent Projects list, Alerts panel (unread notifications), and Quick Actions (New Project, Upload Document, View Submittals, AI Copilot).

### Projects
The core of the portal. Each project has:
- Overview tab: project name, client, address, phase (Design/Spec/Procurement/Installation/Closeout), status (Active/On Hold/Completed/Cancelled), budget, start/end dates, description
- Products tab: line items with manufacturer, model, quantity, unit cost, total cost, spec status (Specified/Approved/Substituted/Rejected), order status (Pending/Ordered/Shipped/Delivered/Installed)
- Documents tab: files uploaded to the project (specs, drawings, cut sheets, photos, contracts, other)
- Submittals tab: formal approval requests sent to clients for product approval
- Budget tab: budget items with categories, budgeted vs actual amounts, variance tracking
- Timeline tab: milestones with due dates, completion status, responsible party
- Messages tab: project-specific threaded notes and communications
- Team tab: people assigned to the project with their roles
- Change Orders tab: documented scope/cost changes

### Documents
Central document vault for all files across all projects. Users can upload PDFs, images, and other files. Documents are tagged by type: Specification, Submittal, Drawing, Photo, Contract, Cut Sheet, Other. Documents can be linked to specific projects.

### Submittals
Formal approval workflow. SLS creates a submittal package for a product or set of products. The client (Architect/Designer) reviews and either Approves, Rejects, or requests Revisions. Status flow: Draft → Submitted → Under Review → Approved / Rejected / Revision Required. Each submittal has a due date and revision number.

### Budget Overview
Cross-project budget dashboard. Shows all budget line items, budgeted vs actual amounts, variance, and categories. Helps SLS PMs and clients track spend across the full project lifecycle.

### Timeline Overview
Cross-project milestone dashboard. Shows all milestones across projects with due dates, status (Pending/In Progress/Completed/Delayed), and responsible parties. Helps identify what's coming up and what's overdue.

### Messages
Project-specific communication log. Internal notes and client-facing messages are kept in one place per project, replacing email chains. Messages are threaded and timestamped.

### Team Directory
All users in the portal. SLS Admins can see everyone. Shows name, role, company, email, phone. Admins can deactivate users.

### Manufacturers
SLS's line card — the list of lighting manufacturers SLS represents. Each entry has contact info, website, rep name, catalog URL, and region. Internal reference for the SLS team.

### Notifications
System alerts for important events: new submittals, approvals, rejections, milestone due dates, new messages, budget alerts. Users can mark notifications as read.

### AI Copilot
A dedicated AI assistant page for deeper project analysis, drafting emails, summarizing project status, or answering complex questions about the portal.

### Reports
Export and summary views for projects, budgets, and timelines. Useful for client presentations and internal reviews.

### Settings
User profile management: update name, email, phone, company, title.

### Admin Panel
(SLS Admin only) User management: view all users, change roles, deactivate accounts.

## USER ROLES
- SLS Admin: Full access to everything
- SLS Sales Rep: Access to assigned projects
- SLS Project Manager: Full project management including budgets and timelines
- Client Architect/Designer: View projects, approve/reject submittals, view documents
- Client GC (General Contractor): View timelines, deliveries, add field notes

## COMMON QUESTIONS & ANSWERS

Q: How do I create a new project?
A: Click "New Project" on the Dashboard or go to Projects and click the "+ New Project" button. Fill in the project name, client name, address, phase, and dates.

Q: How do I upload a document?
A: Go to Documents in the sidebar, or open a specific project and click the Documents tab. Click "Upload Document" and select your file.

Q: How does the submittal approval process work?
A: SLS creates a submittal in the Submittals section. It starts as Draft, then gets Submitted to the client. The client (Architect/Designer) reviews it and Approves, Rejects, or requests Revisions. SLS gets notified of the decision.

Q: How do I track my budget?
A: Open a project and go to the Budget tab to see line items for that project. For a cross-project view, use Budget Overview in the sidebar.

Q: How do I add someone to a project?
A: Open the project, go to the Team tab, and add a team member by selecting them from the user list.

Q: What does each project phase mean?
- Design: Early concept and specification phase
- Spec: Finalizing product specifications
- Procurement: Products ordered and in delivery
- Installation: Products being installed on site
- Closeout: Project wrapping up, final documentation

Q: How do I mark a milestone complete?
A: Open the project, go to the Timeline tab, find the milestone, and click the complete button.

Always answer based on the portal features described above. If a question is outside the portal scope, politely redirect. Keep answers concise and actionable.`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.history ?? []),
        { role: "user" as const, content: input.message },
      ];
      const response = await invokeLLM({ messages });
      const reply = response.choices[0]?.message?.content ?? "I'm here to help with The GRID. What would you like to know?";
      return { reply };
    }),
});

// ─── AI Copilot Router ────────────────────────────────────────────────────────
const copilotRouter = router({
  chat: protectedProcedure
    .input(z.object({ message: z.string(), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional() }))
    .mutation(async ({ ctx, input }) => {
      const systemPrompt = `You are the SLS Portal AI Copilot, an intelligent assistant for Southern Lighting Source — an Atlanta-based commercial lighting manufacturers representative. You help users navigate their lighting projects, understand project status, find documents, and answer questions about the portal.

User role: ${ctx.user.role}
User name: ${ctx.user.name}

You can help with:
- Finding projects and their status
- Understanding submittal workflows
- Budget and timeline questions
- Document management
- Team coordination
- SLS processes and best practices

Always be professional, concise, and helpful. Reinforce the SLS tagline: "On Time. On Budget. Beautiful."`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.history ?? []),
        { role: "user" as const, content: input.message },
      ];

      const response = await invokeLLM({ messages });
      return { reply: response.choices[0]?.message?.content ?? "I'm here to help with your SLS projects." };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  projects: projectsRouter,
  products: productsRouter,
  documents: documentsRouter,
  milestones: milestonesRouter,
  budget: budgetRouter,
  submittals: submittalsRouter,
  messages: messagesRouter,
  notifications: notificationsRouter,
  team: teamRouter,
  manufacturers: manufacturersRouter,
  changeOrders: changeOrdersRouter,
  activity: activityRouter,
  users: usersRouter,
  copilot: copilotRouter,
  onboarding: onboardingRouter,
  gridChat: gridChatRouter,
  seed: seedRouter,
  invites: invitesRouter,
  search: searchRouter,
  prospectRadar: prospectRadarRouter,
  pursuits: pursuitsRouter,
});

export type AppRouter = typeof appRouter;
