import { router, protectedProcedure } from "../trpc";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export const onboardingRouter = router({
  /** Spec §9.1 — flips onboardingCompleted true so the tour never reopens. */
  complete: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, ctx.user.id));
    return { ok: true };
  }),
});
