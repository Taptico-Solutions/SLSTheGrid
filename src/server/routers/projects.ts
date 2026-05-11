import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { projects, projectTeam, ADMIN_ROLES, PM_ROLES } from "../db/schema";
import { eq, or, inArray, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const ProjectInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  clientCompany: z.string().max(255).optional(),
  clientContact: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  startDate: z.date().optional(),
  targetCompletionDate: z.date().optional(),
  originalBudget: z.number().nonnegative().optional(),
  assignedRepId: z.number().int().positive().optional(),
  assignedPmId: z.number().int().positive().optional(),
});

/**
 * Spec §5.3 — project access:
 *  - admin / sls_admin / sls_pm → all projects
 *  - sls_rep → only assigned
 *  - everyone else → only via project_team membership
 */
async function visibleProjectIds(ctx: { db: typeof import("../db").db; user: { id: number; role: string } }) {
  if (ADMIN_ROLES.includes(ctx.user.role as any) || PM_ROLES.includes(ctx.user.role as any)) {
    return null; // null sentinel = all
  }
  if (ctx.user.role === "sls_rep") {
    const rows = await ctx.db.select({ id: projects.id }).from(projects).where(eq(projects.assignedRepId, ctx.user.id));
    return rows.map((r) => r.id);
  }
  const rows = await ctx.db
    .select({ id: projectTeam.projectId })
    .from(projectTeam)
    .where(eq(projectTeam.userId, ctx.user.id));
  return rows.map((r) => r.id);
}

export const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const ids = await visibleProjectIds(ctx);
    if (ids === null) return ctx.db.select().from(projects);
    if (ids.length === 0) return [];
    return ctx.db.select().from(projects).where(inArray(projects.id, ids));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const ids = await visibleProjectIds(ctx);
      if (ids !== null && !ids.includes(input.id)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [row] = await ctx.db.select().from(projects).where(eq(projects.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  create: protectedProcedure.input(ProjectInput).mutation(async ({ ctx, input }) => {
    if (!["admin", "sls_admin", "sls_rep"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const [row] = await ctx.db
      .insert(projects)
      .values({
        ...input,
        originalBudget: input.originalBudget?.toString(),
        currentBudget: input.originalBudget?.toString(),
        createdBy: ctx.user.id,
      })
      .returning();
    return row;
  }),

  update: protectedProcedure
    .input(ProjectInput.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: role + assignment check.
      const { id, originalBudget, ...rest } = input;
      const [row] = await ctx.db
        .update(projects)
        .set({
          ...rest,
          ...(originalBudget !== undefined
            ? { originalBudget: originalBudget.toString() }
            : {}),
        })
        .where(eq(projects.id, id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ADMIN_ROLES.includes(ctx.user.role as any)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.delete(projects).where(eq(projects.id, input.id));
      return { ok: true };
    }),

  /** Counts used by the Dashboard stat cards. */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const ids = await visibleProjectIds(ctx);
    const all =
      ids === null
        ? await ctx.db.select().from(projects)
        : ids.length === 0
          ? []
          : await ctx.db.select().from(projects).where(inArray(projects.id, ids));
    return {
      active: all.filter((p) => p.status === "active").length,
      onHold: all.filter((p) => p.status === "on_hold").length,
      completed: all.filter((p) => p.status === "completed").length,
      total: all.length,
    };
  }),
});
