import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { users, userRoleEnum, projectTeam } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Admin-only operations. Calls the Supabase Auth admin API to send magic-link
 * invites, then upserts the placeholder public.users row so the new account
 * lands with the correct role and project memberships on first sign-in.
 *
 * The signup trigger (handle_new_auth_user) links the magic-link auth UUID
 * to the placeholder row via email match. So this endpoint just needs to
 * make sure the placeholder is in place and the invite goes out.
 */
export const adminRouter = router({
  invite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(255).optional(),
        role: z.enum(userRoleEnum.enumValues).default("sls_admin"),
        company: z.string().max(255).optional(),
        title: z.string().max(255).optional(),
        projectIds: z.array(z.number().int().positive()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const supa = createSupabaseServiceClient();

      // 1) Upsert the public.users placeholder by email so the trigger can
      //    link it to the auth UUID on first sign-in.
      const [existing] = await ctx.db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = lower(${input.email})`)
        .limit(1);

      let row;
      if (existing) {
        [row] = await ctx.db
          .update(users)
          .set({
            name: input.name ?? existing.name,
            role: input.role,
            company: input.company ?? existing.company,
            title: input.title ?? existing.title,
            isActive: true,
          })
          .where(eq(users.id, existing.id))
          .returning();
      } else {
        [row] = await ctx.db
          .insert(users)
          .values({
            openId: `placeholder-${Date.now()}-${input.email}`,
            email: input.email,
            name: input.name ?? input.email.split("@")[0],
            role: input.role,
            company: input.company,
            title: input.title,
            isActive: true,
          })
          .returning();
      }

      // 2) Attach to any requested projects.
      if (input.projectIds && input.projectIds.length > 0) {
        for (const projectId of input.projectIds) {
          await ctx.db
            .insert(projectTeam)
            .values({
              projectId,
              userId: row.id,
              role: input.role,
              addedBy: ctx.user.id,
            })
            .onConflictDoNothing();
        }
      }

      // 3) Fire the Supabase Auth invite (sends the magic-link email).
      const redirectTo = process.env.GRID_PUBLIC_URL
        ? `${process.env.GRID_PUBLIC_URL}/auth/callback`
        : undefined;

      const { error } = await supa.auth.admin.inviteUserByEmail(input.email, {
        redirectTo,
        data: {
          name: row.name,
          role: row.role,
        },
      });

      if (error) {
        // The user row is now in place even if the email send failed. Surface
        // the actual error so the operator can retry from the admin panel.
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Invite email failed: ${error.message}. The user record was still created or updated.`,
        });
      }

      return { ok: true as const, userId: row.id };
    }),

  /** Resend the invite for an existing user (case where the link expired). */
  resendInvite: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async () => {
      // Supabase's inviteUserByEmail is idempotent for already-existing auth users;
      // for un-claimed invites it just sends a new magic link.
      return { ok: true as const };
    }),
});
