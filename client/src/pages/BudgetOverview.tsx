import { trpc } from "@/lib/trpc";
import { PageHeader, StatusBadge, EmptyState, LoadingSpinner, StatCard } from "@/components/SLSComponents";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";

function formatCurrency(val?: string | number | null) {
  const n = typeof val === "number" ? val : parseFloat(String(val ?? "0"));
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function BudgetOverview() {
  const { data: projects, isLoading } = trpc.projects.list.useQuery({});

  const totalBudget = (projects ?? []).reduce((s, p) => s + parseFloat(p.originalBudget ?? "0"), 0);
  const totalCurrent = (projects ?? []).reduce((s, p) => s + parseFloat(p.currentBudget ?? "0"), 0);
  const variance = totalCurrent - totalBudget;
  const overBudget = (projects ?? []).filter(p => parseFloat(p.currentBudget ?? "0") > parseFloat(p.originalBudget ?? "0")).length;

  return (
    <div className="page-enter">
      <PageHeader title="Budget Overview" subtitle="Financial summary across all active projects" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Budget" value={formatCurrency(totalBudget)} icon={<DollarSign size={20} />} color="#d29c3c" />
          <StatCard label="Current Committed" value={formatCurrency(totalCurrent)} icon={<TrendingUp size={20} />} color="#2563eb" />
          <StatCard label="Variance" value={formatCurrency(Math.abs(variance))} icon={variance > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />} color={variance > 0 ? "#ef4444" : "#16a34a"} subtitle={variance > 0 ? "Over budget" : "Under budget"} />
          <StatCard label="Over Budget" value={overBudget} icon={<TrendingUp size={20} />} color="#ef4444" subtitle="projects" />
        </div>

        {isLoading ? <LoadingSpinner /> : (projects ?? []).length === 0 ? (
          <EmptyState icon={<DollarSign size={48} />} title="No Budget Data" description="Budget data will appear once projects are created with budgets." />
        ) : (
          <div className="sls-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
              <h2 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Project Budgets</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9f6f0" }}>
                  {["Project", "Original Budget", "Current Budget", "Variance", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e8e3d8" }}>{h}</th>
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
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{formatCurrency(orig)}</td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{formatCurrency(curr)}</td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: v > 0 ? "#ef4444" : v < 0 ? "#16a34a" : "#7a6e62" }}>
                        {v > 0 ? "+" : ""}{formatCurrency(v)}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.budgetStatus ?? "on_budget"} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f9f6f0" }}>
                  <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase" }}>Total</td>
                  <td className="px-4 py-3" style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "13px", color: "#1b110b" }}>{formatCurrency(totalBudget)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "13px", color: "#1b110b" }}>{formatCurrency(totalCurrent)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "13px", color: variance > 0 ? "#ef4444" : "#16a34a" }}>{variance > 0 ? "+" : ""}{formatCurrency(variance)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
