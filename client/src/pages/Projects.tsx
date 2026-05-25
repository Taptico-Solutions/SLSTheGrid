import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, StatusBadge, EmptyState, GoldButton, LoadingSpinner } from "@/components/SLSComponents";
import { Building2, Plus, Search, Filter } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function formatCurrency(val?: string | null) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function Projects() {
  const { user } = useAuth();
  const isInternal = ["sls_admin", "sls_rep", "sls_pm", "admin"].includes(user?.role ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery({});
  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); toast.success("Project created successfully"); },
    onError: () => toast.error("Failed to create project"),
  });

  const filtered = (projects ?? []).filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.city ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const [form, setForm] = useState({
    name: "", description: "", region: "georgia" as const, buildingType: "",
    address: "", city: "", state: "", originalBudget: "",
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    createProject.mutate({ ...form, region: form.region as any });
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Projects"
        subtitle="All lighting projects across Georgia, Tennessee, Alabama & National Accounts"
        actions={
          isInternal ? (
            <GoldButton variant="filled" onClick={() => setShowCreate(true)}>
              <span className="flex items-center gap-1.5"><Plus size={14} /> New Project</span>
            </GoldButton>
          ) : undefined
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#a09080" }} />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 text-sm"
              style={{ fontFamily: "Inter, sans-serif", borderColor: "#e8e3d8" }}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] text-sm" style={{ fontFamily: "Inter, sans-serif", borderColor: "#e8e3d8" }}>
              <Filter size={12} className="mr-1" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="intake">Intake</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a09080" }}>
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Project Grid */}
        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 size={48} />}
            title="No Projects Found"
            description={search ? "Try adjusting your search or filters." : "Projects will appear here once created."}
            action={isInternal ? <GoldButton variant="filled" onClick={() => setShowCreate(true)}>Create First Project</GoldButton> : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((proj) => (
              <Link key={proj.id} href={`/projects/${proj.id}`}>
                <div className="sls-card p-5 cursor-pointer h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: "#f5e9cc" }}>
                      <Building2 size={16} style={{ color: "#d29c3c" }} />
                    </div>
                    <StatusBadge status={proj.status} />
                  </div>
                  <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "15px", color: "#1b110b", marginBottom: "4px" }}>
                    {proj.name}
                  </h3>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62", marginBottom: "12px", flex: 1 }}>
                    {proj.city ? `${proj.city}, ` : ""}{proj.state ?? proj.region ?? ""}
                    {proj.buildingType ? ` · ${proj.buildingType}` : ""}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "#f0ebe0" }}>
                    <div className="flex gap-2">
                      <StatusBadge status={proj.timelineStatus ?? "on_track"} />
                      <StatusBadge status={proj.budgetStatus ?? "on_budget"} />
                    </div>
                    {proj.currentBudget && (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#262b2e" }}>
                        {formatCurrency(proj.currentBudget)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#1b110b" }}>
              New Project
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Project Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Midtown Office Tower" required style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Atlanta" style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} />
              </div>
              <div>
                <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>State</Label>
                <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="GA" style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Region</Label>
                <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v as any }))}>
                  <SelectTrigger style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="georgia">Georgia</SelectItem>
                    <SelectItem value="tennessee">Tennessee</SelectItem>
                    <SelectItem value="alabama">Alabama</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Building Type</Label>
                <Input value={form.buildingType} onChange={e => setForm(f => ({ ...f, buildingType: e.target.value }))} placeholder="Office, Retail, Hotel..." style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} />
              </div>
            </div>
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Budget ($)</Label>
              <Input value={form.originalBudget} onChange={e => setForm(f => ({ ...f, originalBudget: e.target.value }))} placeholder="250000" type="number" style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} />
            </div>
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Description</Label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief project description..."
                rows={3}
                className="w-full px-3 py-2 rounded-md text-sm resize-none"
                style={{ border: "1px solid #e8e3d8", fontFamily: "Inter, sans-serif", outline: "none" }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GoldButton onClick={() => setShowCreate(false)}>Cancel</GoldButton>
              <GoldButton variant="filled" type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </GoldButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
