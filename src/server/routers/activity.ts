import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { activityLog } from "../db/schema";
import { desc, eq } from "drizzle-orm";

export const activityRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          projectId: z.number().int().positive().optional(),
          limit: z.number().int().positive().max(200).default(50),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      if (input?.projectId) {
        return ctx.db
          .select()
          .from(activityLog)
          .where(eq(activityLog.projectId, input.projectId))
          .orderBy(desc(activityLog.createdAt))
          .limit(limit);
      }
      return ctx.db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(limit);
    }),
});
