"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/SLSComponents";
import { PrioritiesPanel } from "@/components/project-detail/PrioritiesPanel";
import { trpc } from "@/lib/trpc/client";
import { ArrowLeft } from "lucide-react";

export default function ProjectPrioritiesPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const project = trpc.projects.get.useQuery({ id });

  if (project.isLoading) {
    return <div className="text-sm text-sls-dark-brown/60">Loading…</div>;
  }
  if (project.error) {
    return <div className="text-sm text-red-600">{project.error.message}</div>;
  }
  if (!project.data) return null;

  return (
    <>
      <Link
        href={`/projects/${id}`}
        className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-sls-dark-brown/60 hover:text-sls-gold"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to project
      </Link>

      <PageHeader
        title="Priorities"
        subtitle={project.data.name}
      />

      <PrioritiesPanel projectId={id} />
    </>
  );
}
