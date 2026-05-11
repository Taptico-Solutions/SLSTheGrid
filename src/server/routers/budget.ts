import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { budgetItems } from "../db/schema";
import { eq, sum } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const BudgetItemInput = z.object({
  projectId: z.number().int().positive(),
  productId: z.number().int().positive().optional(),
  description: z.string().min(1).max(255),
  category: z.string().max(128).optional(),
  originalAmount: z.number().nonnegative(),
  currentAmount: z.number().nonnegative(),
  type: z.enum(["original", "change_order", "credit", "allowance"]).default("original"),
  changeOrderId: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const budgetRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(budgetItems).where(eq(budgetItems.projectId, input.projectId)),
    ),

  create: protectedProcedure.input(BudgetItemInput).mutation(async ({ ctx, input }) => {
    if (!["admin", "sls_admin", "sls_pm"].includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const [row] = await ctx.db
      .insert(budgetItems)
      .values({
        ...input,
        originalAmount: input.originalAmount.toString(),
        currentAmount: input.currentAmount.toString(),
        createdBy: ctx.user.id,
      })
      .returning();
    return row;
  }),

  update: protectedProcedure
    .input(BudgetItemInput.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { id, originalAmount, currentAmount, ...rest } = input;
      const [row] = await ctx.db
        .update(budgetItems)
        .set({
          ...rest,
          ...(originalAmount !== undefined
            ? { originalAmount: originalAmount.toString() }
            : {}),
          ...(currentAmount !== undefined
            ? { currentAmount: currentAmount.toString() }
            : {}),
        })
        .where(eq(budgetItems.id, id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(budgetItems).where(eq(budgetItems.id, input.id));
      return { ok: true };
    }),

  getSummary: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [agg] = await ctx.db
        .select({
          originalTotal: sum(budgetItems.originalAmount),
          currentTotal: sum(budgetItems.currentAmount),
        })
        .from(budgetItems)
        .where(eq(budgetItems.projectId, input.projectId));
      return {
        originalTotal: Number(agg?.originalTotal ?? 0),
        currentTotal: Number(agg?.currentTotal ?? 0),
      };
    }),
});
