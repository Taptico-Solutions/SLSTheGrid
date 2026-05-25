import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader, GoldButton, LoadingSpinner } from "@/components/SLSComponents";
import { Bot, Send, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Summarize all active projects and their status",
  "Which projects are at risk of going over budget?",
  "What submittals are pending approval?",
  "List all projects with delayed milestones",
  "What are the top manufacturers in our portfolio?",
];

export default function Copilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const askCopilot = trpc.copilot.chat.useMutation({
    onSuccess: (data: { reply: any }) => {
      const text = typeof data.reply === "string" ? data.reply : JSON.stringify(data.reply);
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
      setLoading(false);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "assistant", content: "I encountered an error. Please try again." }]);
      setLoading(false);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function sendMessage(text?: string) {
    const msg = text ?? input.trim();
    if (!msg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    askCopilot.mutate({ message: msg, history: messages });
  }

  return (
    <div className="page-enter flex flex-col" style={{ height: "calc(100vh - 0px)" }}>
      <PageHeader title="AI Copilot" subtitle="Ask questions about your projects, budgets, timelines, and more" />
      <div className="flex-1 flex flex-col min-h-0 p-6">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "#f5e9cc" }}>
                <Sparkles size={28} style={{ color: "#d29c3c" }} />
              </div>
              <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "18px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
                SLS AI Copilot
              </h3>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7a6e62", textAlign: "center", maxWidth: "400px", marginBottom: "24px" }}>
                Ask me anything about your projects, budgets, timelines, submittals, or team. I have full context of your portal data.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="px-3 py-2 rounded-md text-xs transition-colors hover:bg-[#f5e9cc]"
                    style={{ border: "1px solid #e8e3d8", fontFamily: "Inter, sans-serif", color: "#262b2e", background: "#fafaf8" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === "assistant" ? "bg-[#f5e9cc]" : "bg-[#1b110b]"}`}>
                  {m.role === "assistant" ? <Bot size={16} style={{ color: "#d29c3c" }} /> : <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: 600 }}>U</span>}
                </div>
                <div className={`max-w-[80%] px-4 py-3 rounded-lg ${m.role === "user" ? "bg-[#1b110b] text-white" : "bg-white border"}`} style={{ borderColor: m.role === "user" ? "transparent" : "#e8e3d8" }}>
                  {m.role === "assistant" ? (
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#1b110b" }}>
                      <Streamdown>{m.content}</Streamdown>
                    </div>
                  ) : (
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#ffffff" }}>{m.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#f5e9cc" }}>
                <Bot size={16} style={{ color: "#d29c3c" }} />
              </div>
              <div className="px-4 py-3 rounded-lg bg-white border" style={{ borderColor: "#e8e3d8" }}>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#d29c3c", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 pt-4 border-t" style={{ borderColor: "#e8e3d8" }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about projects, budgets, timelines..."
            className="flex-1 px-4 py-2.5 rounded-md text-sm"
            style={{ border: "1px solid #e8e3d8", fontFamily: "Inter, sans-serif", outline: "none" }}
          />
          <GoldButton variant="filled" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            <Send size={14} />
          </GoldButton>
        </div>
      </div>
    </div>
  );
}
