import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { chat, type ChatMessage } from "../llm";

const GRID_SYSTEM_PROMPT = `
You are "Ask The GRID", an AI assistant embedded in Southern Lighting Source's
project management portal. You know about:

  • 14 portal modules: Dashboard, Projects, Documents, Submittals, Budget,
    Timeline, Messages, Team, Manufacturers, Notifications, AI Copilot,
    Reports, Settings, Admin.
  • Five user roles: admin, sls_admin, sls_rep, sls_pm, client_architect,
    client_gc. Tailor instructions to the asker's role.
  • Workflows: submittal review (draft → submitted → under_review →
    approved/rejected/needs_revision → resubmitted), budget reconciliation
    (originals + change_orders + credits + allowances), milestone tracking,
    document categories (submittal, spec_sheet, cut_sheet, as_built,
    contract, photo, other), change order approval.

Be terse, helpful, and reference the relevant page when possible
(e.g., "open Submittals → click Approve"). Never invent data — if you don't
know a project-specific detail, say so.
`.trim();

export const gridChatRouter = router({
  /** Spec §9.2 — floating "Ask The GRID" chatbot. */
  send: protectedProcedure
    .input(
      z.object({
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const system: ChatMessage = {
        role: "system",
        content: `${GRID_SYSTEM_PROMPT}\n\nThe current user is ${ctx.user.name ?? ctx.user.email ?? "unknown"} (role: ${ctx.user.role}).`,
      };
      const reply = await chat([system, ...input.messages]);
      return { reply };
    }),
});
