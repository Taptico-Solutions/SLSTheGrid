import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import {
  tapticoKpis,
  tapticoMeetings,
  tapticoMilestones,
  tapticoTodos,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

// Only taptico role can access this module
function requireTaptico(role: string) {
  if (role !== "taptico") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Taptico internal access only." });
  }
}

// ── To-Dos ────────────────────────────────────────────────────────────────────
const todoInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional().default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  dueDate: z.string().max(10).optional(),
  assignedTo: z.number().int().positive().optional(),
  tags: z.string().max(512).optional(),
});

// ── Meetings ──────────────────────────────────────────────────────────────────
const meetingInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  meetingDate: z.string().min(1),
  durationMinutes: z.number().int().min(5).max(480).optional().default(60),
  attendees: z.string().optional(),
  agenda: z.string().optional(),
  notes: z.string().optional(),
  actionItems: z.string().optional(),
  meetingType: z.enum(["internal", "client", "vendor", "planning", "review", "other"]).optional().default("internal"),
});

// ── Milestones ────────────────────────────────────────────────────────────────
const milestoneInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.string().max(10).optional(),
  completedDate: z.string().max(10).optional(),
  status: z.enum(["upcoming", "in_progress", "completed", "delayed", "cancelled"]).optional().default("upcoming"),
  category: z.enum(["product", "business", "technical", "marketing", "partnership", "other"]).optional().default("product"),
  owner: z.string().max(255).optional(),
  progress: z.number().int().min(0).max(100).optional().default(0),
});

// ── KPIs ──────────────────────────────────────────────────────────────────────
const kpiInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(["revenue", "growth", "product", "operations", "client", "team", "other"]).optional().default("other"),
  targetValue: z.string().optional(),
  currentValue: z.string().optional(),
  unit: z.string().max(64).optional(),
  period: z.enum(["weekly", "monthly", "quarterly", "annual", "custom"]).optional().default("monthly"),
  periodLabel: z.string().max(64).optional(),
  trend: z.enum(["up", "down", "flat"]).optional().default("flat"),
  status: z.enum(["on_track", "at_risk", "off_track", "achieved"]).optional().default("on_track"),
  notes: z.string().optional(),
});

export const tapticoRouter = router({
  // ── To-Dos ──────────────────────────────────────────────────────────────────
  listTodos: protectedProcedure.query(async ({ ctx }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db
      .select({
        id: tapticoTodos.id,
        title: tapticoTodos.title,
        description: tapticoTodos.description,
        status: tapticoTodos.status,
        priority: tapticoTodos.priority,
        dueDate: tapticoTodos.dueDate,
        assignedTo: tapticoTodos.assignedTo,
        tags: tapticoTodos.tags,
        createdBy: tapticoTodos.createdBy,
        createdAt: tapticoTodos.createdAt,
        updatedAt: tapticoTodos.updatedAt,
        assigneeName: users.name,
      })
      .from(tapticoTodos)
      .leftJoin(users, eq(tapticoTodos.assignedTo, users.id))
      .orderBy(desc(tapticoTodos.updatedAt));
    return rows;
  }),

  createTodo: protectedProcedure.input(todoInput).mutation(async ({ ctx, input }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const result = await db.insert(tapticoTodos).values({
      ...input,
      dueDate: input.dueDate ?? null,
      assignedTo: input.assignedTo ?? null,
      tags: input.tags ?? null,
      createdBy: ctx.user.id,
    });
    return { id: Number((result as any).insertId ?? 0), success: true };
  }),

  updateTodo: protectedProcedure
    .input(z.object({ id: z.number().int() }).merge(todoInput.partial()))
    .mutation(async ({ ctx, input }) => {
      requireTaptico(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(tapticoTodos).set({ ...data, updatedAt: new Date() } as any).where(eq(tapticoTodos.id, id));
      return { success: true };
    }),

  deleteTodo: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(tapticoTodos).where(eq(tapticoTodos.id, input.id));
    return { success: true };
  }),

  // ── Meetings ────────────────────────────────────────────────────────────────
  listMeetings: protectedProcedure.query(async ({ ctx }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(tapticoMeetings).orderBy(desc(tapticoMeetings.meetingDate));
  }),

  createMeeting: protectedProcedure.input(meetingInput).mutation(async ({ ctx, input }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const result = await db.insert(tapticoMeetings).values({
      ...input,
      meetingDate: new Date(input.meetingDate),
      createdBy: ctx.user.id,
    });
    return { id: Number((result as any).insertId ?? 0), success: true };
  }),

  updateMeeting: protectedProcedure
    .input(z.object({ id: z.number().int() }).merge(meetingInput.partial()))
    .mutation(async ({ ctx, input }) => {
      requireTaptico(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, meetingDate, ...data } = input;
      await db.update(tapticoMeetings).set({
        ...data,
        ...(meetingDate ? { meetingDate: new Date(meetingDate) } : {}),
        updatedAt: new Date(),
      } as any).where(eq(tapticoMeetings.id, id));
      return { success: true };
    }),

  deleteMeeting: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(tapticoMeetings).where(eq(tapticoMeetings.id, input.id));
    return { success: true };
  }),

  // ── Milestones ──────────────────────────────────────────────────────────────
  listMilestones: protectedProcedure.query(async ({ ctx }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(tapticoMilestones).orderBy(tapticoMilestones.dueDate);
  }),

  createMilestone: protectedProcedure.input(milestoneInput).mutation(async ({ ctx, input }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const result = await db.insert(tapticoMilestones).values({
      ...input,
      dueDate: input.dueDate ?? null,
      completedDate: input.completedDate ?? null,
      owner: input.owner ?? null,
      createdBy: ctx.user.id,
    });
    return { id: Number((result as any).insertId ?? 0), success: true };
  }),

  updateMilestone: protectedProcedure
    .input(z.object({ id: z.number().int() }).merge(milestoneInput.partial()))
    .mutation(async ({ ctx, input }) => {
      requireTaptico(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(tapticoMilestones).set({ ...data, updatedAt: new Date() } as any).where(eq(tapticoMilestones.id, id));
      return { success: true };
    }),

  deleteMilestone: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(tapticoMilestones).where(eq(tapticoMilestones.id, input.id));
    return { success: true };
  }),

  // ── KPIs ────────────────────────────────────────────────────────────────────
  listKpis: protectedProcedure.query(async ({ ctx }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(tapticoKpis).orderBy(desc(tapticoKpis.updatedAt));
  }),

  createKpi: protectedProcedure.input(kpiInput).mutation(async ({ ctx, input }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const result = await db.insert(tapticoKpis).values({
      ...input,
      targetValue: input.targetValue ?? null,
      currentValue: input.currentValue ?? null,
      unit: input.unit ?? null,
      periodLabel: input.periodLabel ?? null,
      notes: input.notes ?? null,
      createdBy: ctx.user.id,
    });
    return { id: Number((result as any).insertId ?? 0), success: true };
  }),

  updateKpi: protectedProcedure
    .input(z.object({ id: z.number().int() }).merge(kpiInput.partial()))
    .mutation(async ({ ctx, input }) => {
      requireTaptico(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(tapticoKpis).set({ ...data, updatedAt: new Date() } as any).where(eq(tapticoKpis.id, id));
      return { success: true };
    }),

  deleteKpi: protectedProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ ctx, input }) => {
    requireTaptico(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(tapticoKpis).where(eq(tapticoKpis.id, input.id));
    return { success: true };
  }),
});
