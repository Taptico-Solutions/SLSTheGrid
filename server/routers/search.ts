import { TRPCError } from "@trpc/server";
import { and, eq, like, or } from "drizzle-orm";
import { z } from "zod/v4";
import { documents, projectTeam, projects, submittals } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const ADMIN_ROLES = ["sls_admin", "admin"] as const;
const PM_ROLES = ["sls_pm", "sls_admin", "admin"] as const;

function isAdminOrPm(role: string) {
  return (PM_ROLES as readonly string[]).includes(role);
}
function isAdmin(role: string) {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export const searchRouter = router({
  /**
   * Global search across projects, documents, and submittals.
   * Results are scoped to the user's accessible projects.
   * Returns up to 5 results per category (15 total max).
   */
  global: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200).trim(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { id: userId, role } = ctx.user;
      const q = `%${input.query}%`;

      // ── Determine which project IDs this user can access ──────────────────
      let accessibleProjectIds: number[] | null = null; // null = all projects

      if (!isAdminOrPm(role)) {
        // For reps: assigned projects + team membership
        // For clients: team membership only
        const teamRows = await db
          .select({ projectId: projectTeam.projectId })
          .from(projectTeam)
          .where(eq(projectTeam.userId, userId));

        const teamProjectIds = teamRows.map((r) => r.projectId);

        if (role === "sls_rep") {
          const repProjects = await db
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.assignedRepId, userId));
          const repIds = repProjects.map((p) => p.id);
          accessibleProjectIds = Array.from(new Set([...teamProjectIds, ...repIds]));
        } else {
          accessibleProjectIds = teamProjectIds;
        }

        // If user has no project access at all, return empty results
        if (accessibleProjectIds.length === 0) {
          return { projects: [], documents: [], submittals: [] };
        }
      }

      // ── Projects search ───────────────────────────────────────────────────
      const projectQuery = db
        .select({
          id: projects.id,
          name: projects.name,
          status: projects.status,
          city: projects.city,
          state: projects.state,
          buildingType: projects.buildingType,
        })
        .from(projects)
        .where(
          and(
            or(
              like(projects.name, q),
              like(projects.city, q),
              like(projects.buildingType, q),
              like(projects.description, q)
            ),
            // Scope to accessible projects for non-admins
            accessibleProjectIds !== null
              ? or(...accessibleProjectIds.map((id) => eq(projects.id, id)))
              : undefined
          )
        )
        .limit(5);

      // ── Documents search ──────────────────────────────────────────────────
      const docQuery = db
        .select({
          id: documents.id,
          name: documents.name,
          type: documents.type,
          status: documents.status,
          projectId: documents.projectId,
          projectName: projects.name,
        })
        .from(documents)
        .leftJoin(projects, eq(documents.projectId, projects.id))
        .where(
          and(
            or(like(documents.name, q), like(documents.description, q)),
            accessibleProjectIds !== null
              ? or(...accessibleProjectIds.map((id) => eq(documents.projectId, id)))
              : undefined
          )
        )
        .limit(5);

      // ── Submittals search ─────────────────────────────────────────────────
      const submittalQuery = db
        .select({
          id: submittals.id,
          title: submittals.title,
          status: submittals.status,
          projectId: submittals.projectId,
          projectName: projects.name,
        })
        .from(submittals)
        .leftJoin(projects, eq(submittals.projectId, projects.id))
        .where(
          and(
            or(like(submittals.title, q), like(submittals.description, q)),
            accessibleProjectIds !== null
              ? or(...accessibleProjectIds.map((id) => eq(submittals.projectId, id)))
              : undefined
          )
        )
        .limit(5);

      // Run all three queries in parallel
      const [projectResults, docResults, submittalResults] = await Promise.all([
        projectQuery,
        docQuery,
        submittalQuery,
      ]);

      return {
        projects: projectResults,
        documents: docResults,
        submittals: submittalResults,
      };
    }),
});
