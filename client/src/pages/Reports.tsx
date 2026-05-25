import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard, LoadingSpinner, EmptyState } from "@/components/SLSComponents";
import { BarChart3, Building2, DollarSign, Clock, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";

function formatCurrency(val?: string | number | null) {
  const n = typeof val === "number" ? val : parseFloat(String(val ?? "0"));
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function Reports() {
  const { data: stats, isLoading: statsLoading } = trpc.projects.getStats.useQuery();
  const { data: projects, isLoading: projLoading } = trpc.projects.list.useQuery({});
  const { data: submittals } = trpc.submittals.listAll.useQuery();

  const isLoading = statsLoading || projLoading;

  const byStatus = (projects ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  const byRegion = (projects ?? []).reduce<Record<string, number>>((acc, p) => {
    const r = p.region ?? "other";
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});

  const submittalStats = {
    total: (submittals ?? []).length,
    approved: (submittals ?? []).filter(s => s.status === "approved").length,
    pending: (submittals ?? []).filter(s => ["submitted","under_review"].includes(s.status ?? "")).length,
    rejected: (submittals ?? []).filter(s => s.status === "rejected").length,
  };

  return (
    <div className="page-enter">
      <PageHeader title="Reports" subtitle="Portfolio performance metrics and project analytics" />
      <div className="p-6 space-y-6">
        {isLoading ? <LoadingSpinner /> : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Projects" value={stats?.total ?? 0} icon={<Building2 size={20} />} color="#d29c3c" />
              <StatCard label="Active Projects" value={stats?.active ?? 0} icon={<Building2 size={20} />} color="#2563eb" />
              <StatCard label="On-Time Rate" value={`${stats?.onTime ?? 100}%`} icon={<Clock size={20} />} color="#16a34a" />
              <StatCard label="On-Budget Rate" value={`${stats?.onBudget ?? 100}%`} icon={<DollarSign size={20} />} color="#7c3aed" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Projects by Status */}
              <div className="sls-card p-5">
                <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "16px" }}>Projects by Status</h3>
                <div className="space-y-3">
                  {Object.entries(byStatus).map(([status, count]) => {
                    const pct = Math.round((count / (projects?.length ?? 1)) * 100);
                    return (
                      <div key={status}>
                        <div className="flex justify-between mb-1">
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e", textTransform: "capitalize" }}>{status.replace(/_/g," ")}</span>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#1b110b" }}>{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: "#f0ebe0" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#d29c3c" }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(byStatus).length === 0 && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a09080" }}>No data yet</p>}
                </div>
              </div>

              {/* Projects by Region */}
              <div className="sls-card p-5">
                <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "16px" }}>Projects by Region</h3>
                <div className="space-y-3">
                  {Object.entries(byRegion).map(([region, count]) => {
                    const pct = Math.round((count / (projects?.length ?? 1)) * 100);
                    return (
                      <div key={region}>
                        <div className="flex justify-between mb-1">
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e", textTransform: "capitalize" }}>{region}</span>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#1b110b" }}>{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: "#f0ebe0" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#2563eb" }} />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(byRegion).length === 0 && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a09080" }}>No data yet</p>}
                </div>
              </div>

              {/* Submittal Stats */}
              <div className="sls-card p-5">
                <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "16px" }}>Submittal Summary</h3>
                <div className="space-y-3">
                  {[
                    { label: "Total", value: submittalStats.total, color: "#d29c3c" },
                    { label: "Approved", value: submittalStats.approved, color: "#16a34a" },
                    { label: "Pending", value: submittalStats.pending, color: "#854d0e" },
                    { label: "Rejected", value: submittalStats.rejected, color: "#ef4444" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "#f0ebe0" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{item.label}</span>
                      </div>
                      <span style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "18px", color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget Summary Table */}
            <div className="sls-card">
              <div className="px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
                <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Budget Performance</h3>
              </div>
              {(projects ?? []).length === 0 ? (
                <div className="p-6"><EmptyState icon={<BarChart3 size={40} />} title="No Data" description="Budget data will appear once projects are created." /></div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#f9f6f0" }}>
                      {["Project", "Region", "Original Budget", "Current Budget", "Variance", "Timeline", "Budget"].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e8e3d8" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(projects ?? []).map(p => {
                      const orig = parseFloat(p.originalBudget ?? "0");
                      const curr = parseFloat(p.currentBudget ?? "0");
                      const v = curr - orig;
                      return (
                        <tr key={p.id} className="border-b" style={{ borderColor: "#f0ebe0" }}>
                          <td className="px-4 py-3">
                            <Link href={`/projects/${p.id}`}>
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#d29c3c", cursor: "pointer" }}>{p.name}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62", textTransform: "capitalize" }}>{p.region ?? "—"}</td>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{formatCurrency(orig)}</td>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{formatCurrency(curr)}</td>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: v > 0 ? "#ef4444" : v < 0 ? "#16a34a" : "#7a6e62" }}>
                            {v > 0 ? "+" : ""}{formatCurrency(v)}
                          </td>
                          <td className="px-4 py-3">
                            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: p.timelineStatus === "on_track" ? "#166534" : p.timelineStatus === "delayed" ? "#991b1b" : "#854d0e" }}>
                              {(p.timelineStatus ?? "on_track").replace(/_/g," ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: p.budgetStatus === "on_budget" ? "#166534" : "#991b1b" }}>
                              {(p.budgetStatus ?? "on_budget").replace(/_/g," ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
