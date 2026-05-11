import { generateText, type CoreMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type Provider = "anthropic" | "openai" | "openrouter";

/**
 * Model-agnostic chat completion.
 *
 * Configured via env so the operator can swap providers / models without code:
 *
 *   LLM_PROVIDER=anthropic|openai|openrouter
 *   LLM_MODEL=<provider-specific model id>
 *   ANTHROPIC_API_KEY=...
 *   OPENAI_API_KEY=...
 *   OPENROUTER_API_KEY=...   # uses OpenAI-compatible endpoint
 */
function getModel() {
  const provider = (process.env.LLM_PROVIDER ?? "anthropic") as Provider;
  const modelId = process.env.LLM_MODEL;

  switch (provider) {
    case "anthropic":
      return anthropic(modelId ?? "claude-sonnet-4-6");
    case "openai":
      return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(
        modelId ?? "gpt-4o",
      );
    case "openrouter":
      return createOpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      })(modelId ?? "anthropic/claude-sonnet-4-6");
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown LLM_PROVIDER: ${_exhaustive}`);
    }
  }
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const { text } = await generateText({
    model: getModel(),
    messages: messages as CoreMessage[],
  });
  return text;
}
