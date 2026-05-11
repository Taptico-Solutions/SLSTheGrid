import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { documents } from "../db/schema";
import { eq } from "drizzle-orm";
import { uploadDocument } from "../storage";
import { nanoid } from "nanoid";

export const documentsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive().optional() }).optional())
    .query(({ ctx, input }) => {
      if (input?.projectId) {
        return ctx.db.select().from(documents).where(eq(documents.projectId, input.projectId));
      }
      return ctx.db.select().from(documents);
    }),

  /**
   * Spec §6.2 — base64 upload. Server decodes, writes to Supabase Storage,
   * then inserts the metadata row. Replaces the Manus S3 path.
   */
  upload: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        name: z.string().min(1).max(255),
        fileData: z.string(), // base64
        fileType: z.string().max(128),
        fileSize: z.number().int().nonnegative(),
        category: z
          .enum(["submittal", "spec_sheet", "cut_sheet", "as_built", "contract", "photo", "other"])
          .default("other"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const key = `projects/${input.projectId}/docs/${nanoid()}-${input.name}`;
      const buffer = Buffer.from(input.fileData, "base64");
      const { url } = await uploadDocument(key, buffer, input.fileType);
      const [row] = await ctx.db
        .insert(documents)
        .values({
          projectId: input.projectId,
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
      // TODO: also remove the underlying Storage object.
      await ctx.db.delete(documents).where(eq(documents.id, input.id));
      return { ok: true };
    }),
});
