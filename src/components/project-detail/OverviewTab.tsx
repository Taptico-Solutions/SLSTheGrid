"use client";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/SLSComponents";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency, formatDate, formatRelative } from "./shared";
import { FileText, Layers, CheckCircle, Users } from "lucide-react";

type Project = {
  id: number;
  name: string;
  description: string | null;
  phase: string;
  status: string;
  clientCompany: string | null;
  clientContact: string | null;
  location: string | null;
  startDate: Date | string | null;
  targetCompletionDate: Date | string | null;
  actualCompletionDate: Date | string | null;
  originalBudget: string | null;
  currentBudget: string | null;
  assignedRepId: number | null;
  assignedPmId: number | null;
  createdAt: Date | string;
};

export function OverviewTab({ project }: { project: Project }) {
  const productsQ = trpc.products.list.useQuery({ projectId: project.id });
  const milestonesQ = trpc.milestones.list.useQuery({ projectId: project.id });
  const documentsQ = trpc.documents.list.useQuery({ projectId: project.id });
  const teamQ = trpc.team.list.useQuery({ projectId: project.id });
  const submittalsQ = trpc.submittals.list.useQuery({ projectId: project.id });
  const budgetQ = trpc.budget.getSummary.useQuery({ projectId: project.id });

  const completedMilestones =
    milestonesQ.data?.filter((m) => m.status === "completed").length ?? 0;
  const totalMilestones = milestonesQ.data?.length ?? 0;
  const openSubmittals =
    submittalsQ.data?.filter((s) =>
      ["submitted", "under_review", "needs_revision", "resubmitted"].includes(s.status),
    ).length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <p className="mb-4 text-sm">{project.description ?? "No description yet."}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs uppercase tracking-widest text-sls-dark-brown/60 md:grid-cols-4">
            <div>
              <div className="text-[10px]">Client</div>
              <div className="mt-0.5 normal-case tracking-normal text-sm text-sls-dark-brown">
                {project.clientCompany ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px]">Contact</div>
              <div className="mt-0.5 normal-case tracking-normal text-sm text-sls-dark-brown">
                {project.clientContact ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px]">Location</div>
              <div className="mt-0.5 normal-case tracking-normal text-sm text-sls-dark-brown">
                {project.location ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px]">Phase</div>
              <div className="mt-0.5">
                <Badge>{project.phase}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Products"
          value={productsQ.data?.length ?? "—"}
          icon={<Layers className="h-4 w-4" />}
        />
        <StatCard
          label="Milestones"
          value={`${completedMilestones}/${totalMilestones}`}
          icon={<CheckCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Documents"
          value={documentsQ.data?.length ?? "—"}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Team"
          value={teamQ.data?.length ?? "—"}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardTitle>Schedule</CardTitle>
          <CardContent className="mt-3 space-y-1.5 text-sm">
            <Row label="Start" value={formatDate(project.startDate)} />
            <Row label="Target" value={formatDate(project.targetCompletionDate)} />
            <Row label="Completed" value={formatDate(project.actualCompletionDate)} />
            <Row label="Created" value={formatRelative(project.createdAt)} />
          </CardContent>
        </Card>
        <Card>
          <CardTitle>Budget</CardTitle>
          <CardContent className="mt-3 space-y-1.5 text-sm">
            <Row label="Original" value={formatCurrency(project.originalBudget)} />
            <Row label="Current" value={formatCurrency(project.currentBudget)} />
            <Row
              label="Line items total"
              value={formatCurrency(budgetQ.data?.currentTotal)}
            />
            <Row label="Open submittals" value={openSubmittals} />
          </CardContent>
        </Card>
        <Card>
          <CardTitle>Status</CardTitle>
          <CardContent className="mt-3 space-y-1.5 text-sm">
            <Row
              label="Project"
              value={<Badge status={project.status}>{project.status}</Badge>}
            />
            <Row
              label="Phase"
              value={<Badge>{project.phase}</Badge>}
            />
            <Row
              label="Rep"
              value={project.assignedRepId ? `User #${project.assignedRepId}` : "Unassigned"}
            />
            <Row
              label="PM"
              value={project.assignedPmId ? `User #${project.assignedPmId}` : "Unassigned"}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-sls-dark-brown/60">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
