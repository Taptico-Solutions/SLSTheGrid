"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/SLSComponents";
import { trpc } from "@/lib/trpc/client";
import { Plus, Loader2 } from "lucide-react";
import { formatDate } from "./shared";

const STATUSES = ["pending", "in_progress", "completed", "delayed", "cancelled"] as const;

export function TimelineTab({ projectId }: { projectId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const utils = trpc.useUtils();
  const list = trpc.milestones.list.useQuery({ projectId });
  const create = trpc.milestones.create.useMutation({
    onSuccess: () => {
      utils.milestones.list.invalidate({ projectId });
      setShowForm(false);
      setTitle("");
      setDescription("");
      setDueDate("");
    },
  });
  const update = trpc.milestones.update.useMutation({
    onSuccess: () => utils.milestones.list.invalidate({ projectId }),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
  }

  const sorted = [...(list.data ?? [])].sort((a, b) => {
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return ad - bd;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add milestone"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Milestone title"
                className="rounded-md border border-sls-sand px-3 py-2 text-sm sm:col-span-2"
                required
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-md border border-sls-sand px-3 py-2 text-sm"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details (optional)"
                rows={2}
                className="rounded-md border border-sls-sand px-3 py-2 text-sm sm:col-span-3"
              />
              <Button type="submit" size="sm" disabled={create.isPending} className="sm:col-span-3">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </form>
            {create.error && (
              <p className="mt-2 text-xs text-red-600">{create.error.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-6 text-sm text-sls-dark-brown/60">Loading…</div>
          ) : sorted.length === 0 ? (
            <EmptyState
              title="No milestones yet"
              description="Add the first milestone to start building the project timeline."
            />
          ) : (
            <ol className="divide-y divide-sls-sand">
              {sorted.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sls-dark-brown">{m.title}</div>
                    {m.description && (
                      <div className="mt-0.5 text-xs text-sls-dark-brown/70">{m.description}</div>
                    )}
                    <div className="mt-1 text-xs text-sls-dark-brown/60">
                      Due {formatDate(m.dueDate)}
                      {m.completedDate ? ` · completed ${formatDate(m.completedDate)}` : ""}
                    </div>
                  </div>
                  <select
                    value={m.status}
                    onChange={(e) =>
                      update.mutate({
                        id: m.id,
                        status: e.target.value as (typeof STATUSES)[number],
                      })
                    }
                    className="rounded-md border border-sls-sand bg-white px-2 py-1 text-xs"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <Badge status={m.status}>{m.status.replace("_", " ")}</Badge>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
