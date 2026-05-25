import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, EmptyState, LoadingSpinner } from "@/components/SLSComponents";
import { Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "SLS Admin",
  sls_admin: "SLS Admin",
  sls_rep: "SLS Sales Rep",
  sls_pm: "SLS Project Manager",
  client_architect: "Architect / Designer",
  client_gc: "General Contractor",
  user: "User",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#d29c3c",
  sls_admin: "#d29c3c",
  sls_rep: "#2563eb",
  sls_pm: "#7c3aed",
  client_architect: "#16a34a",
  client_gc: "#0891b2",
  user: "#6b7280",
};

export default function Team() {
  const { user } = useAuth();
  const { data: members, isLoading } = trpc.team.listAll.useQuery();

  const grouped = (members ?? []).reduce<Record<string, typeof members>>((acc, m) => {
    const role = m.role ?? "user";
    if (!acc[role]) acc[role] = [];
    acc[role]!.push(m);
    return acc;
  }, {});

  return (
    <div className="page-enter">
      <PageHeader title="Team & Contacts" subtitle="All users and team members across the SLS portal" />
      <div className="p-6 space-y-6">
        {isLoading ? <LoadingSpinner /> : (members ?? []).length === 0 ? (
          <EmptyState icon={<Users size={48} />} title="No Team Members" description="Team members will appear here once they log in to the portal." />
        ) : (
          Object.entries(grouped).map(([role, roleMembers]) => (
            <div key={role} className="sls-card">
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "#e8e3d8", background: "#fafaf8" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: ROLE_COLORS[role] ?? "#6b7280" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {ROLE_LABELS[role] ?? role} ({roleMembers?.length ?? 0})
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0" style={{ borderColor: "#f0ebe0" }}>
                {(roleMembers ?? []).map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "#f0ebe0" }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                      style={{ background: ROLE_COLORS[m.role ?? "user"] ?? "#6b7280", fontSize: "14px" }}>
                      {m.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "13px", color: "#1b110b" }}>
                        {m.name ?? "Unknown"} {m.id === user?.id && <span style={{ color: "#d29c3c", fontSize: "10px" }}>(You)</span>}
                      </div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>{m.email ?? "—"}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a09080" }}>
                        Last active: {m.lastSignedIn ? new Date(m.lastSignedIn).toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
