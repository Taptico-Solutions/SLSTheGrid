import { router, adminProcedure } from "../trpc";
import { like, sql } from "drizzle-orm";
import {
  projects,
  manufacturers,
  products,
  milestones,
  budgetItems,
  changeOrders,
  submittals,
  messages,
  notifications,
  users,
} from "../db/schema";

/**
 * Spec §10 — demo seed system.
 * The "Ponce City Market — Food Hall Renovation" dataset.
 *
 * Tagging convention: every record name begins with "[DEMO]" so `clear` can
 * remove only demo records via a LIKE query — never touching real data.
 */

export const seedRouter = router({
  status: adminProcedure.query(async ({ ctx }) => {
    const [{ count: p } = { count: 0 }] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(like(projects.name, "[DEMO]%"));
    return { demoProjects: Number(p ?? 0) };
  }),

  /** Idempotent: clear then re-insert. */
  load: adminProcedure.mutation(async ({ ctx }) => {
    // TODO: implement full seed dataset per spec §10.
    // Inserts 1 project / 3 manufacturers / 8 products / 8 milestones /
    // 10 budget items / 2 change orders / 3 submittals / 6 messages /
    // 5 notifications / 5 demo client users.
    return { ok: true, note: "Seed implementation pending — see spec §10." };
  }),

  clear: adminProcedure.mutation(async ({ ctx }) => {
    // Order matters because of FKs.
    await ctx.db.delete(notifications).where(like(notifications.title, "[DEMO]%"));
    await ctx.db.delete(messages).where(like(messages.content, "[DEMO]%"));
    await ctx.db.delete(submittals).where(like(submittals.title, "[DEMO]%"));
    await ctx.db.delete(changeOrders).where(like(changeOrders.title, "[DEMO]%"));
    await ctx.db.delete(budgetItems).where(like(budgetItems.description, "[DEMO]%"));
    await ctx.db.delete(milestones).where(like(milestones.title, "[DEMO]%"));
    await ctx.db.delete(products).where(like(products.name, "[DEMO]%"));
    await ctx.db.delete(manufacturers).where(like(manufacturers.name, "[DEMO]%"));
    await ctx.db.delete(projects).where(like(projects.name, "[DEMO]%"));
    await ctx.db.delete(users).where(like(users.openId, "demo-%"));
    return { ok: true };
  }),
});
