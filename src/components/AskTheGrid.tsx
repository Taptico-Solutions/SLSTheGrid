"use client";

import { useState } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

type Msg = { role: "user" | "assistant"; content: string };

/** Spec §9.2 — floating bottom-left chatbot. */
export function AskTheGrid() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const send = trpc.gridChat.send.useMutation();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    try {
      const { reply } = await send.mutateAsync({ messages: next });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry — I couldn't reach the AI service." },
      ]);
    }
  };

  return (
    <>
      <button
        aria-label="Ask The GRID"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-sls-dark-brown text-sls-gold shadow-lg",
          "ring-2 ring-sls-gold/50 transition hover:scale-105",
        )}
      >
        <Sparkles size={20} />
      </button>

      {open && (
        <div className="fixed bottom-24 left-6 z-50 flex h-[480px] w-[380px] flex-col rounded-md border border-sls-sand bg-white shadow-xl">
          <div className="flex items-center justify-between rounded-t-md bg-sls-dark-brown px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sls-gold" />
              <span className="font-slab text-sm uppercase tracking-wide">Ask The GRID</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.length === 0 && (
              <div className="rounded-md bg-sls-gold-pale/40 p-3 text-sls-dark-brown">
                Hi — ask me anything about a project, submittal, or budget.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-md p-2",
                  m.role === "user"
                    ? "ml-8 bg-sls-dark-brown text-white"
                    : "mr-8 bg-sls-off-white text-sls-dark-brown",
                )}
              >
                {m.content}
              </div>
            ))}
          </div>
          <form onSubmit={onSubmit} className="flex gap-2 border-t border-sls-sand p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a question…"
              className="flex-1 rounded-md border border-sls-sand px-3 py-2 text-sm focus:border-sls-gold focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center justify-center rounded-md bg-sls-gold px-3 text-white"
              aria-label="Send"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
