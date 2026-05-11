import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { projectTeam } from "../db/schema";
import { and, eq } from "drizzle-orm";

export const teamRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(projectTeam).where(eq(projectTeam.projectId, input.projectId)),
    ),

  add: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        userId: z.number().int().positive(),
        role: z.string().max(128).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(projectTeam)
        .values({ ...input, addedBy: ctx.user.id })
        .returning();
      return row;
    }),

  remove: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        userId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(projectTeam)
        .where(
          and(eq(projectTeam.projectId, input.projectId), eq(projectTeam.userId, input.userId)),
        );
      return { ok: true };
    }),
});
