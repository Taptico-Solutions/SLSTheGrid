import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { messages, users, projectTeam, INTERNAL_ROLES } from "../db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

async function visibleProjectIdsForMessages(ctx: {
  db: typeof import("../db").db;
  user: { id: number; role: string };
}) {
  if ((INTERNAL_ROLES as readonly string[]).includes(ctx.user.role)) {
    return null;
  }
  const rows = await ctx.db
    .select({ id: projectTeam.projectId })
    .from(projectTeam)
    .where(eq(projectTeam.userId, ctx.user.id));
  return rows.map((r) => r.id);
}

export const messagesRouter = router({
  /**
   * List messages for a project, with author name/email/avatar joined in.
   * Sorted oldest-first so the UI can append the latest at the bottom.
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const ids = await visibleProjectIdsForMessages(ctx);
      if (ids !== null && !ids.includes(input.projectId)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.db
        .select({
          id: messages.id,
          projectId: messages.projectId,
          parentId: messages.parentId,
          content: messages.content,
          linkedDocumentId: messages.linkedDocumentId,
          linkedMilestoneId: messages.linkedMilestoneId,
          isRead: messages.isRead,
          createdAt: messages.createdAt,
          authorId: messages.authorId,
          authorName: users.name,
          authorEmail: users.email,
          authorAvatarUrl: users.avatarUrl,
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.authorId))
        .where(eq(messages.projectId, input.projectId))
        .orderBy(asc(messages.createdAt));
    }),

  /** List the most recent messages across every project the user can see. */
  recent: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().max(50).default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 5;
      const ids = await visibleProjectIdsForMessages(ctx);

      const base = ctx.db
        .select({
          id: messages.id,
          projectId: messages.projectId,
          content: messages.content,
          createdAt: messages.createdAt,
          authorName: users.name,
        })
        .from(messages)
        .leftJoin(users, eq(users.id, messages.authorId));

      if (ids === null) {
        return base.orderBy(asc(messages.createdAt)).limit(limit);
      }
      if (ids.length === 0) return [];
      return base
        .where(inArray(messages.projectId, ids))
        .orderBy(asc(messages.createdAt))
        .limit(limit);
    }),

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
      const ids = await visibleProjectIdsForMessages(ctx);
      if (ids !== null && !ids.includes(input.projectId)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [row] = await ctx.db
        .insert(messages)
        .values({ ...input, authorId: ctx.user.id })
        .returning();
      return row;
    }),
});
