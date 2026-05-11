import { router, publicProcedure } from "../trpc";

export const authRouter = router({
  /** Returns current user row or null. Spec §6. */
  me: publicProcedure.query(({ ctx }) => ctx.user),

  /**
   * Logout is performed by calling supabase.auth.signOut() on the client.
   * This procedure is kept for parity with the spec and audit hooks later.
   */
  logout: publicProcedure.mutation(() => ({ ok: true })),
});
