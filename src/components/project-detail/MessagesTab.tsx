"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/SLSComponents";
import { trpc } from "@/lib/trpc/client";
import { Send, Loader2 } from "lucide-react";

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

export function MessagesTab({ projectId }: { projectId: number }) {
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const list = trpc.messages.list.useQuery({ projectId });
  const create = trpc.messages.create.useMutation({
    onSuccess: () => {
      utils.messages.list.invalidate({ projectId });
      setDraft("");
    },
  });

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [list.data]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    create.mutate({ projectId, content: draft.trim() });
  }

  return (
    <Card>
      <CardContent className="flex h-[60vh] flex-col gap-3 p-0">
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-3">
          {list.isLoading ? (
            <div className="text-sm text-sls-dark-brown/60">Loading…</div>
          ) : !list.data || list.data.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Start the project conversation below."
            />
          ) : (
            <ul className="space-y-3">
              {list.data.map((m) => (
                <li key={m.id} className="rounded-md border border-sls-sand bg-sls-off-white p-3">
                  <div className="text-xs text-sls-dark-brown/60">
                    {m.authorName ?? m.authorEmail ?? `User #${m.authorId}`} · {formatTimestamp(m.createdAt)}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-sls-dark-brown">
                    {m.content}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form
          onSubmit={send}
          className="flex items-center gap-2 border-t border-sls-sand px-4 py-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-md border border-sls-sand px-3 py-2 text-sm"
          />
          <Button type="submit" size="sm" disabled={create.isPending || !draft.trim()}>
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </form>
        {create.error && (
          <p className="px-4 pb-2 text-xs text-red-600">{create.error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
