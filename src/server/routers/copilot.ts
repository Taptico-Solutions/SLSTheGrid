import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { chat, type ChatMessage } from "../llm";

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  projectId: z.number().int().positive().optional(),
});

export const copilotRouter = router({
  /** Spec §8.13 — full-page AI assistant with project-aware system prompt. */
  chat: protectedProcedure.input(ChatInput).mutation(async ({ ctx, input }) => {
    const system: ChatMessage = {
      role: "system",
      content: [
        `You are The GRID Copilot, an AI assistant inside Southern Lighting Source's project portal.`,
        `The user is "${ctx.user.name ?? "(unnamed)"}" with role "${ctx.user.role}".`,
        input.projectId
          ? `They are currently viewing project #${input.projectId}.`
          : "",
        `Answer concisely and reference the relevant workflow (submittals, budget, milestones, change orders) when applicable.`,
      ]
        .filter(Boolean)
        .join(" "),
    };
    const reply = await chat([system, ...input.messages]);
    return { reply };
  }),
});
