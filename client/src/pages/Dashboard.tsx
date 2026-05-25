import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PageHeader, StatCard, StatusBadge, EmptyState, LoadingSpinner } from "@/components/SLSComponents";
import { Building2, CheckCircle, Clock, DollarSign, FileText, TrendingUp, AlertTriangle, Bell } from "lucide-react";
import { Link } from "wouter";

function formatCurrency(val?: string | null) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function timeAgo(date: Date | string) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.projects.getStats.useQuery();
  const { data: projects, isLoading: projLoading } = trpc.projects.list.useQuery({});
  const { data: activity } = trpc.activity.recent.useQuery();
  const { data: notifs } = trpc.notifications.list.useQuery();

  const recentProjects = (projects ?? []).slice(0, 5);
  const urgentNotifs = (notifs ?? []).filter(n => !n.isRead).slice(0, 3);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Dashboard"
        subtitle={`${greeting()}, ${user?.name?.split(" ")[0] ?? "there"} — here's your project overview.`}
      />

      <div className="p-6 space-y-6">
        {/* Stats Row */}
        {statsLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Projects"
              value={stats?.total ?? 0}
              icon={<Building2 size={20} />}
              color="#d29c3c"
            />
            <StatCard
              label="Active Projects"
              value={stats?.active ?? 0}
              icon={<TrendingUp size={20} />}
              color="#2563eb"
            />
            <StatCard
              label="On Time"
              value={`${stats?.onTime ?? 100}%`}
              icon={<Clock size={20} />}
              color="#16a34a"
              subtitle="Timeline performance"
            />
            <StatCard
              label="On Budget"
              value={`${stats?.onBudget ?? 100}%`}
              icon={<DollarSign size={20} />}
              color="#7c3aed"
              subtitle="Budget performance"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <div className="lg:col-span-2 sls-card">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
              <h2 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Recent Projects
              </h2>
              <Link href="/projects">
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#d29c3c", textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer" }}>
                  View All →
                </span>
              </Link>
            </div>
            {projLoading ? (
              <LoadingSpinner />
            ) : recentProjects.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Building2 size={40} />}
                  title="No Projects Yet"
                  description="Projects will appear here once created."
                />
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#f0ebe0" }}>
                {recentProjects.map((proj) => (
                  <Link key={proj.id} href={`/projects/${proj.id}`}>
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#fdf8ef] transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ background: "#f5e9cc" }}>
                        <Building2 size={14} style={{ color: "#d29c3c" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "13px", color: "#1b110b" }} className="truncate">
                          {proj.name}
                        </div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>
                          {proj.city ? `${proj.city}, ` : ""}{proj.state ?? ""} · {proj.buildingType ?? "Commercial"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={proj.timelineStatus ?? "on_track"} />
                        <StatusBadge status={proj.status} />
                      </div>
                      {proj.currentBudget && (
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62", flexShrink: 0 }}>
                          {formatCurrency(proj.currentBudget)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Notifications */}
            <div className="sls-card">
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
                <h2 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Alerts
                </h2>
                <Link href="/notifications">
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#d29c3c", cursor: "pointer" }}>View All →</span>
                </Link>
              </div>
              <div className="divide-y" style={{ borderColor: "#f0ebe0" }}>
                {urgentNotifs.length === 0 ? (
                  <div className="px-5 py-4 text-center">
                    <CheckCircle size={20} style={{ color: "#16a34a", margin: "0 auto 8px" }} />
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}>All caught up!</p>
                  </div>
                ) : (
                  urgentNotifs.map((n) => (
                    <div key={n.id} className="px-5 py-3 flex items-start gap-3">
                      <Bell size={14} style={{ color: "#d29c3c", flexShrink: 0, marginTop: "2px" }} />
                      <div className="min-w-0">
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#1b110b" }} className="truncate">
                          {n.title}
                        </div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080" }}>
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="sls-card p-5">
              <h2 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                Quick Actions
              </h2>
              <div className="space-y-2">
                {[
                  { label: "New Project", href: "/projects", icon: <Building2 size={14} /> },
                  { label: "Upload Document", href: "/documents", icon: <FileText size={14} /> },
                  { label: "View Submittals", href: "/submittals", icon: <CheckCircle size={14} /> },
                  { label: "AI Copilot", href: "/copilot", icon: <AlertTriangle size={14} /> },
                ].map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#fdf8ef] transition-colors cursor-pointer group">
                      <span style={{ color: "#d29c3c" }}>{action.icon}</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {action.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        {activity && activity.length > 0 && (
          <div className="sls-card">
            <div className="px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
              <h2 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Recent Activity
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: "#f0ebe0" }}>
              {activity.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#d29c3c" }} />
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }} className="flex-1">
                    <span style={{ fontWeight: 600 }}>{item.action.replace(/_/g, " ")}</span>
                    {item.details && <span style={{ color: "#7a6e62" }}> — {item.details}</span>}
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080", flexShrink: 0 }}>
                    {timeAgo(item.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLS Tagline Banner */}
        <div className="rounded-md px-6 py-4 flex items-center justify-between" style={{ background: "#1b110b" }}>
          <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "16px", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            On Time. On Budget. <span style={{ color: "#d29c3c" }}>Beautiful.</span>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Southern Lighting Source · Atlanta, GA
          </div>
        </div>
      </div>
    </div>
  );
}
