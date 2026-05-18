import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import {
  toolRequests,
  toolRequestStatusEnum,
  INTERNAL_ROLES,
} from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";

const BUCKET = "tool-requests";

const statusEnum = z.enum(toolRequestStatusEnum.enumValues);

export const toolRequestsRouter = router({
  /** List requests. Internals see all. Other users see only their own. */
  list: protectedProcedure.query(async ({ ctx }) => {
    if ((INTERNAL_ROLES as readonly string[]).includes(ctx.user.role)) {
      return ctx.db
        .select()
        .from(toolRequests)
        .orderBy(desc(toolRequests.createdAt));
    }
    return ctx.db
      .select()
      .from(toolRequests)
      .where(eq(toolRequests.requesterId, ctx.user.id))
      .orderBy(desc(toolRequests.createdAt));
  }),

  /** Create a new request. The user is always set from the session. */
  create: protectedProcedure
    .input(
      z.object({
        requesterName: z.string().min(1).max(255),
        toolType: z.string().min(1).max(255),
        description: z.string().min(1),
        documentation: z
          .object({
            name: z.string().min(1).max(255),
            fileData: z.string(), // base64
            fileType: z.string().max(128),
            fileSize: z.number().int().nonnegative(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Insert first to get the row id, then upload the doc keyed by that id.
      const [row] = await ctx.db
        .insert(toolRequests)
        .values({
          requesterId: ctx.user.id,
          requesterName: input.requesterName,
          toolType: input.toolType,
          description: input.description,
        })
        .returning();

      if (input.documentation) {
        const key = `requests/${row.id}/${nanoid()}-${input.documentation.name}`;
        const buffer = Buffer.from(input.documentation.fileData, "base64");
        const supa = createSupabaseServiceClient();
        const { error } = await supa.storage
          .from(BUCKET)
          .upload(key, buffer, {
            contentType: input.documentation.fileType,
            upsert: false,
          });
        if (error) {
          // Roll back the request so the row matches storage state.
          await ctx.db.delete(toolRequests).where(eq(toolRequests.id, row.id));
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Upload failed: ${error.message}`,
          });
        }
        const [updated] = await ctx.db
          .update(toolRequests)
          .set({
            documentationFileKey: key,
            documentationFileType: input.documentation.fileType,
            documentationFileSize: input.documentation.fileSize,
            updatedAt: new Date(),
          })
          .where(eq(toolRequests.id, row.id))
          .returning();
        return updated;
      }

      return row;
    }),

  /** Short-lived signed URL for downloading a request's attached doc. */
  getSignedUrl: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(toolRequests)
        .where(eq(toolRequests.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (!row.documentationFileKey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No attachment." });
      }
      // Owner or internal can download.
      const isInternal = (INTERNAL_ROLES as readonly string[]).includes(ctx.user.role);
      if (!isInternal && row.requesterId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const supa = createSupabaseServiceClient();
      const { data, error } = await supa.storage
        .from(BUCKET)
        .createSignedUrl(row.documentationFileKey, 60 * 60);
      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Signed URL failed.",
        });
      }
      return { url: data.signedUrl, expiresInSeconds: 3600 };
    }),

  /** Admin-only update of status and admin notes. */
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: statusEnum.optional(),
        adminNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const [row] = await ctx.db
        .update(toolRequests)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(toolRequests.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
});
