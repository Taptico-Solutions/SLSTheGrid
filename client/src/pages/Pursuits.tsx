import { useState, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, EmptyState, LoadingSpinner } from "@/components/SLSComponents";
import {
  Target,
  Plus,
  Search,
  Upload,
  Edit2,
  Trash2,
  ChevronDown,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  X,
  Check,
  AlertCircle,
  TrendingUp,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  identified: "Identified",
  qualifying: "Qualifying",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  on_hold: "On Hold",
};

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  identified: { bg: "#f0f4ff", text: "#3b5bdb" },
  qualifying: { bg: "#fff8e1", text: "#e67700" },
  proposal: { bg: "#e8f4fd", text: "#1971c2" },
  negotiation: { bg: "#f3e8ff", text: "#7c3aed" },
  won: { bg: "#dcfce7", text: "#16a34a" },
  lost: { bg: "#fef2f2", text: "#dc2626" },
  on_hold: { bg: "#f3f4f6", text: "#6b7280" },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "#f3f4f6", text: "#6b7280" },
  medium: { bg: "#fff8e1", text: "#e67700" },
  high: { bg: "#fff1f0", text: "#cf1322" },
  critical: { bg: "#4a0000", text: "#ffffff" },
};

const SOURCE_LABELS: Record<string, string> = {
  referral: "Referral",
  cold_outreach: "Cold Outreach",
  inbound: "Inbound",
  trade_show: "Trade Show",
  existing_client: "Existing Client",
  architect_spec: "Architect Spec",
  gc_relationship: "GC Relationship",
  permit_data: "Permit Data",
  other: "Other",
};

function fmt$(val: string | null | undefined) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

// ─── Pursuit Form Modal ───────────────────────────────────────────────────────
interface PursuitFormProps {
  open: boolean;
  onClose: () => void;
  initial?: any;
  onSaved: () => void;
}

function PursuitFormModal({ open, onClose, initial, onSaved }: PursuitFormProps) {
  const utils = trpc.useUtils();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    companyName: initial?.companyName ?? "",
    projectName: initial?.projectName ?? "",
    projectType: initial?.projectType ?? "",
    marketSector: initial?.marketSector ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    stage: initial?.stage ?? "identified",
    priority: initial?.priority ?? "medium",
    source: initial?.source ?? "other",
    estimatedValue: initial?.estimatedValue ?? "",
    estimatedLightingValue: initial?.estimatedLightingValue ?? "",
    primaryContactName: initial?.primaryContactName ?? "",
    primaryContactTitle: initial?.primaryContactTitle ?? "",
    primaryContactEmail: initial?.primaryContactEmail ?? "",
    primaryContactPhone: initial?.primaryContactPhone ?? "",
    ownerName: initial?.ownerName ?? "",
    architectName: initial?.architectName ?? "",
    generalContractorName: initial?.generalContractorName ?? "",
    expectedCloseDate: initial?.expectedCloseDate ?? "",
    nextFollowUpDate: initial?.nextFollowUpDate ?? "",
    notes: initial?.notes ?? "",
    nextStep: initial?.nextStep ?? "",
    winProbability: initial?.winProbability ?? 50,
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const createMutation = trpc.pursuits.create.useMutation({
    onSuccess: () => { utils.pursuits.list.invalidate(); utils.pursuits.stats.invalidate(); toast.success("Pursuit added!"); onSaved(); onClose(); },
    onError: (e) => toast.error("Failed to save", { description: e.message }),
  });
  const updateMutation = trpc.pursuits.update.useMutation({
    onSuccess: () => { utils.pursuits.list.invalidate(); utils.pursuits.stats.invalidate(); toast.success("Pursuit updated!"); onSaved(); onClose(); },
    onError: (e) => toast.error("Failed to update", { description: e.message }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      estimatedValue: form.estimatedValue || undefined,
      estimatedLightingValue: form.estimatedLightingValue || undefined,
      winProbability: Number(form.winProbability),
    };
    if (isEdit) {
      updateMutation.mutate({ id: initial.id, ...payload });
    } else {
      createMutation.mutate(payload as any);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const fieldStyle = { fontFamily: "Inter, sans-serif", fontSize: "12px" };
  const labelStyle = { fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#1b110b", textTransform: "uppercase" as const, letterSpacing: "0.06em" };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {isEdit ? "Edit Pursuit" : "Add New Pursuit"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Project Identity */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#d29c3c", fontFamily: "Inter, sans-serif" }}>Project Identity</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label style={labelStyle}>Company Name *</Label>
                <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} required style={fieldStyle} className="mt-1" placeholder="e.g. Cousins Properties" />
              </div>
              <div>
                <Label style={labelStyle}>Project Name *</Label>
                <Input value={form.projectName} onChange={e => set("projectName", e.target.value)} required style={fieldStyle} className="mt-1" placeholder="e.g. Buckhead Office Tower" />
              </div>
              <div>
                <Label style={labelStyle}>Project Type</Label>
                <Input value={form.projectType} onChange={e => set("projectType", e.target.value)} style={fieldStyle} className="mt-1" placeholder="e.g. Office, Hospitality, Retail" />
              </div>
              <div>
                <Label style={labelStyle}>Market Sector</Label>
                <Input value={form.marketSector} onChange={e => set("marketSector", e.target.value)} style={fieldStyle} className="mt-1" placeholder="e.g. Commercial, Healthcare" />
              </div>
              <div>
                <Label style={labelStyle}>City</Label>
                <Input value={form.city} onChange={e => set("city", e.target.value)} style={fieldStyle} className="mt-1" placeholder="Atlanta" />
              </div>
              <div>
                <Label style={labelStyle}>State</Label>
                <Input value={form.state} onChange={e => set("state", e.target.value)} style={fieldStyle} className="mt-1" placeholder="GA" />
              </div>
            </div>
          </div>

          {/* Stage & Priority */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#d29c3c", fontFamily: "Inter, sans-serif" }}>Pipeline Status</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label style={labelStyle}>Stage</Label>
                <Select value={form.stage} onValueChange={v => set("stage", v)}>
                  <SelectTrigger className="mt-1 text-xs" style={fieldStyle}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_LABELS).map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label style={labelStyle}>Priority</Label>
                <Select value={form.priority} onValueChange={v => set("priority", v)}>
                  <SelectTrigger className="mt-1 text-xs" style={fieldStyle}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map(v => <SelectItem key={v} value={v} className="text-xs capitalize">{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label style={labelStyle}>Source</Label>
                <Select value={form.source} onValueChange={v => set("source", v)}>
                  <SelectTrigger className="mt-1 text-xs" style={fieldStyle}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABELS).map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#d29c3c", fontFamily: "Inter, sans-serif" }}>Financials & Timing</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label style={labelStyle}>Est. Project Value</Label>
                <Input value={form.estimatedValue} onChange={e => set("estimatedValue", e.target.value)} style={fieldStyle} className="mt-1" placeholder="2500000" type="number" />
              </div>
              <div>
                <Label style={labelStyle}>Est. Lighting Value</Label>
                <Input value={form.estimatedLightingValue} onChange={e => set("estimatedLightingValue", e.target.value)} style={fieldStyle} className="mt-1" placeholder="180000" type="number" />
              </div>
              <div>
                <Label style={labelStyle}>Win Probability %</Label>
                <Input value={form.winProbability} onChange={e => set("winProbability", e.target.value)} style={fieldStyle} className="mt-1" type="number" min={0} max={100} />
              </div>
              <div>
                <Label style={labelStyle}>Expected Close Date</Label>
                <Input value={form.expectedCloseDate} onChange={e => set("expectedCloseDate", e.target.value)} style={fieldStyle} className="mt-1" type="date" />
              </div>
              <div>
                <Label style={labelStyle}>Next Follow-Up</Label>
                <Input value={form.nextFollowUpDate} onChange={e => set("nextFollowUpDate", e.target.value)} style={fieldStyle} className="mt-1" type="date" />
              </div>
            </div>
          </div>

          {/* Key Contacts */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#d29c3c", fontFamily: "Inter, sans-serif" }}>Key Contacts</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label style={labelStyle}>Primary Contact Name</Label>
                <Input value={form.primaryContactName} onChange={e => set("primaryContactName", e.target.value)} style={fieldStyle} className="mt-1" placeholder="Jane Smith" />
              </div>
              <div>
                <Label style={labelStyle}>Title</Label>
                <Input value={form.primaryContactTitle} onChange={e => set("primaryContactTitle", e.target.value)} style={fieldStyle} className="mt-1" placeholder="VP Real Estate" />
              </div>
              <div>
                <Label style={labelStyle}>Email</Label>
                <Input value={form.primaryContactEmail} onChange={e => set("primaryContactEmail", e.target.value)} style={fieldStyle} className="mt-1" type="email" placeholder="jane@company.com" />
              </div>
              <div>
                <Label style={labelStyle}>Phone</Label>
                <Input value={form.primaryContactPhone} onChange={e => set("primaryContactPhone", e.target.value)} style={fieldStyle} className="mt-1" placeholder="(404) 555-0100" />
              </div>
              <div>
                <Label style={labelStyle}>Owner / Developer</Label>
                <Input value={form.ownerName} onChange={e => set("ownerName", e.target.value)} style={fieldStyle} className="mt-1" placeholder="Cousins Properties" />
              </div>
              <div>
                <Label style={labelStyle}>Architect / Designer</Label>
                <Input value={form.architectName} onChange={e => set("architectName", e.target.value)} style={fieldStyle} className="mt-1" placeholder="HKS Architects" />
              </div>
              <div>
                <Label style={labelStyle}>General Contractor</Label>
                <Input value={form.generalContractorName} onChange={e => set("generalContractorName", e.target.value)} style={fieldStyle} className="mt-1" placeholder="Brasfield & Gorrie" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#d29c3c", fontFamily: "Inter, sans-serif" }}>Notes & Next Steps</div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label style={labelStyle}>Notes</Label>
                <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} style={fieldStyle} className="mt-1" rows={3} placeholder="Background, relationship history, context..." />
              </div>
              <div>
                <Label style={labelStyle}>Next Step</Label>
                <Input value={form.nextStep} onChange={e => set("nextStep", e.target.value)} style={fieldStyle} className="mt-1" placeholder="e.g. Schedule spec meeting with architect" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px" }}>Cancel</Button>
            <Button type="submit" disabled={isPending} style={{ background: "#d29c3c", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600 }}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Pursuit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────
function CSVImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const importMutation = trpc.pursuits.bulkImport.useMutation({
    onSuccess: (data) => {
      utils.pursuits.list.invalidate();
      utils.pursuits.stats.invalidate();
      toast.success(`${data.imported} pursuits imported!`);
      onImported();
      onClose();
    },
    onError: (e) => toast.error("Import failed", { description: e.message }),
  });

  function parseCSV(text: string) {
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) { setError("CSV must have a header row and at least one data row."); return; }
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return obj;
    });
    setPreview(rows.slice(0, 5));
    setError("");
    return rows;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  }

  function handleImport() {
    const rows = parseCSV(csvText);
    if (!rows || rows.length === 0) return;
    const mapped = rows.map(r => ({
      companyName: r.company_name || r.company || r.companyname || "Unknown Company",
      projectName: r.project_name || r.project || r.projectname || "Unnamed Project",
      projectType: r.project_type || r.type || undefined,
      marketSector: r.market_sector || r.sector || undefined,
      city: r.city || undefined,
      state: r.state || undefined,
      stage: r.stage || undefined,
      priority: r.priority || undefined,
      source: r.source || undefined,
      estimatedValue: r.estimated_value || r.value || undefined,
      primaryContactName: r.primary_contact_name || r.contact_name || r.contact || undefined,
      primaryContactEmail: r.primary_contact_email || r.email || undefined,
      primaryContactPhone: r.primary_contact_phone || r.phone || undefined,
      ownerName: r.owner_name || r.owner || undefined,
      architectName: r.architect_name || r.architect || undefined,
      generalContractorName: r.gc_name || r.general_contractor || r.gc || undefined,
      notes: r.notes || undefined,
    })).filter(r => r.companyName && r.projectName);

    importMutation.mutate({ rows: mapped });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Import Pursuits from CSV
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg p-3 text-xs" style={{ background: "#f9f6f0", border: "1px solid #e6dec2", fontFamily: "Inter, sans-serif", color: "#7a6e62", lineHeight: 1.6 }}>
            <strong style={{ color: "#1b110b" }}>Expected columns (flexible mapping):</strong><br />
            <code>company_name, project_name, project_type, city, state, stage, priority, estimated_value, primary_contact_name, primary_contact_email, notes</code>
          </div>

          <div>
            <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Upload CSV File
            </Label>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-1 w-full flex items-center justify-center gap-2 py-6 rounded-lg border-2 border-dashed transition-colors hover:border-[#d29c3c] hover:bg-[#fdf8ef]"
              style={{ borderColor: "#e6dec2", fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}
            >
              <Upload size={16} style={{ color: "#d29c3c" }} />
              Click to upload CSV or drag and drop
            </button>
          </div>

          <div>
            <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Or Paste CSV Text
            </Label>
            <Textarea
              value={csvText}
              onChange={e => { setCsvText(e.target.value); parseCSV(e.target.value); }}
              className="mt-1 font-mono text-xs"
              rows={6}
              placeholder={"company_name,project_name,city,state,estimated_value\nCousins Properties,Buckhead Tower,Atlanta,GA,2500000"}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600" style={{ fontFamily: "Inter, sans-serif" }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {preview.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ fontFamily: "Inter, sans-serif", color: "#1b110b" }}>Preview (first 5 rows):</div>
              <div className="overflow-x-auto rounded border" style={{ borderColor: "#e6dec2" }}>
                <table className="text-xs w-full">
                  <thead style={{ background: "#f9f6f0" }}>
                    <tr>
                      {Object.keys(preview[0]).slice(0, 6).map(k => (
                        <th key={k} className="px-2 py-1.5 text-left" style={{ fontFamily: "Inter, sans-serif", color: "#7a6e62", fontWeight: 600 }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: "#f0ebe0" }}>
                        {Object.values(row).slice(0, 6).map((v: any, j) => (
                          <td key={j} className="px-2 py-1.5 truncate max-w-[120px]" style={{ fontFamily: "Inter, sans-serif", color: "#1b110b" }}>{v || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px" }}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={!csvText.trim() || importMutation.isPending}
              style={{ background: "#d29c3c", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600 }}
            >
              {importMutation.isPending ? "Importing..." : `Import ${preview.length > 0 ? "Pursuits" : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Pursuits() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);

  const { data: pursuitList, isLoading, refetch } = trpc.pursuits.list.useQuery({});
  const { data: stats } = trpc.pursuits.stats.useQuery();

  const deleteMutation = trpc.pursuits.delete.useMutation({
    onSuccess: () => { refetch(); utils.pursuits.stats.invalidate(); toast.success("Pursuit deleted."); },
    onError: (e) => toast.error("Delete failed", { description: e.message }),
  });

  const filtered = useMemo(() => {
    let rows = pursuitList ?? [];
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.companyName.toLowerCase().includes(s) ||
        r.projectName.toLowerCase().includes(s) ||
        (r.city ?? "").toLowerCase().includes(s) ||
        (r.primaryContactName ?? "").toLowerCase().includes(s)
      );
    }
    if (stageFilter !== "all") rows = rows.filter(r => r.stage === stageFilter);
    if (priorityFilter !== "all") rows = rows.filter(r => r.priority === priorityFilter);
    return rows;
  }, [pursuitList, search, stageFilter, priorityFilter]);

  const isInternal = ["sls_admin", "sls_rep", "sls_pm", "admin"].includes(user?.role ?? "");

  if (!isInternal) {
    return (
      <div className="page-enter">
        <PageHeader title="Pursuits" subtitle="CRM Pipeline" />
        <div className="p-6">
          <EmptyState icon={<Target size={48} />} title="Access Restricted" description="This section is for internal SLS team members only." />
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Pursuits"
        subtitle="CRM pipeline — track every commercial lighting opportunity from first signal to close"
      />

      <div className="p-6 space-y-5">
        {/* ── Stats Bar ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Pursuits", value: stats?.total ?? 0, icon: <Target size={16} /> },
            { label: "In Proposal", value: stats?.byStage?.["proposal"] ?? 0, icon: <FileText size={16} /> },
            { label: "In Negotiation", value: stats?.byStage?.["negotiation"] ?? 0, icon: <TrendingUp size={16} /> },
            { label: "Pipeline Value", value: stats?.totalValue ? fmt$(String(stats.totalValue)) : "$0", icon: <DollarSign size={16} /> },
          ].map(item => (
            <div key={item.label} className="sls-card px-4 py-3 flex items-center gap-3">
              <span style={{ color: "#d29c3c" }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "20px", color: "#1b110b" }}>{item.value}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters + Actions ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#a09080" }} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search company, project, city, contact…"
              className="pl-9 text-xs"
              style={{ fontFamily: "Inter, sans-serif", borderColor: "#e6dec2" }}
            />
          </div>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-36 text-xs" style={{ fontFamily: "Inter, sans-serif", borderColor: "#e6dec2" }}>
              <Filter size={12} className="mr-1.5" style={{ color: "#a09080" }} />
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Stages</SelectItem>
              {Object.entries(STAGE_LABELS).map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 text-xs" style={{ fontFamily: "Inter, sans-serif", borderColor: "#e6dec2" }}>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Priorities</SelectItem>
              {["low", "medium", "high", "critical"].map(v => <SelectItem key={v} value={v} className="text-xs capitalize">{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImport(true)}
              style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", borderColor: "#e6dec2", color: "#7a6e62" }}
            >
              <Upload size={13} className="mr-1.5" /> Import CSV
            </Button>
            <Button
              size="sm"
              onClick={() => { setEditTarget(null); setShowForm(true); }}
              style={{ background: "#d29c3c", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              <Plus size={13} className="mr-1.5" /> Add Pursuit
            </Button>
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <div className="sls-card overflow-hidden">
          {isLoading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={<Target size={48} />}
                title={pursuitList?.length === 0 ? "No Pursuits Yet" : "No Results"}
                description={pursuitList?.length === 0
                  ? "Add your first pursuit manually or import a list from CSV to start tracking your pipeline."
                  : "Try adjusting your search or filters."}
              />
              {pursuitList?.length === 0 && (
                <div className="flex gap-2 mt-4 justify-center">
                  <Button size="sm" onClick={() => setShowForm(true)} style={{ background: "#d29c3c", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600 }}>
                    <Plus size={13} className="mr-1.5" /> Add Pursuit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowImport(true)} style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", borderColor: "#e6dec2" }}>
                    <Upload size={13} className="mr-1.5" /> Import CSV
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#f9f6f0" }}>
                    {["Company / Project", "Location", "Stage", "Priority", "Est. Value", "Contact", "Follow-Up", "Actions"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e8e3d8" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const stageColor = STAGE_COLORS[p.stage] ?? STAGE_COLORS.identified;
                    const prioColor = PRIORITY_COLORS[p.priority] ?? PRIORITY_COLORS.medium;
                    return (
                      <tr key={p.id} className="border-b hover:bg-[#fdf8ef] transition-colors" style={{ borderColor: "#f0ebe0" }}>
                        <td className="px-4 py-3">
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#1b110b" }}>{p.companyName}</div>
                          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62", marginTop: "1px" }}>{p.projectName}</div>
                          {p.projectType && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a09080", marginTop: "1px" }}>{p.projectType}</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(p.city || p.state) ? (
                            <div className="flex items-center gap-1" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>
                              <MapPin size={11} />
                              {[p.city, p.state].filter(Boolean).join(", ")}
                            </div>
                          ) : <span style={{ color: "#c8bfb0" }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: stageColor.bg, color: stageColor.text, fontFamily: "Inter, sans-serif" }}>
                            {STAGE_LABELS[p.stage] ?? p.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap" style={{ background: prioColor.bg, color: prioColor.text, fontFamily: "Inter, sans-serif" }}>
                            {p.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#1b110b", fontWeight: 500 }}>
                          {fmt$(p.estimatedLightingValue ?? p.estimatedValue)}
                        </td>
                        <td className="px-4 py-3">
                          {p.primaryContactName ? (
                            <div>
                              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#1b110b" }}>{p.primaryContactName}</div>
                              {p.primaryContactEmail && (
                                <a href={`mailto:${p.primaryContactEmail}`} className="flex items-center gap-1 hover:text-[#d29c3c] transition-colors" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#7a6e62" }}>
                                  <Mail size={10} /> {p.primaryContactEmail}
                                </a>
                              )}
                            </div>
                          ) : <span style={{ color: "#c8bfb0", fontSize: "11px" }}>—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: p.nextFollowUpDate ? "#d29c3c" : "#c8bfb0" }}>
                          {p.nextFollowUpDate ? (
                            <div className="flex items-center gap-1">
                              <Calendar size={11} />
                              {new Date(p.nextFollowUpDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditTarget(p); setShowForm(true); }}
                              className="p-1.5 rounded hover:bg-[#f5e9cc] transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={13} style={{ color: "#d29c3c" }} />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="p-1.5 rounded hover:bg-red-50 transition-colors" title="Delete">
                                  <Trash2 size={13} style={{ color: "#dc2626" }} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this pursuit?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove <strong>{p.companyName} — {p.projectName}</strong> and all associated activity. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate({ id: p.id })} className="bg-red-600 hover:bg-red-700 text-white">
                                    Yes, Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Row count */}
        {filtered.length > 0 && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080" }}>
            Showing {filtered.length} of {pursuitList?.length ?? 0} pursuit{(pursuitList?.length ?? 0) !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Modals */}
      <PursuitFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null); }}
        initial={editTarget}
        onSaved={refetch}
      />
      <CSVImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={refetch}
      />
    </div>
  );
}
