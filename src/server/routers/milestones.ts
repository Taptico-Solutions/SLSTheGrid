import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { milestones } from "../db/schema";
import { eq } from "drizzle-orm";

const MilestoneInput = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  status: z
    .enum(["pending", "in_progress", "completed", "delayed", "cancelled"])
    .default("pending"),
  assignedTo: z.number().int().positive().optional(),
});

export const milestonesRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive().optional() }).optional())
    .query(({ ctx, input }) => {
      if (input?.projectId) {
        return ctx.db.select().from(milestones).where(eq(milestones.projectId, input.projectId));
      }
      return ctx.db.select().from(milestones);
    }),

  create: protectedProcedure.input(MilestoneInput).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(milestones)
      .values({ ...input, createdBy: ctx.user.id })
      .returning();
    return row;
  }),

  update: protectedProcedure
    .input(MilestoneInput.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db.update(milestones).set(rest).where(eq(milestones.id, id)).returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(milestones).where(eq(milestones.id, input.id));
      return { ok: true };
    }),
});
