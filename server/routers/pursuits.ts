import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  pursuitActivities,
  pursuits,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const INTERNAL_ROLES = ["sls_admin", "sls_rep", "sls_pm", "admin"] as const;

function isInternal(role: string) {
  return (INTERNAL_ROLES as readonly string[]).includes(role);
}

const pursuitInput = z.object({
  companyName: z.string().min(1).max(255),
  projectName: z.string().min(1).max(255),
  projectType: z.string().max(128).optional(),
  marketSector: z.string().max(128).optional(),
  address: z.string().optional(),
  city: z.string().max(128).optional(),
  state: z.string().max(64).optional(),
  stage: z.enum(["identified", "qualifying", "proposal", "negotiation", "won", "lost", "on_hold"]).optional().default("identified"),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
  source: z.enum(["referral", "cold_outreach", "inbound", "trade_show", "existing_client", "architect_spec", "gc_relationship", "permit_data", "other"]).optional(),
  estimatedValue: z.string().optional(),
  estimatedLightingValue: z.string().optional(),
  primaryContactName: z.string().max(255).optional(),
  primaryContactTitle: z.string().max(255).optional(),
  primaryContactEmail: z.string().max(320).optional(),
  primaryContactPhone: z.string().max(64).optional(),
  ownerName: z.string().max(255).optional(),
  architectName: z.string().max(255).optional(),
  generalContractorName: z.string().max(255).optional(),
  expectedCloseDate: z.string().max(10).optional(),
  lastContactDate: z.string().max(10).optional(),
  nextFollowUpDate: z.string().max(10).optional(),
  notes: z.string().optional(),
  nextStep: z.string().optional(),
  winProbability: z.number().int().min(0).max(100).optional(),
  assignedRepId: z.number().int().positive().optional(),
});

export const pursuitsRouter = router({
  // ── List all pursuits ─────────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      stage: z.string().optional(),
      priority: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!isInternal(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Internal access only." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let query = db
        .select({
          id: pursuits.id,
          companyName: pursuits.companyName,
          projectName: pursuits.projectName,
          projectType: pursuits.projectType,
          marketSector: pursuits.marketSector,
          city: pursuits.city,
          state: pursuits.state,
          stage: pursuits.stage,
          priority: pursuits.priority,
          source: pursuits.source,
          estimatedValue: pursuits.estimatedValue,
          estimatedLightingValue: pursuits.estimatedLightingValue,
          primaryContactName: pursuits.primaryContactName,
          primaryContactEmail: pursuits.primaryContactEmail,
          primaryContactPhone: pursuits.primaryContactPhone,
          expectedCloseDate: pursuits.expectedCloseDate,
          nextFollowUpDate: pursuits.nextFollowUpDate,
          winProbability: pursuits.winProbability,
          assignedRepId: pursuits.assignedRepId,
          linkedProjectId: pursuits.linkedProjectId,
          createdAt: pursuits.createdAt,
          updatedAt: pursuits.updatedAt,
          repName: users.name,
        })
        .from(pursuits)
        .leftJoin(users, eq(pursuits.assignedRepId, users.id))
        .orderBy(desc(pursuits.updatedAt));

      const rows = await query;

      // Apply filters in JS for simplicity (small dataset)
      let filtered = rows;
      if (input?.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(r =>
          r.companyName.toLowerCase().includes(s) ||
          r.projectName.toLowerCase().includes(s) ||
          (r.city ?? "").toLowerCase().includes(s) ||
          (r.primaryContactName ?? "").toLowerCase().includes(s)
        );
      }
      if (input?.stage) {
        filtered = filtered.filter(r => r.stage === input.stage);
      }
      if (input?.priority) {
        filtered = filtered.filter(r => r.priority === input.priority);
      }

      return filtered;
    }),

  // ── Get single pursuit with activities ───────────────────────────────────
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      if (!isInternal(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select()
        .from(pursuits)
        .where(eq(pursuits.id, input.id))
        .limit(1);

      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      const activities = await db
        .select({
          id: pursuitActivities.id,
          type: pursuitActivities.type,
          title: pursuitActivities.title,
          body: pursuitActivities.body,
          createdAt: pursuitActivities.createdAt,
          userName: users.name,
        })
        .from(pursuitActivities)
        .leftJoin(users, eq(pursuitActivities.userId, users.id))
        .where(eq(pursuitActivities.pursuitId, input.id))
        .orderBy(desc(pursuitActivities.createdAt));

      return { ...rows[0], activities };
    }),

  // ── Create pursuit ────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(pursuitInput)
    .mutation(async ({ ctx, input }) => {
      if (!isInternal(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const result = await db.insert(pursuits).values({
        ...input,
        estimatedValue: input.estimatedValue ?? null,
        estimatedLightingValue: input.estimatedLightingValue ?? null,
        createdBy: ctx.user.id,
      });

      const id = Number((result as any).insertId ?? (result as any)[0]?.insertId ?? 0);

      // Log activity
      await db.insert(pursuitActivities).values({
        pursuitId: id,
        userId: ctx.user.id,
        type: "note",
        title: "Pursuit created",
        body: `${input.companyName} — ${input.projectName} added to pipeline.`,
      });

      return { id, success: true };
    }),

  // ── Update pursuit ────────────────────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({ id: z.number().int() }).merge(pursuitInput.partial()))
    .mutation(async ({ ctx, input }) => {
      if (!isInternal(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, ...data } = input;
      await db.update(pursuits).set({ ...data, updatedAt: new Date() } as any).where(eq(pursuits.id, id));
      return { success: true };
    }),

  // ── Delete pursuit ────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (!isInternal(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(pursuitActivities).where(eq(pursuitActivities.pursuitId, input.id));
      await db.delete(pursuits).where(eq(pursuits.id, input.id));
      return { success: true };
    }),

  // ── Add activity log entry ────────────────────────────────────────────────
  addActivity: protectedProcedure
    .input(z.object({
      pursuitId: z.number().int(),
      type: z.enum(["note", "call", "email", "meeting", "follow_up"]),
      title: z.string().min(1).max(255),
      body: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isInternal(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(pursuitActivities).values({
        pursuitId: input.pursuitId,
        userId: ctx.user.id,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
      });
      return { success: true };
    }),

  // ── Bulk import from CSV rows ─────────────────────────────────────────────
  bulkImport: protectedProcedure
    .input(z.object({
      rows: z.array(z.object({
        companyName: z.string().min(1),
        projectName: z.string().min(1),
        projectType: z.string().optional(),
        marketSector: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        stage: z.string().optional(),
        priority: z.string().optional(),
        source: z.string().optional(),
        estimatedValue: z.string().optional(),
        primaryContactName: z.string().optional(),
        primaryContactEmail: z.string().optional(),
        primaryContactPhone: z.string().optional(),
        ownerName: z.string().optional(),
        architectName: z.string().optional(),
        generalContractorName: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isInternal(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const batchId = `import_${Date.now()}`;
      const VALID_STAGES = ["identified", "qualifying", "proposal", "negotiation", "won", "lost", "on_hold"];
      const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
      const VALID_SOURCES = ["referral", "cold_outreach", "inbound", "trade_show", "existing_client", "architect_spec", "gc_relationship", "permit_data", "other"];

      let imported = 0;
      for (const row of input.rows) {
        await db.insert(pursuits).values({
          companyName: row.companyName,
          projectName: row.projectName,
          projectType: row.projectType ?? null,
          marketSector: row.marketSector ?? null,
          city: row.city ?? null,
          state: row.state ?? null,
          stage: (VALID_STAGES.includes(row.stage ?? "") ? row.stage : "identified") as any,
          priority: (VALID_PRIORITIES.includes(row.priority ?? "") ? row.priority : "medium") as any,
          source: (VALID_SOURCES.includes(row.source ?? "") ? row.source : "other") as any,
          estimatedValue: row.estimatedValue ?? null,
          primaryContactName: row.primaryContactName ?? null,
          primaryContactEmail: row.primaryContactEmail ?? null,
          primaryContactPhone: row.primaryContactPhone ?? null,
          ownerName: row.ownerName ?? null,
          architectName: row.architectName ?? null,
          generalContractorName: row.generalContractorName ?? null,
          notes: row.notes ?? null,
          importBatchId: batchId,
          createdBy: ctx.user.id,
        });
        imported++;
      }

      return { imported, batchId };
    }),

  // ── Stats summary ─────────────────────────────────────────────────────────
  stats: protectedProcedure.query(async ({ ctx }) => {
    if (!isInternal(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const db = await getDb();
    if (!db) return { total: 0, byStage: {}, totalValue: 0 };

    const rows = await db
      .select({ stage: pursuits.stage, estimatedValue: pursuits.estimatedValue })
      .from(pursuits);

    const byStage: Record<string, number> = {};
    let totalValue = 0;
    for (const r of rows) {
      byStage[r.stage] = (byStage[r.stage] ?? 0) + 1;
      if (r.estimatedValue) totalValue += parseFloat(r.estimatedValue);
    }

    return { total: rows.length, byStage, totalValue };
  }),
});
