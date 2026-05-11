"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/SLSComponents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

/**
 * Spec §8.4 — Project Detail (8 tabs).
 * Foundation scaffold shows the header + overview only.
 * Tabs: Overview | Products | Timeline | Budget | Submittals |
 *       Documents | Messages | Team — to be built in subsequent passes.
 */
export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data, isLoading, error } = trpc.projects.get.useQuery({ id });

  if (isLoading) return <div className="text-sm text-sls-dark-brown/60">Loading…</div>;
  if (error) return <div className="text-sm text-red-600">{error.message}</div>;
  if (!data) return null;

  return (
    <>
      <PageHeader
        title={data.name}
        subtitle={`${data.clientCompany ?? ""} · phase: ${data.phase}`}
        action={<Badge status={data.status}>{data.status}</Badge>}
      />

      <Card>
        <CardContent>
          <p className="mb-3">{data.description ?? "No description yet."}</p>
          <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-widest text-sls-dark-brown/60">
            <div>Start: {data.startDate?.toString().slice(0, 10) ?? "—"}</div>
            <div>Target: {data.targetCompletionDate?.toString().slice(0, 10) ?? "—"}</div>
            <div>Original budget: {data.originalBudget ?? "—"}</div>
            <div>Current budget: {data.currentBudget ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-xs uppercase tracking-widest text-sls-dark-brown/40">
        Tabs (Products / Timeline / Budget / Submittals / Documents / Messages / Team) — spec §8.4, to be implemented next.
      </div>
    </>
  );
}
