"use client";

import { useParams } from "next/navigation";
import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const project = trpc.projects.get.useQuery({ id });
  const milestones = trpc.milestones.list.useQuery({ projectId: id });
  const documents = trpc.documents.list.useQuery({ projectId: id });
  const messages = trpc.messages.list.useQuery({ projectId: id });
  const team = trpc.team.list.useQuery({ projectId: id });

  if (project.isLoading)
    return <div className="text-sm text-sls-dark-brown/60">Loading...</div>;
  if (project.error)
    return <div className="text-sm text-red-600">{project.error.message}</div>;
  if (!project.data) return null;

  const p = project.data;

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={`${p.clientCompany ?? ""}${p.location ? " · " + p.location : ""} · phase: ${p.phase}`}
        action={<Badge status={p.status}>{p.status}</Badge>}
      />

      <Card>
        <CardContent>
          <p className="mb-3 text-sm">{p.description ?? "No description yet."}</p>
          <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-widest text-sls-dark-brown/60 md:grid-cols-4">
            <div>Start: {formatDate(p.startDate)}</div>
            <div>Target: {formatDate(p.targetCompletionDate)}</div>
            <div>Original: {p.originalBudget ?? "—"}</div>
            <div>Current: {p.currentBudget ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Milestones</CardTitle>
          <CardContent className="mt-3 divide-y divide-sls-sand">
            {milestones.data && milestones.data.length === 0 && (
              <EmptyState title="No milestones" description="Add the first milestone for this project." />
            )}
            {milestones.data?.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium text-sls-dark-brown">{m.title}</div>
                  <div className="text-xs text-sls-dark-brown/60">
                    Due {formatDate(m.dueDate)}
                  </div>
                </div>
                <Badge status={m.status}>{m.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardTitle>Documents</CardTitle>
          <CardContent className="mt-3 divide-y divide-sls-sand">
            {documents.data && documents.data.length === 0 && (
              <EmptyState title="No documents" description="Drop your first file in the Documents tab." />
            )}
            {documents.data?.slice(0, 8).map((d) => (
              <div key={d.id} className="py-2 text-sm">
                <div className="font-medium text-sls-dark-brown">{d.name}</div>
                <div className="text-xs text-sls-dark-brown/60">
                  {d.category.replace("_", " ")} · {formatDate(d.createdAt)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Team</CardTitle>
          <CardContent className="mt-3 divide-y divide-sls-sand">
            {team.data && team.data.length === 0 && (
              <EmptyState title="No team members yet" description="Invite someone from the Admin page." />
            )}
            {team.data?.map((t) => (
              <div key={t.id} className="py-2 text-sm">
                <div className="text-sls-dark-brown">User #{t.userId}</div>
                {t.role && (
                  <div className="text-xs text-sls-dark-brown/60">{t.role.replace("_", " ")}</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardTitle>Recent Messages</CardTitle>
          <CardContent className="mt-3 divide-y divide-sls-sand">
            {messages.data && messages.data.length === 0 && (
              <EmptyState title="No messages yet" description="Start the conversation from the Messages page." />
            )}
            {messages.data?.slice(-5).map((m) => (
              <div key={m.id} className="py-2 text-sm">
                <div className="text-xs text-sls-dark-brown/60">
                  {m.authorName ?? m.authorEmail ?? "Someone"} ·{" "}
                  {formatDate(m.createdAt)}
                </div>
                <div className="mt-0.5 line-clamp-2 text-sls-dark-brown">{m.content}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
