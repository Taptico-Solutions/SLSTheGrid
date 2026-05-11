import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { products } from "../db/schema";
import { eq } from "drizzle-orm";

const ProductInput = z.object({
  projectId: z.number().int().positive(),
  manufacturerId: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  modelNumber: z.string().max(255).optional(),
  description: z.string().optional(),
  quantity: z.number().int().nonnegative().default(1),
  unitPrice: z.number().nonnegative().optional(),
  totalPrice: z.number().nonnegative().optional(),
  status: z
    .enum(["specified", "submitted", "approved", "ordered", "delivered", "installed"])
    .default("specified"),
  leadTime: z.string().max(128).optional(),
  notes: z.string().optional(),
});

export const productsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(products).where(eq(products.projectId, input.projectId)),
    ),

  create: protectedProcedure.input(ProductInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(products)
      .values({
        ...input,
        unitPrice: input.unitPrice?.toString(),
        totalPrice: input.totalPrice?.toString(),
        createdBy: ctx.user.id,
      })
      .returning();
    return row;
  }),

  update: protectedProcedure
    .input(ProductInput.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { id, unitPrice, totalPrice, ...rest } = input;
      const [row] = await ctx.db
        .update(products)
        .set({
          ...rest,
          ...(unitPrice !== undefined ? { unitPrice: unitPrice.toString() } : {}),
          ...(totalPrice !== undefined ? { totalPrice: totalPrice.toString() } : {}),
        })
        .where(eq(products.id, id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(products).where(eq(products.id, input.id));
      return { ok: true };
    }),
});
