import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { manufacturers } from "../db/schema";
import { eq } from "drizzle-orm";

const ManufacturerInput = z.object({
  name: z.string().min(1).max(255),
  website: z.string().url().max(255).optional(),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email().max(320).optional(),
  contactPhone: z.string().max(64).optional(),
  notes: z.string().optional(),
});

export const manufacturersRouter = router({
  list: protectedProcedure.query(({ ctx }) => ctx.db.select().from(manufacturers)),

  create: protectedProcedure.input(ManufacturerInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(manufacturers)
      .values({ ...input, createdBy: ctx.user.id })
      .returning();
    return row;
  }),

  update: protectedProcedure
    .input(ManufacturerInput.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(manufacturers)
        .set(rest)
        .where(eq(manufacturers.id, id))
        .returning();
      return row;
    }),
});
