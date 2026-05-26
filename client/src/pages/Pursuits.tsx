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
  Pencil,
  Clock,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Briefcase,
  HardHat,
  Landmark,
  BarChart2,
  Download,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

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
  const [fileName, setFileName] = useState("");
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [previewDisplayHeaders, setPreviewDisplayHeaders] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const importMutation = trpc.pursuits.bulkImport.useMutation({
    onSuccess: (data) => {
      utils.pursuits.list.invalidate();
      utils.pursuits.stats.invalidate();
      toast.success(`${data.imported} records imported to Chase List!`);
      onImported();
      onClose();
      resetState();
    },
    onError: (e) => toast.error("Import failed", { description: e.message }),
  });

  function resetState() {
    setFileName("");
    setAllRows([]);
    setPreview([]);
    setPreviewHeaders([]);
    setPreviewDisplayHeaders([]);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function parseRowsFromSheet(XLSX: any, workbook: any) {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // Convert to raw 2D array first so we can find the real header row
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (raw.length === 0) { setError("The spreadsheet appears to be empty."); return; }

    // Find the first row that has at least 2 non-empty cells — that's the header row
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(raw.length, 10); i++) {
      const nonEmpty = raw[i].filter((c: any) => String(c ?? "").trim() !== "").length;
      if (nonEmpty >= 2) { headerRowIdx = i; break; }
    }

    const headerRow = raw[headerRowIdx].map((h: any) =>
      String(h ?? "").trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    );

    // Build data rows from everything after the header row, skip fully-empty rows
    const dataRows = raw.slice(headerRowIdx + 1).filter((row: any[]) =>
      row.some((c: any) => String(c ?? "").trim() !== "")
    );

    if (dataRows.length === 0) { setError("No data rows found after the header row."); return; }

    const normalized = dataRows.map((row: any[]) => {
      const out: Record<string, string> = {};
      headerRow.forEach((h: string, i: number) => {
        if (h) out[h] = String(row[i] ?? "").trim();
      });
      return out;
    });

    // Use the original (un-normalized) header row for display
    const displayHeaders = raw[headerRowIdx]
      .map((h: any) => String(h ?? "").trim())
      .filter((h: string) => h !== "")
      .slice(0, 7);

    setAllRows(normalized);
    setPreview(normalized.slice(0, 5));
    // Store display headers separately for the preview table
    setPreviewHeaders(displayHeaders.map((h: string) =>
      h.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    ));
    // Save display labels for column headers
    setPreviewDisplayHeaders(displayHeaders);
    setError("");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    import("xlsx").then(XLSX => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          parseRowsFromSheet(XLSX, workbook);
        } catch {
          setError("Could not read the file. Make sure it is a valid Excel or CSV file.");
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => { setError("Failed to read file."); setLoading(false); };
      if (ext === "csv" || ext === "txt") {
        reader.readAsText(file);
        // Re-parse as text for CSV
        reader.onload = (ev) => {
          try {
            const text = ev.target?.result as string;
            const wb = XLSX.read(text, { type: "string" });
            parseRowsFromSheet(XLSX, wb);
          } catch {
            setError("Could not parse the CSV file.");
          } finally {
            setLoading(false);
          }
        };
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  function downloadSampleTemplate() {
    import("xlsx").then(XLSX => {
      const sampleData = [
        [
          "Company Name", "Project Name", "Project Type", "Market Sector",
          "City", "State", "Stage", "Priority", "Source",
          "Estimated Value", "Primary Contact Name", "Primary Contact Email",
          "Primary Contact Phone", "Owner Name", "Architect Name",
          "General Contractor", "Notes"
        ],
        [
          "Cousins Properties", "Buckhead Tower Renovation", "Office", "Commercial Real Estate",
          "Atlanta", "GA", "Design", "High", "Referral",
          "2500000", "Sarah Mitchell", "smitchell@cousins.com",
          "404-555-0101", "Cousins Properties", "Perkins+Will",
          "Brasfield & Gorrie", "Spec lighting for floors 12-18. Decision Q3."
        ],
        [
          "Portman Holdings", "Peachtree Center Hotel", "Hospitality", "Hotel",
          "Atlanta", "GA", "Early Planning", "Medium", "Cold Outreach",
          "850000", "James Portman", "jportman@portman.com",
          "404-555-0202", "Portman Holdings", "HKS Architects",
          "Holder Construction", "Full hotel lighting package. RFP expected Jan."
        ],
        [
          "JLL", "Midtown Mixed-Use Development", "Mixed-Use", "Commercial Real Estate",
          "Nashville", "TN", "Pricing", "High", "Plan Room",
          "1200000", "Karen Ellis", "kellis@jll.com",
          "615-555-0303", "JLL", "Gresham Smith",
          "Turner Construction", "Retail podium + 3 office floors. Bid due 45 days."
        ],
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sampleData);

      // Style the header row width
      ws["!cols"] = sampleData[0].map(() => ({ wch: 22 }));

      XLSX.utils.book_append_sheet(wb, ws, "Chase List");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SLS_Chase_List_Template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleImport() {
    if (allRows.length === 0) return;
    const mapped = allRows
      .filter(r => {
        // Skip rows where every value is empty
        return Object.values(r).some(v => v && String(v).trim() !== "");
      })
      .map(r => {
        // Resolve company name — handles 'Name', 'Company Name', 'Company', 'Account', etc.
        const companyName =
          r.name || r.company_name || r.company || r.companyname ||
          r.account || r.account_name || r.organization || r.firm || "";

        // Resolve project name — if there's no dedicated project column, use company name
        const projectName =
          r.project_name || r.project || r.projectname ||
          r.opportunity || r.opportunity_name || r.deal || companyName || "";

        // Resolve type — handles 'Type', 'Project Type', 'Company Type', 'Firm Type'
        const projectType =
          r.type || r.project_type || r.company_type || r.firm_type ||
          r.account_type || r.category || undefined;

        // Roles to Target → notes (best fit for this field)
        const rolesNote = r.roles_to_target || r.roles || r.target_roles || undefined;

        return {
          companyName: companyName || "Unknown",
          projectName: projectName || companyName || "Unnamed",
          projectType,
          marketSector: r.market_sector || r.sector || r.vertical || r.industry || undefined,
          city: r.city || r.location || undefined,
          state: r.state || r.st || undefined,
          stage: r.stage || r.pipeline_stage || r.status || undefined,
          priority: r.priority || undefined,
          source: r.source || r.lead_source || undefined,
          estimatedValue: r.estimated_value || r.value || r.amount || r.deal_value || undefined,
          primaryContactName: r.primary_contact_name || r.contact_name || r.contact || r.primary_contact || undefined,
          primaryContactEmail: r.primary_contact_email || r.email || r.contact_email || undefined,
          primaryContactPhone: r.primary_contact_phone || r.phone || r.contact_phone || undefined,
          ownerName: r.owner_name || r.owner || r.rep || r.sales_rep || undefined,
          architectName: r.architect_name || r.architect || undefined,
          generalContractorName: r.gc_name || r.general_contractor || r.gc || undefined,
          notes: rolesNote
            ? `Roles to Target: ${rolesNote}${r.notes ? " | " + r.notes : ""}`
            : r.notes || r.description || r.comments || undefined,
        };
      })
      // Only drop rows with no company name at all
      .filter(r => r.companyName !== "Unknown" || r.projectName !== "Unnamed");

    importMutation.mutate({ rows: mapped });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); resetState(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Import Chase List
            </DialogTitle>
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors hover:bg-[#fdf8ef] hover:border-[#d29c3c] hover:text-[#d29c3c]"
              style={{ fontFamily: "Inter, sans-serif", borderColor: "#e6dec2", color: "#7a6e62" }}
            >
              <Download size={12} />
              Download Template
            </button>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-2">

          {/* File drop zone */}
          <div>
            <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-lg border-2 border-dashed transition-colors hover:border-[#d29c3c] hover:bg-[#fdf8ef]"
              style={{ borderColor: fileName ? "#d29c3c" : "#e6dec2", background: fileName ? "#fdf8ef" : undefined }}
            >
              {loading ? (
                <><div className="w-5 h-5 border-2 border-[#d29c3c] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs" style={{ fontFamily: "Inter, sans-serif", color: "#7a6e62" }}>Reading file...</span></>
              ) : fileName ? (
                <><FileText size={20} style={{ color: "#d29c3c" }} />
                <span className="text-sm font-semibold" style={{ fontFamily: "Inter, sans-serif", color: "#1b110b" }}>{fileName}</span>
                <span className="text-xs" style={{ fontFamily: "Inter, sans-serif", color: "#7a6e62" }}>{allRows.length} rows detected — click to change file</span></>
              ) : (
                <><Upload size={20} style={{ color: "#d29c3c" }} />
                <span className="text-sm font-semibold" style={{ fontFamily: "Inter, sans-serif", color: "#1b110b" }}>Click to upload your Chase List</span>
                <span className="text-xs" style={{ fontFamily: "Inter, sans-serif", color: "#7a6e62" }}>Supports Excel (.xls, .xlsx) files</span></>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600" style={{ fontFamily: "Inter, sans-serif" }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ fontFamily: "Inter, sans-serif", color: "#1b110b" }}>Preview — first 5 of {allRows.length} rows</span>
                <span className="text-xs" style={{ fontFamily: "Inter, sans-serif", color: "#7a6e62" }}>Showing first 7 columns</span>
              </div>
              <div className="overflow-x-auto rounded border" style={{ borderColor: "#e6dec2" }}>
                <table className="text-xs w-full">
                  <thead style={{ background: "#f9f6f0" }}>
                    <tr>
                      {(previewDisplayHeaders.length > 0 ? previewDisplayHeaders : previewHeaders).map((k, idx) => (
                        <th key={idx} className="px-2 py-1.5 text-left whitespace-nowrap" style={{ fontFamily: "Inter, sans-serif", color: "#7a6e62", fontWeight: 600 }}>{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: "#f0ebe0" }}>
                        {previewHeaders.map((h, j) => (
                          <td key={j} className="px-2 py-1.5 truncate max-w-[140px]" style={{ fontFamily: "Inter, sans-serif", color: "#1b110b" }}>{row[h] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs mt-2" style={{ fontFamily: "Inter, sans-serif", color: "#7a6e62" }}>
                Column names are auto-mapped. Common field names like <em>company</em>, <em>project</em>, <em>value</em>, <em>owner</em>, <em>stage</em> are all recognized.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { onClose(); resetState(); }} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px" }}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={allRows.length === 0 || importMutation.isPending}
              style={{ background: allRows.length > 0 ? "#d29c3c" : undefined, color: allRows.length > 0 ? "#fff" : undefined, fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600 }}
            >
              {importMutation.isPending ? "Importing..." : allRows.length > 0 ? `Import ${allRows.length} Records` : "Select a File"}
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
  const [drawerPursuitId, setDrawerPursuitId] = useState<number | null>(null);

  const { data: pursuitList, isLoading, refetch } = trpc.pursuits.list.useQuery({});
  const { data: stats } = trpc.pursuits.stats.useQuery();
  const { data: drawerDetail, isLoading: drawerLoading } = trpc.pursuits.get.useQuery(
    { id: drawerPursuitId! },
    { enabled: drawerPursuitId !== null }
  );

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
        <PageHeader title="Chase List" subtitle="CRM Pipeline" />
        <div className="p-6">
          <EmptyState icon={<Target size={48} />} title="Access Restricted" description="This section is for internal SLS team members only." />
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Chase List"
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
              <Upload size={13} className="mr-1.5" /> Import Excel
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
                  ? "Add your first pursuit manually or import a list from Excel to start tracking your pipeline."
                  : "Try adjusting your search or filters."}
              />
              {pursuitList?.length === 0 && (
                <div className="flex gap-2 mt-4 justify-center">
                  <Button size="sm" onClick={() => setShowForm(true)} style={{ background: "#d29c3c", color: "#fff", fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600 }}>
                    <Plus size={13} className="mr-1.5" /> Add Pursuit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowImport(true)} style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", borderColor: "#e6dec2" }}>
                    <Upload size={13} className="mr-1.5" /> Import Excel
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
                      <tr
                      key={p.id}
                      className="border-b hover:bg-[#fdf8ef] transition-colors cursor-pointer"
                      style={{ borderColor: "#f0ebe0" }}
                      onClick={(e) => {
                        // Don't open drawer if clicking action buttons
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('[role="alertdialog"]')) return;
                        setDrawerPursuitId(p.id);
                      }}
                    >
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

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      <Sheet open={drawerPursuitId !== null} onOpenChange={(v) => { if (!v) setDrawerPursuitId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          {drawerLoading || !drawerDetail ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#d29c3c] border-t-transparent rounded-full animate-spin" />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}>Loading details…</span>
              </div>
            </div>
          ) : (
            <PursuitDetailDrawer
              pursuit={drawerDetail}
              onEdit={() => {
                setEditTarget(drawerDetail);
                setDrawerPursuitId(null);
                setShowForm(true);
              }}
              onClose={() => setDrawerPursuitId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Detail Drawer Content ────────────────────────────────────────────────────
function PursuitDetailDrawer({ pursuit, onEdit, onClose }: { pursuit: any; onEdit: () => void; onClose: () => void }) {
  const stageColor = STAGE_COLORS[pursuit.stage] ?? STAGE_COLORS.identified;
  const prioColor = PRIORITY_COLORS[pursuit.priority] ?? PRIORITY_COLORS.medium;

  function Row({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        {icon && <span className="mt-0.5 flex-shrink-0" style={{ color: "#d29c3c" }}>{icon}</span>}
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#a09080", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>{label}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#1b110b", wordBreak: "break-word" }}>{value}</div>
        </div>
      </div>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="mb-5">
        <div className="px-6 py-2 mb-1" style={{ background: "#f9f6f0", borderTop: "1px solid #e6dec2", borderBottom: "1px solid #e6dec2" }}>
          <span style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "11px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</span>
        </div>
        <div className="px-6">{children}</div>
      </div>
    );
  }

  const activityTypeIcons: Record<string, React.ReactNode> = {
    note: <FileText size={13} />,
    call: <Phone size={13} />,
    email: <Mail size={13} />,
    meeting: <User size={13} />,
    follow_up: <Clock size={13} />,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 flex-shrink-0" style={{ background: "#1b110b", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "18px", color: "#d29c3c", textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.2 }}>
              {pursuit.companyName}
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.75)", marginTop: "4px" }}>{pursuit.projectName}</div>
            {(pursuit.city || pursuit.state) && (
              <div className="flex items-center gap-1 mt-2" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                <MapPin size={11} />
                {[pursuit.city, pursuit.state].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
            <X size={16} style={{ color: "rgba(255,255,255,0.6)" }} />
          </button>
        </div>

        {/* Stage + Priority badges */}
        <div className="flex items-center gap-2 mt-4">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: stageColor.bg, color: stageColor.text, fontFamily: "Inter, sans-serif" }}>
            {STAGE_LABELS[pursuit.stage] ?? pursuit.stage}
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize" style={{ background: prioColor.bg, color: prioColor.text, fontFamily: "Inter, sans-serif" }}>
            {pursuit.priority} priority
          </span>
          {pursuit.winProbability != null && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(210,156,60,0.15)", color: "#d29c3c", fontFamily: "Inter, sans-serif" }}>
              {pursuit.winProbability}% win probability
            </span>
          )}
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{ background: "rgba(210,156,60,0.15)", color: "#d29c3c", border: "1px solid rgba(210,156,60,0.3)", fontFamily: "Inter, sans-serif" }}
        >
          <Pencil size={12} /> Edit Pursuit
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Financials strip */}
        <div className="grid grid-cols-3 divide-x divide-[#e6dec2]" style={{ borderBottom: "1px solid #e6dec2" }}>
          {[
            { label: "Project Value", value: fmt$(pursuit.estimatedValue) },
            { label: "Lighting Value", value: fmt$(pursuit.estimatedLightingValue) },
            { label: "Expected Close", value: pursuit.expectedCloseDate ? new Date(pursuit.expectedCloseDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
          ].map(item => (
            <div key={item.label} className="px-4 py-3 text-center">
              <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "14px", color: "#1b110b" }}>{item.value}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "9px", color: "#a09080", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "2px" }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Project Details */}
        <Section title="Project Details">
          <Row label="Project Type" value={pursuit.projectType} icon={<Briefcase size={14} />} />
          <Row label="Market Sector" value={pursuit.marketSector} icon={<BarChart2 size={14} />} />
          <Row label="Source" value={pursuit.source ? SOURCE_LABELS[pursuit.source] : null} icon={<Target size={14} />} />
          <Row label="Next Follow-Up" value={pursuit.nextFollowUpDate ? new Date(pursuit.nextFollowUpDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null} icon={<Calendar size={14} />} />
          <Row label="Next Step" value={pursuit.nextStep} icon={<ChevronRight size={14} />} />
        </Section>

        {/* Primary Contact */}
        {(pursuit.primaryContactName || pursuit.primaryContactEmail || pursuit.primaryContactPhone) && (
          <Section title="Primary Contact">
            <Row label="Name" value={pursuit.primaryContactName} icon={<User size={14} />} />
            <Row label="Title" value={pursuit.primaryContactTitle} />
            {pursuit.primaryContactEmail && (
              <div className="flex items-start gap-3 py-2">
                <span className="mt-0.5 flex-shrink-0" style={{ color: "#d29c3c" }}><Mail size={14} /></span>
                <div className="flex-1">
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#a09080", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>Email</div>
                  <a href={`mailto:${pursuit.primaryContactEmail}`} className="hover:text-[#d29c3c] transition-colors" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#1b110b" }}>
                    {pursuit.primaryContactEmail}
                  </a>
                </div>
              </div>
            )}
            {pursuit.primaryContactPhone && (
              <div className="flex items-start gap-3 py-2">
                <span className="mt-0.5 flex-shrink-0" style={{ color: "#d29c3c" }}><Phone size={14} /></span>
                <div className="flex-1">
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#a09080", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>Phone</div>
                  <a href={`tel:${pursuit.primaryContactPhone}`} className="hover:text-[#d29c3c] transition-colors" style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#1b110b" }}>
                    {pursuit.primaryContactPhone}
                  </a>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Key Stakeholders */}
        {(pursuit.ownerName || pursuit.architectName || pursuit.generalContractorName) && (
          <Section title="Key Stakeholders">
            <Row label="Owner / Developer" value={pursuit.ownerName} icon={<Landmark size={14} />} />
            <Row label="Architect / Designer" value={pursuit.architectName} icon={<Building2 size={14} />} />
            <Row label="General Contractor" value={pursuit.generalContractorName} icon={<HardHat size={14} />} />
          </Section>
        )}

        {/* Notes */}
        {pursuit.notes && (
          <Section title="Notes">
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#1b110b", lineHeight: 1.7, paddingTop: "8px", paddingBottom: "8px" }}>
              {pursuit.notes}
            </p>
          </Section>
        )}

        {/* Activity Timeline */}
        <Section title={`Activity (${(pursuit.activities ?? []).length})`}>
          {(pursuit.activities ?? []).length === 0 ? (
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a09080", padding: "12px 0" }}>No activity logged yet.</p>
          ) : (
            <div className="space-y-3 py-2">
              {(pursuit.activities ?? []).map((act: any) => (
                <div key={act.id} className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#f9f6f0", border: "1px solid #e6dec2", color: "#d29c3c" }}>
                    {activityTypeIcons[act.type] ?? <MessageSquare size={13} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#1b110b" }}>{act.title}</span>
                      {act.userName && <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#a09080" }}>by {act.userName}</span>}
                    </div>
                    {act.body && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62", marginTop: "2px", lineHeight: 1.5 }}>{act.body}</p>}
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: "#c8bfb0", marginTop: "3px" }}>
                      {new Date(act.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Metadata footer */}
        <div className="px-6 py-4 text-xs" style={{ borderTop: "1px solid #e6dec2", fontFamily: "Inter, sans-serif", color: "#a09080" }}>
          Added {new Date(pursuit.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          {pursuit.updatedAt && ` · Updated ${new Date(pursuit.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
        </div>
      </div>
    </div>
  );
}
