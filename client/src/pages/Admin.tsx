import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, EmptyState, LoadingSpinner } from "@/components/SLSComponents";
import {
  ShieldCheck,
  Users,
  Edit2,
  Check,
  Database,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useLocation } from "wouter";

const ROLES = ["user", "sls_admin", "sls_rep", "sls_pm", "client_architect", "client_gc"];
const ROLE_LABELS: Record<string, string> = {
  user: "User",
  sls_admin: "SLS Admin",
  sls_rep: "SLS Sales Rep",
  sls_pm: "SLS Project Manager",
  client_architect: "Architect / Designer",
  client_gc: "General Contractor",
  admin: "System Admin",
};

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = ["sls_admin", "admin"].includes(user?.role ?? "");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState("");

  const { data: members, isLoading, refetch } = trpc.team.listAll.useQuery();
  const { data: seedStatus, refetch: refetchSeed } = trpc.seed.status.useQuery();

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => { refetch(); setEditingId(null); toast.success("Role updated"); },
    onError: () => toast.error("Failed to update role"),
  });

  const loadSeed = trpc.seed.load.useMutation({
    onSuccess: (data) => {
      refetchSeed();
      toast.success("Demo data loaded!", {
        description: `${data.summary.project} — ${data.summary.products} products, ${data.summary.milestones} milestones, ${data.summary.submittals} submittals.`,
        duration: 6000,
        action: {
          label: "View Project",
          onClick: () => navigate(`/projects/${data.projectId}`),
        },
      });
    },
    onError: (err) => toast.error("Failed to load demo data", { description: err.message }),
  });

  const clearSeed = trpc.seed.clear.useMutation({
    onSuccess: () => {
      refetchSeed();
      toast.success("Demo data cleared successfully.");
    },
    onError: (err) => toast.error("Failed to clear demo data", { description: err.message }),
  });

  if (!isAdmin) {
    return (
      <div className="page-enter">
        <PageHeader title="Admin" subtitle="Administrative controls" />
        <div className="p-6">
          <EmptyState icon={<ShieldCheck size={48} />} title="Access Restricted" description="This section is only available to SLS Admins." />
        </div>
      </div>
    );
  }

  const demoLoaded = seedStatus?.loaded ?? false;

  return (
    <div className="page-enter">
      <PageHeader title="Admin Panel" subtitle="User management and portal administration" />
      <div className="p-6 space-y-5">

        {/* ── Demo Data Section ─────────────────────────────────────────────── */}
        <div className="sls-card">
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
            <Database size={16} style={{ color: "#d29c3c" }} />
            <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Demo Data
            </h3>
            {demoLoaded && (
              <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "#dcfce7", color: "#16a34a" }}>
                <CheckCircle2 size={11} />
                Loaded
              </span>
            )}
          </div>

          <div className="px-5 py-5">
            <div className="flex flex-col lg:flex-row lg:items-start gap-5">
              {/* Description */}
              <div className="flex-1">
                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "13px", color: "#1b110b", marginBottom: "6px" }}>
                  Ponce City Market — Food Hall Renovation
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62", lineHeight: 1.6, marginBottom: "12px" }}>
                  Load a fully realistic demo project to showcase The GRID in action. Includes 8 fixture line items across 3 manufacturers, 8 project milestones, 3 submittals (one approved, one under review, one draft), a $296,200 budget with 2 approved change orders, 6 project messages, and a full team of 5 members.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Products", value: "8 fixtures" },
                    { label: "Milestones", value: "8 phases" },
                    { label: "Submittals", value: "3 packages" },
                    { label: "Budget", value: "$296,200" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg px-3 py-2.5 text-center" style={{ background: "#f9f6f0", border: "1px solid #e8e3d8" }}>
                      <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "15px", color: "#d29c3c" }}>{item.value}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "2px" }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5 lg:w-44 flex-shrink-0">
                {!demoLoaded ? (
                  <button
                    onClick={() => loadSeed.mutate()}
                    disabled={loadSeed.isPending}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      background: loadSeed.isPending ? "#e6dec2" : "#1b110b",
                      color: "#ffffff",
                      cursor: loadSeed.isPending ? "not-allowed" : "pointer",
                      border: "1.5px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (!loadSeed.isPending) (e.currentTarget as HTMLButtonElement).style.background = "#d29c3c"; }}
                    onMouseLeave={(e) => { if (!loadSeed.isPending) (e.currentTarget as HTMLButtonElement).style.background = "#1b110b"; }}
                  >
                    {loadSeed.isPending ? (
                      <><Loader2 size={14} className="animate-spin" /> Loading...</>
                    ) : (
                      <><Play size={14} /> Load Demo Data</>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate("/projects")}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all"
                      style={{ fontFamily: "Inter, sans-serif", background: "#1b110b", color: "#ffffff", border: "1.5px solid transparent" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#d29c3c"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1b110b"; }}
                    >
                      View Project
                    </button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all"
                          style={{ fontFamily: "Inter, sans-serif", background: "transparent", color: "#dc2626", border: "1.5px solid #fca5a5" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                        >
                          <Trash2 size={14} /> Clear Demo Data
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear all demo data?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the demo project, all associated products, milestones, submittals, budget items, messages, and the demo team members. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => clearSeed.mutate()}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {clearSeed.isPending ? "Clearing..." : "Yes, Clear Demo Data"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}

                <div className="flex items-start gap-1.5 mt-1">
                  <AlertCircle size={11} style={{ color: "#a09080", flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a09080", lineHeight: 1.4 }}>
                    Demo data is tagged and can be cleared at any time without affecting real data.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── User Management ───────────────────────────────────────────────── */}
        <div className="sls-card">
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
            <Users size={16} style={{ color: "#d29c3c" }} />
            <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              User Management
            </h3>
          </div>
          {isLoading ? (
            <LoadingSpinner />
          ) : (members ?? []).length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Users size={40} />} title="No Users" description="Users will appear here once they log in." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f9f6f0" }}>
                    {["User", "Email", "Current Role", "Last Sign In", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e8e3d8" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(members ?? []).map((m) => (
                    <tr key={m.id} className="border-b" style={{ borderColor: "#f0ebe0" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ background: "#d29c3c" }}>
                            {m.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#1b110b" }}>{m.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}>{m.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        {editingId === m.id ? (
                          <Select value={editRole} onValueChange={setEditRole}>
                            <SelectTrigger className="w-[180px] text-xs h-8" style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r] ?? r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#262b2e", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {ROLE_LABELS[m.role ?? "user"] ?? m.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080" }}>
                        {m.lastSignedIn ? new Date(m.lastSignedIn).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === m.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => updateRole.mutate({ userId: m.id, role: editRole as any })} className="p-1.5 rounded bg-green-50 hover:bg-green-100 transition-colors">
                              <Check size={13} style={{ color: "#16a34a" }} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded hover:bg-gray-100 transition-colors text-xs" style={{ color: "#7a6e62" }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingId(m.id); setEditRole(m.role ?? "user"); }} className="p-1.5 rounded hover:bg-[#f5e9cc] transition-colors">
                            <Edit2 size={13} style={{ color: "#d29c3c" }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="rounded-md px-5 py-4" style={{ background: "#f5e9cc", border: "1px solid #e8c87a" }}>
          <div className="flex items-start gap-3">
            <ShieldCheck size={16} style={{ color: "#d29c3c", flexShrink: 0, marginTop: "1px" }} />
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "12px", color: "#1b110b", marginBottom: "4px" }}>Role-Based Access Control</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}>
                Assign appropriate roles to control what each user can see and do in the portal. SLS Admin has full access. Client roles have read-only access to their assigned projects.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
