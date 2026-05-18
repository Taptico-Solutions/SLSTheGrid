"use client";

import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

const STATUS_ORDER = ["in_progress", "pending", "delayed", "completed", "cancelled"];

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TimelinePage() {
  const milestones = trpc.milestones.list.useQuery();
  const projects = trpc.projects.list.useQuery();

  const projectName = (id: number) =>
    projects.data?.find((p) => p.id === id)?.name ?? `Project ${id}`;

  const sorted = (milestones.data ?? [])
    .slice()
    .sort((a, b) => {
      const aIdx = STATUS_ORDER.indexOf(a.status);
      const bIdx = STATUS_ORDER.indexOf(b.status);
      if (aIdx !== bIdx) return aIdx - bIdx;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });

  return (
    <>
      <PageHeader
        title="Timeline"
        subtitle="Every milestone you have access to, sorted by status and due date."
      />

      {milestones.isLoading && (
        <div className="text-sm text-sls-dark-brown/60">Loading milestones...</div>
      )}

      {milestones.data && sorted.length === 0 && (
        <EmptyState
          title="No milestones yet"
          description="Open a project and add a milestone to see it here."
        />
      )}

      <Card>
        <CardTitle>Milestones</CardTitle>
        <CardContent className="mt-3 divide-y divide-sls-sand">
          {sorted.map((m) => (
            <Link
              key={m.id}
              href={`/projects/${m.projectId}`}
              className="block py-3 text-sm transition hover:bg-sls-sand/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sls-dark-brown">{m.title}</div>
                  <div className="text-xs text-sls-dark-brown/60">
                    {projectName(m.projectId)} · Due {formatDate(m.dueDate)}
                  </div>
                  {m.description && (
                    <div className="mt-1 truncate text-xs text-sls-dark-brown/70">
                      {m.description}
                    </div>
                  )}
                </div>
                <Badge status={m.status}>{m.status.replace("_", " ")}</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
