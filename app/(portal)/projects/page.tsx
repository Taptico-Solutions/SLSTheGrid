"use client";

import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

/** Spec §8.3 — Projects list. */
export default function ProjectsPage() {
  const { data, isLoading } = trpc.projects.list.useQuery();

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Every project you have access to."
        action={
          <Button>
            <Plus size={14} /> New Project
          </Button>
        }
      />

      {isLoading && <div className="text-sm text-sls-dark-brown/60">Loading…</div>}

      {data && data.length === 0 && (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking submittals, budget, and milestones."
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card className="transition hover:border-sls-gold">
              <div className="flex items-start justify-between">
                <h3 className="font-slab text-base uppercase text-sls-dark-brown">{p.name}</h3>
                <Badge status={p.status}>{p.status}</Badge>
              </div>
              <CardContent className="mt-3 space-y-1 text-sm">
                <div>{p.clientCompany ?? "—"}</div>
                <div className="text-xs text-sls-dark-brown/60">
                  Phase: {p.phase} · Target: {p.targetCompletionDate?.toString().slice(0, 10) ?? "—"}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
