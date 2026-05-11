import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { messages } from "../db/schema";
import { eq } from "drizzle-orm";

export const messagesRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(({ ctx, input }) =>
      ctx.db.select().from(messages).where(eq(messages.projectId, input.projectId)),
    ),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        content: z.string().min(1),
        parentId: z.number().int().positive().optional(),
        linkedDocumentId: z.number().int().positive().optional(),
        linkedMilestoneId: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(messages)
        .values({ ...input, authorId: ctx.user.id })
        .returning();
      return row;
    }),
});
