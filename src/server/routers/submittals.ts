import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { submittals, notifications } from "../db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const SubmittalInput = z.object({
  projectId: z.number().int().positive(),
  documentId: z.number().int().positive().optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z
    .enum([
      "draft",
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "needs_revision",
      "resubmitted",
    ])
    .default("draft"),
  comments: z.string().optional(),
  dueDate: z.date().optional(),
});

export const submittalsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive().optional() }).optional())
    .query(({ ctx, input }) => {
      if (input?.projectId) {
        return ctx.db.select().from(submittals).where(eq(submittals.projectId, input.projectId));
      }
      return ctx.db.select().from(submittals);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(submittals).where(eq(submittals.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  create: protectedProcedure.input(SubmittalInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(submittals)
      .values({ ...input, submittedBy: ctx.user.id })
      .returning();
    return row;
  }),

  /**
   * Spec §6.2 — only client_architect / sls_admin / admin can move past review.
   * On status change, notify the original submitter.
   */
  update: protectedProcedure
    .input(
      SubmittalInput.partial().extend({
        id: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [existing] = await ctx.db.select().from(submittals).where(eq(submittals.id, id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const isDecision =
        rest.status &&
        ["approved", "rejected", "needs_revision"].includes(rest.status) &&
        rest.status !== existing.status;
      if (isDecision && !["admin", "sls_admin", "client_architect"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [row] = await ctx.db
        .update(submittals)
        .set({
          ...rest,
          ...(isDecision ? { reviewedBy: ctx.user.id, reviewedAt: new Date() } : {}),
        })
        .where(eq(submittals.id, id))
        .returning();

      if (isDecision) {
        await ctx.db.insert(notifications).values({
          userId: existing.submittedBy,
          projectId: existing.projectId,
          type: "submittal_decision",
          title: `Submittal ${rest.status}: ${existing.title}`,
          body: rest.comments ?? null,
          actionUrl: `/projects/${existing.projectId}?tab=submittals`,
        });
      }

      return row;
    }),
});
