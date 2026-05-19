"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/SLSComponents";
import { trpc } from "@/lib/trpc/client";
import { Plus, Loader2 } from "lucide-react";
import { formatDate } from "./shared";

const SUBMITTAL_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "needs_revision",
  "resubmitted",
] as const;

export function SubmittalsTab({ projectId }: { projectId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [documentId, setDocumentId] = useState("");

  const utils = trpc.useUtils();
  const list = trpc.submittals.list.useQuery({ projectId });
  const documents = trpc.documents.list.useQuery({ projectId });
  const create = trpc.submittals.create.useMutation({
    onSuccess: () => {
      utils.submittals.list.invalidate({ projectId });
      setShowForm(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      setDocumentId("");
    },
  });
  const update = trpc.submittals.update.useMutation({
    onSuccess: () => utils.submittals.list.invalidate({ projectId }),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      documentId: documentId ? Number(documentId) : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New submittal"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Submittal title"
                className="rounded-md border border-sls-sand px-3 py-2 text-sm sm:col-span-2"
                required
              />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-md border border-sls-sand px-3 py-2 text-sm"
              />
              <select
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="rounded-md border border-sls-sand px-3 py-2 text-sm sm:col-span-3"
              >
                <option value="">Link a document (optional)</option>
                {documents.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
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
          ) : !list.data || list.data.length === 0 ? (
            <EmptyState
              title="No submittals yet"
              description="Start the approval workflow by creating the first submittal."
            />
          ) : (
            <ul className="divide-y divide-sls-sand">
              {list.data.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sls-dark-brown">
                      {s.title}
                      <span className="ml-2 text-xs font-normal text-sls-dark-brown/60">
                        rev {s.revisionNumber}
                      </span>
                    </div>
                    {s.documentName && (
                      <div className="mt-0.5 text-xs text-sls-dark-brown/70">
                        Linked: {s.documentName}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-sls-dark-brown/60">
                      {s.submitterName ?? s.submitterEmail ?? `User #${s.submittedBy}`}
                      {" · "}
                      submitted {formatDate(s.createdAt)}
                      {s.dueDate ? ` · due ${formatDate(s.dueDate)}` : ""}
                      {s.reviewedAt ? ` · reviewed ${formatDate(s.reviewedAt)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={s.status}
                      onChange={(e) =>
                        update.mutate({
                          id: s.id,
                          status: e.target.value as (typeof SUBMITTAL_STATUSES)[number],
                        })
                      }
                      className="rounded-md border border-sls-sand bg-white px-2 py-1 text-xs"
                    >
                      {SUBMITTAL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    <Badge status={s.status}>{s.status.replace("_", " ")}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {update.error && (
        <p className="text-xs text-red-600">{update.error.message}</p>
      )}
    </div>
  );
}
