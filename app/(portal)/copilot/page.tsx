"use client";

import { useState } from "react";
import { PageHeader } from "@/components/SLSComponents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

/** Spec §8.13 — full-page AI Copilot. */
export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const send = trpc.copilot.chat.useMutation();

  const ask = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    try {
      const { reply } = await send.mutateAsync({ messages: next });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "AI service unavailable. Check LLM env vars." },
      ]);
    }
  };

  const suggestions = [
    "Summarize my overdue milestones",
    "Which submittals are awaiting client approval?",
    "Draft a change order rationale for budget overrun",
  ];

  return (
    <>
      <PageHeader title="AI Copilot" subtitle="Project-aware assistant for SLS workflows." />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card>
          <div className="mb-3 text-xs uppercase tracking-widest text-sls-dark-brown/50">
            Suggested
          </div>
          <CardContent className="space-y-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="block w-full rounded-md border border-sls-sand p-2 text-left text-sm hover:border-sls-gold"
              >
                {s}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex h-[600px] flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto pr-2">
            {messages.length === 0 && (
              <div className="text-sm text-sls-dark-brown/60">
                Start a conversation — your role and current project are sent as context.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[80%] rounded-md p-3 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-sls-dark-brown text-white"
                    : "bg-sls-off-white text-sls-dark-brown",
                )}
              >
                {m.content}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="mt-4 flex gap-2 border-t border-sls-sand pt-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 rounded-md border border-sls-sand px-3 py-2 text-sm focus:border-sls-gold focus:outline-none"
            />
            <Button disabled={send.isPending}>Send</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
