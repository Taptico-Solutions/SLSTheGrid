import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  priorities,
  priorityTasks,
  priorityStatusEnum,
  ADMIN_ROLES,
} from "../db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const statusEnum = z.enum(priorityStatusEnum.enumValues);

const TaskInput = z.object({
  label: z.string().min(1).max(500),
  isDone: z.boolean().default(false),
  taskOrder: z.number().int().nonnegative().default(0),
});

const PriorityCreateInput = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  priorityOrder: z.number().int().nonnegative().default(0),
  status: statusEnum.default("on_track"),
  targetDate: z.string().optional(), // ISO date string yyyy-mm-dd
  ownerUserId: z.number().int().positive().optional(),
  tasks: z.array(TaskInput).max(50).optional(),
});

const PriorityPatchInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  priorityOrder: z.number().int().nonnegative().optional(),
  status: statusEnum.optional(),
  targetDate: z.string().nullable().optional(),
  ownerUserId: z.number().int().positive().nullable().optional(),
});

function requireAdmin(ctx: { user: { role: string } }) {
  if (!(ADMIN_ROLES as readonly string[]).includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
  }
}

export const prioritiesRouter = router({
  /**
   * List every priority for a project plus its tasks. Server-side ordering:
   * priority_order ASC, then target_date ASC NULLS LAST.
   */
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(priorities)
        .where(eq(priorities.projectId, input.projectId))
        .orderBy(asc(priorities.priorityOrder), asc(priorities.targetDate));

      if (rows.length === 0) return [];

      const taskRows = await ctx.db
        .select()
        .from(priorityTasks)
        .where(
          inArray(
            priorityTasks.priorityId,
            rows.map((r) => r.id),
          ),
        )
        .orderBy(asc(priorityTasks.taskOrder), asc(priorityTasks.createdAt));

      const tasksByPriority = new Map<string, typeof taskRows>();
      for (const t of taskRows) {
        const bucket = tasksByPriority.get(t.priorityId) ?? [];
        bucket.push(t);
        tasksByPriority.set(t.priorityId, bucket);
      }

      return rows.map((p) => ({
        ...p,
        tasks: tasksByPriority.get(p.id) ?? [],
      }));
    }),

  create: protectedProcedure
    .input(PriorityCreateInput)
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const [row] = await ctx.db
        .insert(priorities)
        .values({
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          priorityOrder: input.priorityOrder,
          status: input.status,
          targetDate: input.targetDate ?? null,
          ownerUserId: input.ownerUserId,
        })
        .returning();

      if (input.tasks && input.tasks.length > 0) {
        await ctx.db.insert(priorityTasks).values(
          input.tasks.map((t, idx) => ({
            priorityId: row.id,
            label: t.label,
            isDone: t.isDone,
            taskOrder: t.taskOrder !== undefined ? t.taskOrder : idx,
          })),
        );
      }

      return row;
    }),

  update: protectedProcedure
    .input(PriorityPatchInput)
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const { id, ...patch } = input;
      const [row] = await ctx.db
        .update(priorities)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(priorities.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      await ctx.db.delete(priorities).where(eq(priorities.id, input.id));
      return { ok: true };
    }),

  /** Add a single task to an existing priority. Admin only. */
  addTask: protectedProcedure
    .input(
      z.object({
        priorityId: z.string().uuid(),
        label: z.string().min(1).max(500),
        taskOrder: z.number().int().nonnegative().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const [row] = await ctx.db
        .insert(priorityTasks)
        .values({
          priorityId: input.priorityId,
          label: input.label,
          taskOrder: input.taskOrder ?? 0,
        })
        .returning();
      return row;
    }),

  deleteTask: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      await ctx.db.delete(priorityTasks).where(eq(priorityTasks.id, input.id));
      return { ok: true };
    }),

  /**
   * Toggle a task's done state. Any user with project access can do this so
   * SLS users can check off their own work.
   */
  toggleTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        isDone: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(priorityTasks)
        .set({
          isDone: input.isDone,
          completedAt: input.isDone ? new Date() : null,
        })
        .where(eq(priorityTasks.id, input.taskId))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  /** Persist a new ordering for a project's priorities. Admin only. */
  reorderPriorities: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        orderedIds: z.array(z.string().uuid()).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      await Promise.all(
        input.orderedIds.map((id, idx) =>
          ctx.db
            .update(priorities)
            .set({ priorityOrder: idx, updatedAt: new Date() })
            .where(
              and(eq(priorities.id, id), eq(priorities.projectId, input.projectId)),
            ),
        ),
      );
      return { ok: true };
    }),
});
