"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

function formatTimestamp(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const projects = trpc.projects.list.useQuery();
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  // Default to the SLS x Taptico engagement project on first load.
  useEffect(() => {
    if (activeProjectId !== null || !projects.data || projects.data.length === 0) return;
    const engagement = projects.data.find((p) =>
      p.name.toLowerCase().includes("taptico"),
    );
    setActiveProjectId(engagement?.id ?? projects.data[0].id);
  }, [projects.data, activeProjectId]);

  const list = trpc.messages.list.useQuery(
    { projectId: activeProjectId ?? -1 },
    { enabled: !!activeProjectId },
  );

  const utils = trpc.useUtils();
  const create = trpc.messages.create.useMutation({
    onSuccess: async () => {
      if (!activeProjectId) return;
      await utils.messages.list.invalidate({ projectId: activeProjectId });
    },
  });

  const [draft, setDraft] = useState("");
  const send = async () => {
    if (!draft.trim() || !activeProjectId) return;
    await create.mutateAsync({ projectId: activeProjectId, content: draft.trim() });
    setDraft("");
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [list.data?.length]);

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Project-scoped threads. Keep coordination out of email."
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Project list */}
        <Card>
          <CardContent>
            <div className="mb-2 text-xs uppercase tracking-widest text-sls-dark-brown/60">
              Project
            </div>
            <div className="space-y-1">
              {projects.data?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveProjectId(p.id)}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition ${
                    p.id === activeProjectId
                      ? "bg-sls-gold-pale text-sls-dark-brown"
                      : "hover:bg-sls-sand/40"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Thread */}
        <Card>
          <CardContent className="flex h-[60vh] flex-col gap-3">
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto pr-1"
            >
              {!activeProjectId && (
                <div className="text-sm text-sls-dark-brown/60">
                  Pick a project to view its thread.
                </div>
              )}
              {list.isLoading && activeProjectId && (
                <div className="text-sm text-sls-dark-brown/60">
                  Loading messages...
                </div>
              )}
              {list.data && list.data.length === 0 && (
                <EmptyState
                  title="No messages yet"
                  description="Start the conversation. Decisions, photos, and status updates live here."
                />
              )}
              {list.data?.map((m) => (
                <div key={m.id} className="rounded-md border border-sls-sand bg-white p-3">
                  <div className="flex items-baseline justify-between gap-3 text-xs text-sls-dark-brown/60">
                    <span className="font-medium text-sls-dark-brown">
                      {m.authorName ?? m.authorEmail ?? "Someone"}
                    </span>
                    <span>{formatTimestamp(m.createdAt)}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-sls-dark-brown">
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            {activeProjectId && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message"
                  className="flex-1 resize-none rounded-md border border-sls-sand bg-white px-3 py-2 text-sm focus:border-sls-gold focus:outline-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button type="submit" disabled={!draft.trim() || create.isPending}>
                  {create.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
