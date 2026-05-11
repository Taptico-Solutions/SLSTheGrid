import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { changeOrders } from "../db/schema";
import { eq } from "drizzle-orm";

const ChangeOrderInput = z.object({
  projectId: z.number().int().positive(),
  number: z.string().max(64).optional(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z
    .enum(["draft", "pending_approval", "approved", "rejected"])
    .default("draft"),
  costImpact: z.number().optional(),
});

export const changeOrdersRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(changeOrders).where(eq(changeOrders.projectId, input.projectId)),
    ),

  create: protectedProcedure.input(ChangeOrderInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(changeOrders)
      .values({
        ...input,
        costImpact: input.costImpact?.toString(),
        requestedBy: ctx.user.id,
      })
      .returning();
    return row;
  }),

  update: protectedProcedure
    .input(ChangeOrderInput.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { id, costImpact, ...rest } = input;
      const [row] = await ctx.db
        .update(changeOrders)
        .set({
          ...rest,
          ...(costImpact !== undefined ? { costImpact: costImpact.toString() } : {}),
        })
        .where(eq(changeOrders.id, id))
        .returning();
      return row;
    }),
});
