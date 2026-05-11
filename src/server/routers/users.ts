import { z } from "zod";
import { router, adminProcedure, protectedProcedure } from "../trpc";
import { users, userRoleEnum } from "../db/schema";
import { eq } from "drizzle-orm";

export const usersRouter = router({
  list: adminProcedure.query(({ ctx }) => ctx.db.select().from(users)),

  updateRole: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        role: z.enum(userRoleEnum.enumValues),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.id))
        .returning();
      return row;
    }),

  /** Self-service profile update (spec §8.15). */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().max(255).optional(),
        company: z.string().max(255).optional(),
        title: z.string().max(255).optional(),
        phone: z.string().max(64).optional(),
        avatarUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(users)
        .set(input)
        .where(eq(users.id, ctx.user.id))
        .returning();
      return row;
    }),
});
