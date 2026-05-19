import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  documents,
  documentCategoryEnum,
  projectTeam,
  INTERNAL_ROLES,
} from "../db/schema";
import { and, eq, inArray, isNull, or, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { uploadDocument, signedDocumentUrl } from "../storage";
import { nanoid } from "nanoid";

const categoryEnum = z.enum(documentCategoryEnum.enumValues);

async function visibleProjectIdsForDocs(ctx: {
  db: typeof import("../db").db;
  user: { id: number; role: string };
}) {
  if ((INTERNAL_ROLES as readonly string[]).includes(ctx.user.role)) {
    return null;
  }
  const rows = await ctx.db
    .select({ id: projectTeam.projectId })
    .from(projectTeam)
    .where(eq(projectTeam.userId, ctx.user.id));
  return rows.map((r) => r.id);
}

export const documentsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const ids = await visibleProjectIdsForDocs(ctx);

      if (input?.projectId) {
        if (ids !== null && !ids.includes(input.projectId)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return ctx.db
          .select()
          .from(documents)
          .where(eq(documents.projectId, input.projectId))
          .orderBy(desc(documents.createdAt));
      }

      // Internal roles see everything, including unattached vault docs.
      if (ids === null) {
        return ctx.db.select().from(documents).orderBy(desc(documents.createdAt));
      }
      // External users see docs in their projects plus their own unattached uploads.
      const scopedFilter = ids.length > 0
        ? or(
            inArray(documents.projectId, ids),
            and(isNull(documents.projectId), eq(documents.uploadedBy, ctx.user.id)),
          )
        : and(isNull(documents.projectId), eq(documents.uploadedBy, ctx.user.id));
      return ctx.db
        .select()
        .from(documents)
        .where(scopedFilter)
        .orderBy(desc(documents.createdAt));
    }),

  /** Short-lived signed URL for downloading the document binary. */
  getSignedUrl: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const ids = await visibleProjectIdsForDocs(ctx);
      const canSee =
        ids === null
          ? true
          : row.projectId === null
            ? row.uploadedBy === ctx.user.id
            : ids.includes(row.projectId);
      if (!canSee) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const url = await signedDocumentUrl(row.fileKey);
      return { url, expiresInSeconds: 3600 };
    }),

  /**
   * Spec §6.2 — base64 upload. Server decodes, writes to Supabase Storage,
   * then inserts the metadata row.
   *
   * Path convention: <project_id>/<category>/<nanoid>-<original-name>.
   * Supabase storage RLS policies key off the leading <project_id>.
   */
  upload: protectedProcedure
    .input(
      z.object({
        // Unset projectId stores the file in the shared vault (no project link).
        projectId: z.number().int().positive().nullable().optional(),
        name: z.string().min(1).max(255),
        fileData: z.string(),
        fileType: z.string().max(128),
        fileSize: z.number().int().nonnegative(),
        category: categoryEnum.default("other"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const projectId = input.projectId ?? null;

      if (projectId !== null) {
        const ids = await visibleProjectIdsForDocs(ctx);
        if (ids !== null && !ids.includes(projectId)) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      const pathPrefix = projectId !== null ? String(projectId) : "_vault";
      const key = `${pathPrefix}/${input.category}/${nanoid()}-${input.name}`;
      const buffer = Buffer.from(input.fileData, "base64");
      const { url } = await uploadDocument(key, buffer, input.fileType);
      const [row] = await ctx.db
        .insert(documents)
        .values({
          projectId,
          name: input.name,
          fileKey: key,
          fileUrl: url,
          fileType: input.fileType,
          fileSize: input.fileSize,
          category: input.category,
          uploadedBy: ctx.user.id,
        })
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(documents)
        .where(eq(documents.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      if (
        !(INTERNAL_ROLES as readonly string[]).includes(ctx.user.role) &&
        row.uploadedBy !== ctx.user.id
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.delete(documents).where(eq(documents.id, input.id));
      return { ok: true };
    }),
});
