import { TRPCError } from "@trpc/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { inviteTokens, projects, projectTeam, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const SLS_ROLES = [
  "sls_admin",
  "sls_rep",
  "sls_pm",
  "client_architect",
  "client_gc",
  "user",
] as const;

type SlsRole = (typeof SLS_ROLES)[number];

function isAdmin(role: string) {
  return role === "sls_admin" || role === "admin";
}

export const invitesRouter = router({
  // ── Create invite (admin only) ─────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        role: z.enum(SLS_ROLES),
        label: z.string().max(255).optional(),
        inviteCode: z.string().min(4).max(128),
        expiresInDays: z.number().int().min(1).max(365).optional().default(30),
        origin: z.string().url(),
        projectId: z.number().int().positive().optional(),
        projectRole: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAdmin(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Validate the project exists if provided
      if (input.projectId) {
        const proj = await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.id, input.projectId))
          .limit(1);
        if (proj.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
        }
      }

      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      await db.insert(inviteTokens).values({
        token,
        inviteCode: input.inviteCode,
        role: input.role as SlsRole,
        label: input.label ?? null,
        createdBy: ctx.user.id,
        expiresAt,
        isRevoked: false,
        projectId: input.projectId ?? null,
        projectRole: input.projectRole ?? null,
      });

      const inviteUrl = `${input.origin}/invite/${token}`;
      return { token, inviteUrl, expiresAt };
    }),

  // ── List invites (admin only) ──────────────────────────────────────────────
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!isAdmin(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const rows = await db
      .select({
        id: inviteTokens.id,
        token: inviteTokens.token,
        role: inviteTokens.role,
        label: inviteTokens.label,
        isRevoked: inviteTokens.isRevoked,
        expiresAt: inviteTokens.expiresAt,
        usedAt: inviteTokens.usedAt,
        createdAt: inviteTokens.createdAt,
        usedByName: users.name,
        usedByEmail: users.email,
        projectId: inviteTokens.projectId,
        projectRole: inviteTokens.projectRole,
        projectName: projects.name,
      })
      .from(inviteTokens)
      .leftJoin(users, eq(inviteTokens.usedBy, users.id))
      .leftJoin(projects, eq(inviteTokens.projectId, projects.id))
      .orderBy(inviteTokens.createdAt);

    return rows;
  }),

  // ── Revoke invite (admin only) ─────────────────────────────────────────────
  revoke: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdmin(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(inviteTokens)
        .set({ isRevoked: true })
        .where(eq(inviteTokens.id, input.id));

      return { success: true };
    }),

  // ── Validate token (used on the accept page to show invite details) ─────────
  validate: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const now = new Date();
      const rows = await db
        .select({
          id: inviteTokens.id,
          role: inviteTokens.role,
          label: inviteTokens.label,
          projectId: inviteTokens.projectId,
          projectRole: inviteTokens.projectRole,
          projectName: projects.name,
        })
        .from(inviteTokens)
        .leftJoin(projects, eq(inviteTokens.projectId, projects.id))
        .where(
          and(
            eq(inviteTokens.token, input.token),
            eq(inviteTokens.isRevoked, false),
            isNull(inviteTokens.usedAt),
            or(isNull(inviteTokens.expiresAt), gt(inviteTokens.expiresAt, now))
          )
        )
        .limit(1);

      if (rows.length === 0) {
        return { valid: false, role: null, label: null, projectId: null, projectName: null, projectRole: null };
      }
      const row = rows[0];
      return {
        valid: true,
        role: row.role,
        label: row.label,
        projectId: row.projectId ?? null,
        projectName: row.projectName ?? null,
        projectRole: row.projectRole ?? null,
      };
    }),

  // ── Redeem invite (verifies code, promotes user, auto-assigns to project) ──
  redeem: protectedProcedure
    .input(z.object({ token: z.string(), inviteCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const now = new Date();
      const rows = await db
        .select()
        .from(inviteTokens)
        .where(
          and(
            eq(inviteTokens.token, input.token),
            eq(inviteTokens.isRevoked, false),
            isNull(inviteTokens.usedAt),
            or(isNull(inviteTokens.expiresAt), gt(inviteTokens.expiresAt, now))
          )
        )
        .limit(1);

      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite link is invalid or expired." });
      }

      const invite = rows[0];

      if (invite.inviteCode !== input.inviteCode) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect invite code." });
      }

      // Mark invite as used
      await db
        .update(inviteTokens)
        .set({ usedBy: ctx.user.id, usedAt: now })
        .where(eq(inviteTokens.id, invite.id));

      // Promote user to the invited role
      await db
        .update(users)
        .set({ role: invite.role as any })
        .where(eq(users.id, ctx.user.id));

      // Auto-assign to project if specified
      let projectAssigned = false;
      if (invite.projectId) {
        // Check if already a member to avoid duplicates
        const existing = await db
          .select({ id: projectTeam.id })
          .from(projectTeam)
          .where(
            and(
              eq(projectTeam.projectId, invite.projectId),
              eq(projectTeam.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(projectTeam).values({
            projectId: invite.projectId,
            userId: ctx.user.id,
            role: invite.projectRole ?? invite.role,
          });
          projectAssigned = true;
        } else {
          projectAssigned = true; // already a member — still counts as assigned
        }
      }

      return {
        success: true,
        role: invite.role,
        projectId: invite.projectId ?? null,
        projectAssigned,
      };
    }),

  // ── List projects (for the invite form dropdown) ───────────────────────────
  listProjects: protectedProcedure.query(async ({ ctx }) => {
    if (!isAdmin(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const rows = await db
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .orderBy(projects.name);

    return rows;
  }),
});
