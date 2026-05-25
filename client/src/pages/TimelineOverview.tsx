import { trpc } from "@/lib/trpc";
import { PageHeader, StatusBadge, EmptyState, LoadingSpinner } from "@/components/SLSComponents";
import { Clock, Check } from "lucide-react";
import { Link } from "wouter";

function formatDate(d?: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TimelineOverview() {
  const { data: projects, isLoading: projLoading } = trpc.projects.list.useQuery({});

  return (
    <div className="page-enter">
      <PageHeader title="Timeline Overview" subtitle="Project milestones and delivery schedules across all active projects" />
      <div className="p-6 space-y-4">
        {projLoading ? <LoadingSpinner /> : (projects ?? []).length === 0 ? (
          <EmptyState icon={<Clock size={48} />} title="No Timeline Data" description="Timeline data will appear once projects with milestones are created." />
        ) : (
          <div className="space-y-4">
            {(projects ?? []).map(p => (
              <ProjectTimeline key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectTimeline({ project }: { project: any }) {
  const { data: milestones } = trpc.milestones.listByProject.useQuery({ projectId: project.id });

  return (
    <div className="sls-card">
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
        <div className="flex items-center gap-3">
          <Link href={`/projects/${project.id}`}>
            <span style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#d29c3c", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em" }}>{project.name}</span>
          </Link>
          <StatusBadge status={project.timelineStatus ?? "on_track"} />
        </div>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080" }}>Target Delivery: {project.targetDeliveryAt ? new Date(project.targetDeliveryAt).toLocaleDateString() : "—"}</span>
      </div>
      {!milestones || milestones.length === 0 ? (
        <div className="px-5 py-4" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a09080" }}>No milestones added yet.</div>
      ) : (
        <div className="px-5 py-4">
          <div className="flex gap-0 overflow-x-auto pb-2">
            {milestones.map((m, idx) => (
              <div key={m.id} className="flex items-center">
                <div className="flex flex-col items-center min-w-[100px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.status === "complete" ? "bg-green-100" : m.status === "at_risk" ? "bg-yellow-100" : m.status === "delayed" ? "bg-red-100" : "bg-[#f5e9cc]"}`}>
                    {m.status === "complete" ? <Check size={14} style={{ color: "#16a34a" }} /> : <Clock size={14} style={{ color: "#d29c3c" }} />}
                  </div>
                  <div className="text-center mt-2">
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#1b110b", maxWidth: "90px" }} className="truncate">{m.name}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a09080" }}>{m.targetDate ? new Date(m.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</div>
                    <StatusBadge status={m.status ?? "pending"} />
                  </div>
                </div>
                {idx < milestones.length - 1 && (
                  <div className="w-8 h-0.5 flex-shrink-0 mx-1" style={{ background: m.status === "complete" ? "#16a34a" : "#e8e3d8" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
