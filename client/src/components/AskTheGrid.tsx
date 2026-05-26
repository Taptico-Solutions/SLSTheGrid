import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Sparkles, RotateCcw } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const SUGGESTED_QUESTIONS = [
  "How do I create a new project?",
  "How does submittal approval work?",
  "How do I upload a document?",
  "What do the project phases mean?",
  "How do I track my budget?",
];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AskTheGrid() {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const askMutation = trpc.gridChat.ask.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    if (open && !hasGreeted) {
      setHasGreeted(true);
      const firstName = user?.name ? user.name.split(" ")[0] : null;
      const greeting: Message = {
        id: "greeting",
        role: "assistant",
        content: `Hey${firstName ? ` ${firstName}` : ""}! I'm The GRID Assistant — I know this portal inside and out. Ask me anything: how to create a project, how submittals work, what a budget variance means, or anything else. What can I help you with?`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, [open, hasGreeted, user]);

  const handleSend = async (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "greeting")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const result = await askMutation.mutateAsync({ message: messageText, history });

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: typeof result.reply === "string" ? result.reply : "I'm here to help with The GRID.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "assistant", content: "Sorry, I ran into a hiccup. Try again in a moment.", timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setHasGreeted(false);
    setInput("");
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-4 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: "360px", height: "520px", background: "#ffffff", border: "1px solid #e6dec2" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: "#1b110b", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: "rgba(210,156,60,0.2)" }}>
                  <Sparkles size={14} style={{ color: "#d29c3c" }} />
                </div>
                <div>
                  <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "13px", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ask The GRID</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#7a6e62", marginTop: "1px" }}>Your portal assistant</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: "#7a6e62" }} title="Clear conversation">
                  <RotateCcw size={13} />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: "#7a6e62" }} title="Close">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "#f9f9f9" }}>
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(210,156,60,0.12)" }}>
                    <Sparkles size={22} style={{ color: "#d29c3c" }} />
                  </div>
                  <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Ask The GRID</div>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62", marginTop: "6px", lineHeight: 1.5 }}>I know this portal inside and out. Ask me anything.</p>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mr-2 mt-0.5" style={{ background: "rgba(210,156,60,0.15)" }}>
                      <Sparkles size={11} style={{ color: "#d29c3c" }} />
                    </div>
                  )}
                  <div className="max-w-[80%]">
                    <div
                      className="px-3 py-2.5 rounded-xl"
                      style={{
                        fontFamily: "Inter, sans-serif", fontSize: "13px", lineHeight: 1.55,
                        background: msg.role === "user" ? "#1b110b" : "#ffffff",
                        color: msg.role === "user" ? "#ffffff" : "#2a2018",
                        border: msg.role === "assistant" ? "1px solid #e6dec2" : "none",
                        borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.content}
                    </div>
                    <div className={`mt-1 ${msg.role === "user" ? "text-right" : "text-left"}`} style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a09080" }}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center mr-2 mt-0.5" style={{ background: "rgba(210,156,60,0.15)" }}>
                    <Sparkles size={11} style={{ color: "#d29c3c" }} />
                  </div>
                  <div className="px-3 py-2.5 rounded-xl flex items-center gap-1.5" style={{ background: "#ffffff", border: "1px solid #e6dec2", borderRadius: "4px 16px 16px 16px" }}>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#d29c3c" }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested questions */}
            {messages.length === 1 && messages[0]?.id === "greeting" && (
              <div className="px-4 py-2 flex-shrink-0" style={{ background: "#f9f9f9", borderTop: "1px solid #e6dec2" }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a09080", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>Try asking</div>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="text-left px-3 py-1.5 rounded-lg text-xs transition-all duration-150"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#5a4e42", background: "#ffffff", border: "1px solid #e6dec2" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fdf8ef"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ffffff"; }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex items-end gap-2 px-3 py-3 flex-shrink-0" style={{ background: "#ffffff", borderTop: "1px solid #e6dec2" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about The GRID..."
                rows={1}
                className="flex-1 resize-none rounded-xl px-3 py-2.5 outline-none transition-all"
                style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#1b110b", background: "#f9f9f9", border: "1.5px solid #e6dec2", maxHeight: "80px", lineHeight: 1.4 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#d29c3c"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e6dec2"; }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                style={{ background: input.trim() && !isLoading ? "#d29c3c" : "#e6dec2", cursor: input.trim() && !isLoading ? "pointer" : "not-allowed" }}
              >
                {isLoading ? <Loader2 size={15} className="animate-spin" style={{ color: "#ffffff" }} /> : <Send size={15} style={{ color: input.trim() ? "#ffffff" : "#a09080" }} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-4 z-50 flex items-center gap-2.5 rounded-2xl shadow-lg"
        style={{ background: "#1b110b", border: "1.5px solid rgba(210,156,60,0.4)", padding: "10px 16px 10px 12px" }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d29c3c"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(210,156,60,0.4)"; }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(210,156,60,0.2)" }}>
          {open ? <X size={14} style={{ color: "#d29c3c" }} /> : <Sparkles size={14} style={{ color: "#d29c3c" }} />}
        </div>
        <div className="flex flex-col items-start">
          <span style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "12px", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.1 }}>Ask The GRID</span>
          {!open && <span style={{ fontFamily: "Inter, sans-serif", fontSize: "9px", color: "#7a6e62", letterSpacing: "0.05em" }}>Your portal assistant</span>}
        </div>
      </motion.button>
    </>
  );
}
