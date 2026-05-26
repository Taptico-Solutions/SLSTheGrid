import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  ArrowDown,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Copy,
  ExternalLink,
  Flame,
  FolderPlus,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Radar,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/SLSComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const INTERNAL_ROLES = ["admin", "sls_admin", "sls_rep", "sls_pm"];

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "researching", label: "Researching" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "nurture", label: "Nurture" },
] as const;

const STAGE_OPTIONS = [
  { value: "early_planning", label: "Early Planning" },
  { value: "design", label: "Design" },
  { value: "pricing", label: "Pricing" },
  { value: "bidding", label: "Bidding" },
  { value: "awarded", label: "Awarded" },
  { value: "procurement", label: "Procurement" },
] as const;

const SIGNAL_TYPE_OPTIONS = [
  { value: "permit", label: "Permit" },
  { value: "plan_room", label: "Plan Room" },
  { value: "construction_start", label: "Construction Start" },
  { value: "architect_activity", label: "Architect Activity" },
  { value: "gc_award", label: "GC Award" },
  { value: "budget_approved", label: "Budget Approved" },
  { value: "renovation", label: "Renovation" },
  { value: "tenant_improvement", label: "Tenant Improvement" },
  { value: "hospitality_pipeline", label: "Hospitality Pipeline" },
  { value: "municipal_bid", label: "Municipal Bid" },
  { value: "relationship", label: "Relationship" },
  { value: "news", label: "News" },
] as const;

const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));
const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGE_OPTIONS.map((o) => [o.value, o.label]));
const SIGNAL_LABEL: Record<string, string> = Object.fromEntries(SIGNAL_TYPE_OPTIONS.map((o) => [o.value, o.label]));

type LeadStatus = (typeof STATUS_OPTIONS)[number]["value"];
type BuyingStage = (typeof STAGE_OPTIONS)[number]["value"];
type SignalType = (typeof SIGNAL_TYPE_OPTIONS)[number]["value"];

type OutreachTouch = { subject: string; body: string; sendDay: number; callToAction: string };
type OutreachSequence = {
  touch1: OutreachTouch;
  touch2: OutreachTouch;
  touch3: OutreachTouch;
  strategyNote: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function heatTone(score: number) {
  if (score >= 90) return "border-red-300 bg-red-50 text-red-700";
  if (score >= 80) return "border-orange-300 bg-orange-50 text-orange-700";
  if (score >= 70) return "border-[#d29c3c]/40 bg-[#fdf6e8] text-[#d29c3c]";
  return "border-[#e6dec2] bg-white text-[#1b110b]/70";
}

function statusVariant(status?: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (status === "qualified" || status === "won") return "default";
  if (status === "lost") return "destructive";
  if (status === "contacted" || status === "proposal") return "secondary";
  return "outline";
}

function statusStyle(status?: string | null): React.CSSProperties {
  if (status === "qualified" || status === "won") return { background: "#d29c3c", color: "#fff", border: "none" };
  if (status === "contacted" || status === "proposal") return { background: "#e6f0ff", color: "#1a56db", border: "none" };
  return {};
}

// ─── Lead form default ────────────────────────────────────────────────────────

const EMPTY_LEAD = {
  companyName: "",
  projectName: "",
  projectType: "",
  marketSector: "",
  location: "",
  status: "new" as LeadStatus,
  buyingStage: "early_planning" as BuyingStage,
  heatScore: 70,
  confidenceScore: 70,
  estimatedProjectValue: "",
  estimatedLightingValue: "",
  decisionWindow: "",
  expectedBidDate: "",
  expectedAwardDate: "",
  constructionStartDate: "",
  ownerName: "",
  architectName: "",
  generalContractorName: "",
  electricalEngineerName: "",
  primaryContactName: "",
  primaryContactTitle: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  primarySignal: "",
  sourceName: "",
  summary: "",
  recommendedNextStep: "",
  notes: "",
};

const EMPTY_SIGNAL = {
  type: "permit" as SignalType,
  title: "",
  description: "",
  signalDate: "",
  sourceName: "",
  confidenceScore: 70,
  impactScore: 80,
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProspectRadarPage() {
  const [, navigate] = useLocation();
  const { data: me, isLoading: meLoading } = trpc.auth.me.useQuery();
  const isInternal = !!me && INTERNAL_ROLES.includes(me.role);
  const utils = trpc.useUtils();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [minHeatScore, setMinHeatScore] = useState<70 | 80 | 90>(70);

  // Modal / sheet state
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<typeof EMPTY_LEAD & { id?: number } | null>(null);
  const [showSignalSheet, setShowSignalSheet] = useState(false);
  const [signalTargetId, setSignalTargetId] = useState<number | null>(null);
  const [showOutreach, setShowOutreach] = useState(false);
  const [outreachLeadId, setOutreachLeadId] = useState<number | null>(null);
  const [outreachData, setOutreachData] = useState<OutreachSequence | null>(null);
  const [copiedTouch, setCopiedTouch] = useState<string | null>(null);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [convertLeadId, setConvertLeadId] = useState<number | null>(null);

  // Lead form state
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD);
  // Signal form state
  const [signalForm, setSignalForm] = useState(EMPTY_SIGNAL);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const leadsQuery = trpc.prospectRadar.list.useQuery({ minHeatScore }, { enabled: isInternal });
  const selectedLeadId = selectedId ?? leadsQuery.data?.[0]?.id;
  const detailQuery = trpc.prospectRadar.get.useQuery(
    { id: selectedLeadId ?? 0 },
    { enabled: isInternal && !!selectedLeadId },
  );

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const loadDemo = trpc.prospectRadar.loadDemo.useMutation({
    onSuccess: () => utils.prospectRadar.list.invalidate(),
  });

  const createLead = trpc.prospectRadar.create.useMutation({
    onSuccess: (row) => {
      utils.prospectRadar.list.invalidate();
      setShowLeadModal(false);
      setLeadForm(EMPTY_LEAD);
      setSelectedId(row.id);
    },
  });

  const updateLead = trpc.prospectRadar.update.useMutation({
    onSuccess: () => {
      utils.prospectRadar.list.invalidate();
      utils.prospectRadar.get.invalidate({ id: editingLead?.id });
      setShowLeadModal(false);
      setEditingLead(null);
    },
  });

  const addSignal = trpc.prospectRadar.addSignal.useMutation({
    onSuccess: () => {
      utils.prospectRadar.get.invalidate({ id: signalTargetId ?? undefined });
      utils.prospectRadar.list.invalidate();
      setShowSignalSheet(false);
      setSignalForm(EMPTY_SIGNAL);
    },
  });

  const deleteLead = trpc.prospectRadar.deleteLead.useMutation({
    onSuccess: () => {
      utils.prospectRadar.list.invalidate();
      setSelectedId(null);
    },
  });

  const convertToProject = trpc.prospectRadar.convertToProject.useMutation({
    onSuccess: (data) => {
      utils.prospectRadar.list.invalidate();
      setShowConvertConfirm(false);
      navigate(`/projects/${data.projectId}`);
    },
  });

  const generateOutreach = trpc.prospectRadar.generateOutreach.useMutation({
    onSuccess: (data) => {
      setOutreachData(data);
    },
  });

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId && leadsQuery.data?.length) {
      setSelectedId(leadsQuery.data[0].id);
    }
  }, [leadsQuery.data, selectedId]);

  // ─── Derived data ────────────────────────────────────────────────────────────
  const leads = leadsQuery.data ?? [];
  const selectedLead = detailQuery.data ?? leads.find((l) => l.id === selectedLeadId);

  const stats = useMemo(() => {
    const pipeline = leads.reduce((sum, l) => sum + Number(l.estimatedLightingValue ?? 0), 0);
    const avgHeat = leads.length ? Math.round(leads.reduce((s, l) => s + l.heatScore, 0) / leads.length) : 0;
    const urgent = leads.filter((l) => l.heatScore >= 85).length;
    return { pipeline, avgHeat, urgent, total: leads.length };
  }, [leads]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  function openCreateModal() {
    setEditingLead(null);
    setLeadForm(EMPTY_LEAD);
    setShowLeadModal(true);
  }

  function openEditModal(lead: typeof selectedLead) {
    if (!lead) return;
    setEditingLead({
      id: lead.id,
      companyName: lead.companyName,
      projectName: lead.projectName,
      projectType: lead.projectType,
      marketSector: lead.marketSector ?? "",
      location: lead.location,
      status: lead.status as LeadStatus,
      buyingStage: lead.buyingStage as BuyingStage,
      heatScore: lead.heatScore,
      confidenceScore: lead.confidenceScore,
      estimatedProjectValue: lead.estimatedProjectValue ?? "",
      estimatedLightingValue: lead.estimatedLightingValue ?? "",
      decisionWindow: lead.decisionWindow ?? "",
      expectedBidDate: lead.expectedBidDate ?? "",
      expectedAwardDate: lead.expectedAwardDate ?? "",
      constructionStartDate: lead.constructionStartDate ?? "",
      ownerName: lead.ownerName ?? "",
      architectName: lead.architectName ?? "",
      generalContractorName: lead.generalContractorName ?? "",
      electricalEngineerName: lead.electricalEngineerName ?? "",
      primaryContactName: lead.primaryContactName ?? "",
      primaryContactTitle: lead.primaryContactTitle ?? "",
      primaryContactEmail: lead.primaryContactEmail ?? "",
      primaryContactPhone: lead.primaryContactPhone ?? "",
      primarySignal: lead.primarySignal,
      sourceName: lead.sourceName ?? "",
      summary: lead.summary ?? "",
      recommendedNextStep: lead.recommendedNextStep ?? "",
      notes: lead.notes ?? "",
    });
    setLeadForm({
      companyName: lead.companyName,
      projectName: lead.projectName,
      projectType: lead.projectType,
      marketSector: lead.marketSector ?? "",
      location: lead.location,
      status: lead.status as LeadStatus,
      buyingStage: lead.buyingStage as BuyingStage,
      heatScore: lead.heatScore,
      confidenceScore: lead.confidenceScore,
      estimatedProjectValue: lead.estimatedProjectValue ?? "",
      estimatedLightingValue: lead.estimatedLightingValue ?? "",
      decisionWindow: lead.decisionWindow ?? "",
      expectedBidDate: lead.expectedBidDate ?? "",
      expectedAwardDate: lead.expectedAwardDate ?? "",
      constructionStartDate: lead.constructionStartDate ?? "",
      ownerName: lead.ownerName ?? "",
      architectName: lead.architectName ?? "",
      generalContractorName: lead.generalContractorName ?? "",
      electricalEngineerName: lead.electricalEngineerName ?? "",
      primaryContactName: lead.primaryContactName ?? "",
      primaryContactTitle: lead.primaryContactTitle ?? "",
      primaryContactEmail: lead.primaryContactEmail ?? "",
      primaryContactPhone: lead.primaryContactPhone ?? "",
      primarySignal: lead.primarySignal,
      sourceName: lead.sourceName ?? "",
      summary: lead.summary ?? "",
      recommendedNextStep: lead.recommendedNextStep ?? "",
      notes: lead.notes ?? "",
    });
    setShowLeadModal(true);
  }

  function handleLeadSubmit() {
    const payload = {
      ...leadForm,
      estimatedProjectValue: leadForm.estimatedProjectValue ? Number(leadForm.estimatedProjectValue) : undefined,
      estimatedLightingValue: leadForm.estimatedLightingValue ? Number(leadForm.estimatedLightingValue) : undefined,
      marketSector: leadForm.marketSector || undefined,
      decisionWindow: leadForm.decisionWindow || undefined,
      expectedBidDate: leadForm.expectedBidDate || undefined,
      expectedAwardDate: leadForm.expectedAwardDate || undefined,
      constructionStartDate: leadForm.constructionStartDate || undefined,
      ownerName: leadForm.ownerName || undefined,
      architectName: leadForm.architectName || undefined,
      generalContractorName: leadForm.generalContractorName || undefined,
      electricalEngineerName: leadForm.electricalEngineerName || undefined,
      primaryContactName: leadForm.primaryContactName || undefined,
      primaryContactTitle: leadForm.primaryContactTitle || undefined,
      primaryContactEmail: leadForm.primaryContactEmail || undefined,
      primaryContactPhone: leadForm.primaryContactPhone || undefined,
      sourceName: leadForm.sourceName || undefined,
      summary: leadForm.summary || undefined,
      recommendedNextStep: leadForm.recommendedNextStep || undefined,
      notes: leadForm.notes || undefined,
    };
    if (editingLead?.id) {
      updateLead.mutate({ id: editingLead.id, ...payload });
    } else {
      createLead.mutate(payload);
    }
  }

  function openSignalSheet(leadId: number) {
    setSignalTargetId(leadId);
    setSignalForm(EMPTY_SIGNAL);
    setShowSignalSheet(true);
  }

  function handleSignalSubmit() {
    if (!signalTargetId) return;
    addSignal.mutate({
      prospectId: signalTargetId,
      ...signalForm,
      description: signalForm.description || undefined,
      signalDate: signalForm.signalDate || undefined,
      sourceName: signalForm.sourceName || undefined,
    });
  }

  function openOutreach(leadId: number) {
    setOutreachLeadId(leadId);
    setOutreachData(null);
    setShowOutreach(true);
    generateOutreach.mutate({ id: leadId });
  }

  function copyTouch(key: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedTouch(key);
    setTimeout(() => setCopiedTouch(null), 2000);
  }

  // ─── Access guard ────────────────────────────────────────────────────────────
  if (meLoading) {
    return (
      <div className="p-8 text-sm" style={{ color: "#1b110b", opacity: 0.6, fontFamily: "Inter, sans-serif" }}>
        Loading Prospect Radar…
      </div>
    );
  }

  if (!isInternal) {
    return (
      <div className="p-6">
        <PageHeader title="Prospect Radar" subtitle="Hot-lead intelligence for the SLS account-based management workflow." />
        <EmptyState
          title="Internal access only"
          description="Prospect Radar is reserved for SLS and Taptico internal users because it contains account strategy, buying signals, and opportunity intelligence."
        />
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Prospect Radar"
        subtitle="Prioritized hot prospects from construction buying signals, permit movement, plan-room activity, GC activity, and relationship intelligence."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => loadDemo.mutate()}
              disabled={loadDemo.isPending}
              className="gap-2"
              style={{ fontFamily: "Inter, sans-serif", borderColor: "#d29c3c", color: "#d29c3c" }}
            >
              <Sparkles size={15} />
              {loadDemo.isPending ? "Loading…" : "Load Demo"}
            </Button>
            <Button
              onClick={openCreateModal}
              className="gap-2"
              style={{ background: "#d29c3c", color: "#fff", border: "none", fontFamily: "Inter, sans-serif" }}
            >
              <Plus size={15} /> Add Lead
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Hot Leads" value={stats.total} icon={<Radar size={18} />} />
        <StatCard label="Urgent Leads" value={stats.urgent} icon={<Flame size={18} />} />
        <StatCard label="Avg. Heat" value={stats.avgHeat ? `${stats.avgHeat}%` : "—"} icon={<Activity size={18} />} />
        <StatCard label="Lighting Pipeline" value={formatMoney(stats.pipeline)} icon={<CircleDollarSign size={18} />} />
      </div>

      {/* Filter + header card */}
      <Card style={{ borderLeft: "4px solid #d29c3c" }}>
        <CardHeader className="pb-2">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>Buying Signal Radar</CardTitle>
              <p className="mt-2 max-w-3xl text-sm" style={{ color: "#1b110b", opacity: 0.65, fontFamily: "Inter, sans-serif" }}>
                Each card represents a commercial construction opportunity. Click a card to populate the detailed pursuit brief below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([70, 80, 90] as const).map((score) => (
                <Button
                  key={score}
                  size="sm"
                  variant={minHeatScore === score ? "default" : "ghost"}
                  onClick={() => setMinHeatScore(score)}
                  style={minHeatScore === score ? { background: "#d29c3c", color: "#fff" } : {}}
                >
                  {score}+ heat
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lead cards */}
      {leadsQuery.isLoading ? (
        <div className="text-sm" style={{ color: "#1b110b", opacity: 0.6 }}>Scanning for hot leads…</div>
      ) : leads.length === 0 ? (
        <EmptyState
          title="No hot leads yet"
          description="Load demo leads to preview the account-based management radar, or add your first prospect manually."
          action={
            <div className="flex gap-3">
              <Button onClick={() => loadDemo.mutate()} disabled={loadDemo.isPending} variant="outline" style={{ borderColor: "#d29c3c", color: "#d29c3c" }}>
                <Sparkles size={15} className="mr-2" /> Load Demo
              </Button>
              <Button onClick={openCreateModal} style={{ background: "#d29c3c", color: "#fff", border: "none" }}>
                <Plus size={15} className="mr-2" /> Add Lead
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {leads.map((lead) => {
              const selected = lead.id === selectedLeadId;
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelectedId(lead.id)}
                  className={cn(
                    "group flex h-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-sm rounded-lg border",
                    selected ? "border-[#d29c3c] bg-[#fdf6e8]/40" : "border-[#e6dec2] bg-white hover:border-[#d29c3c]/60",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#1b110b", opacity: 0.5 }}>
                        {lead.marketSector ?? lead.projectType}
                      </div>
                      <h2 className="mt-1 text-lg uppercase leading-tight" style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, color: "#1b110b" }}>
                        {lead.projectName}
                      </h2>
                      <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: "#1b110b", opacity: 0.6 }}>
                        <MapPin className="h-3.5 w-3.5" /> {lead.location}
                      </div>
                    </div>
                    <div className={cn("rounded-xl border px-3 py-2 text-center shrink-0", heatTone(lead.heatScore))}>
                      <div className="text-[10px] uppercase tracking-widest">Heat</div>
                      <div className="text-xl leading-none font-bold" style={{ fontFamily: "Roboto Slab, serif" }}>{lead.heatScore}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant={statusVariant(lead.status)} style={statusStyle(lead.status)}>
                      {STATUS_LABEL[lead.status] ?? lead.status}
                    </Badge>
                    <Badge variant="outline" style={{ color: "#1b110b", borderColor: "#e6dec2" }}>
                      {STAGE_LABEL[lead.buyingStage] ?? lead.buyingStage}
                    </Badge>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm" style={{ color: "#1b110b", opacity: 0.75 }}>
                    {lead.primarySignal}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-y py-3 text-xs" style={{ borderColor: "#e6dec2" }}>
                    <div>
                      <div className="uppercase tracking-widest" style={{ color: "#1b110b", opacity: 0.5 }}>Lighting Value</div>
                      <div className="mt-1 font-semibold" style={{ color: "#1b110b" }}>{formatMoney(lead.estimatedLightingValue)}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-widest" style={{ color: "#1b110b", opacity: 0.5 }}>Decision Window</div>
                      <div className="mt-1 font-semibold" style={{ color: "#1b110b" }}>{lead.decisionWindow ?? "—"}</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {lead.signals.slice(0, 2).map((signal) => (
                      <div key={signal.id} className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-xs" style={{ background: "rgba(255,255,255,0.8)" }}>
                        <span className="truncate" style={{ color: "#1b110b", opacity: 0.75 }}>
                          {SIGNAL_LABEL[signal.type] ?? signal.type}: {signal.title}
                        </span>
                        <span className="font-semibold" style={{ color: "#d29c3c" }}>{signal.impactScore}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-4 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "#d29c3c" }}>
                    View pursuit brief <ArrowDown className="h-3.5 w-3.5 transition group-hover:translate-y-0.5" />
                  </div>
                </button>
              );
            })}
          </section>

          {/* ─── Pursuit brief detail ─────────────────────────────────────── */}
          <section id="prospect-detail">
            <Card style={{ borderTop: "4px solid #d29c3c" }}>
              <CardContent className="pt-6">
                {!selectedLead ? (
                  <div className="text-sm" style={{ color: "#1b110b", opacity: 0.6 }}>Select a lead to view the pursuit brief.</div>
                ) : (
                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    {/* Left */}
                    <div>
                      {/* Brief header + action buttons */}
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color: "#d29c3c" }}>
                            Selected Pursuit Brief
                          </div>
                          <h2 className="mt-2 text-2xl uppercase" style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, color: "#1b110b" }}>
                            {selectedLead.projectName}
                          </h2>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm" style={{ color: "#1b110b", opacity: 0.65 }}>
                            <span className="inline-flex items-center gap-1"><Building2 className="h-4 w-4" /> {selectedLead.companyName}</span>
                            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {selectedLead.location}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={statusVariant(selectedLead.status)} style={statusStyle(selectedLead.status)}>
                            {STATUS_LABEL[selectedLead.status] ?? selectedLead.status}
                          </Badge>
                          <Badge variant="outline" style={{ color: "#1b110b", borderColor: "#e6dec2" }}>
                            {STAGE_LABEL[selectedLead.buyingStage] ?? selectedLead.buyingStage}
                          </Badge>
                        </div>
                      </div>

                      {/* Action row */}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(selectedLead)} className="gap-1.5" style={{ borderColor: "#e6dec2" }}>
                          <Pencil size={13} /> Edit Lead
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openSignalSheet(selectedLead.id)} className="gap-1.5" style={{ borderColor: "#e6dec2" }}>
                          <Plus size={13} /> Add Signal
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openOutreach(selectedLead.id)}
                          disabled={generateOutreach.isPending && outreachLeadId === selectedLead.id}
                          className="gap-1.5"
                          style={{ background: "#1b110b", color: "#d29c3c", border: "none" }}
                        >
                          <Zap size={13} />
                          {generateOutreach.isPending && outreachLeadId === selectedLead.id ? "Generating…" : "Generate Outreach"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setConvertLeadId(selectedLead.id); setShowConvertConfirm(true); }}
                          className="gap-1.5"
                          style={{ borderColor: "#d29c3c", color: "#d29c3c" }}
                        >
                          <FolderPlus size={13} /> Convert to Project
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { if (confirm("Delete this lead and all its signals?")) deleteLead.mutate({ id: selectedLead.id }); }}
                          className="gap-1.5 text-red-500 hover:text-red-600"
                        >
                          <Trash2 size={13} /> Delete
                        </Button>
                      </div>

                      {/* Metric tiles */}
                      <div className="mt-6 grid gap-4 md:grid-cols-4">
                        <Metric label="Heat Score" value={`${selectedLead.heatScore}%`} icon={<Flame className="h-4 w-4" />} />
                        <Metric label="Confidence" value={`${selectedLead.confidenceScore}%`} icon={<Target className="h-4 w-4" />} />
                        <Metric label="Project Value" value={formatMoney(selectedLead.estimatedProjectValue)} icon={<CircleDollarSign className="h-4 w-4" />} />
                        <Metric label="Lighting Value" value={formatMoney(selectedLead.estimatedLightingValue)} icon={<CircleDollarSign className="h-4 w-4" />} />
                      </div>

                      {/* Brief blocks */}
                      <div className="mt-6 grid gap-5 md:grid-cols-2">
                        <BriefBlock title="Why This Is Hot">{selectedLead.summary ?? selectedLead.primarySignal}</BriefBlock>
                        <BriefBlock title="Recommended Next Step">
                          {selectedLead.recommendedNextStep ?? "Assign an SLS owner, validate the buying committee, and confirm the next construction milestone."}
                        </BriefBlock>
                      </div>

                      {/* Buying signals */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>
                            Buying Signals
                          </h3>
                          <Button size="sm" variant="ghost" onClick={() => openSignalSheet(selectedLead.id)} className="gap-1 text-xs" style={{ color: "#d29c3c" }}>
                            <Plus size={12} /> Add Signal
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {selectedLead.signals.length === 0 ? (
                            <p className="text-sm" style={{ color: "#1b110b", opacity: 0.55 }}>No signals logged yet. Add the first buying signal to strengthen this lead's heat score.</p>
                          ) : (
                            selectedLead.signals.map((signal) => (
                              <div key={signal.id} className="rounded-lg border p-4" style={{ borderColor: "#e6dec2", background: "#f9f9f9" }}>
                                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                                  <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#d29c3c" }}>
                                      {SIGNAL_LABEL[signal.type] ?? signal.type}
                                    </div>
                                    <div className="mt-1 font-medium" style={{ color: "#1b110b" }}>{signal.title}</div>
                                  </div>
                                  <div className="flex gap-2 text-xs">
                                    <span className="rounded-full px-3 py-1" style={{ background: "#fff", color: "#1b110b", opacity: 0.7 }}>Impact {signal.impactScore}</span>
                                    <span className="rounded-full px-3 py-1" style={{ background: "#fff", color: "#1b110b", opacity: 0.7 }}>Confidence {signal.confidenceScore}</span>
                                  </div>
                                </div>
                                {signal.description && <p className="mt-3 text-sm" style={{ color: "#1b110b", opacity: 0.7 }}>{signal.description}</p>}
                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: "#1b110b", opacity: 0.55 }}>
                                  <span>{formatDate(signal.signalDate)}</span>
                                  {signal.sourceName && <span>{signal.sourceName}</span>}
                                  {signal.sourceUrl && (
                                    <a className="inline-flex items-center gap-1 hover:underline" style={{ color: "#d29c3c" }} href={signal.sourceUrl} target="_blank" rel="noreferrer">
                                      Source <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right aside */}
                    <aside className="space-y-5">
                      <Card style={{ background: "#1b110b", color: "#fff" }}>
                        <CardHeader className="pb-2">
                          <CardTitle style={{ color: "#d29c3c", fontFamily: "Roboto Slab, serif" }}>Pursuit Timing</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                          <TimelineRow label="Decision Window" value={selectedLead.decisionWindow ?? "—"} />
                          <TimelineRow label="Expected Bid" value={formatDate(selectedLead.expectedBidDate)} />
                          <TimelineRow label="Expected Award" value={formatDate(selectedLead.expectedAwardDate)} />
                          <TimelineRow label="Construction Start" value={formatDate(selectedLead.constructionStartDate)} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>Account Map</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <AccountRow label="Owner" value={selectedLead.ownerName} />
                          <AccountRow label="Architect" value={selectedLead.architectName} />
                          <AccountRow label="GC" value={selectedLead.generalContractorName} />
                          <AccountRow label="Electrical Engineer" value={selectedLead.electricalEngineerName} />
                          <AccountRow label="Primary Contact" value={selectedLead.primaryContactName} subvalue={selectedLead.primaryContactTitle} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>Source</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-start gap-3">
                            <Users className="mt-0.5 h-4 w-4" style={{ color: "#d29c3c" }} />
                            <div>
                              <div className="font-medium" style={{ color: "#1b110b" }}>{selectedLead.sourceName ?? "Market intelligence"}</div>
                              <p className="mt-1 text-sm" style={{ color: "#1b110b", opacity: 0.65 }}>
                                {selectedLead.notes ?? "Use this section to connect live permit, plan-room, bid, and relationship-intelligence sources."}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </aside>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {/* ─── Lead Create / Edit Modal ──────────────────────────────────────── */}
      <Dialog open={showLeadModal} onOpenChange={(open) => { if (!open) { setShowLeadModal(false); setEditingLead(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>
              {editingLead?.id ? "Edit Lead" : "Add New Lead"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Core identity */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#d29c3c" }}>Project Identity</p>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Company Name *">
                  <Input value={leadForm.companyName} onChange={(e) => setLeadForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Sterling Ridge Development" />
                </FormField>
                <FormField label="Project Name *">
                  <Input value={leadForm.projectName} onChange={(e) => setLeadForm((f) => ({ ...f, projectName: e.target.value }))} placeholder="West Midtown Food Hall" />
                </FormField>
                <FormField label="Project Type *">
                  <Input value={leadForm.projectType} onChange={(e) => setLeadForm((f) => ({ ...f, projectType: e.target.value }))} placeholder="Mixed-use adaptive reuse" />
                </FormField>
                <FormField label="Market Sector">
                  <Input value={leadForm.marketSector} onChange={(e) => setLeadForm((f) => ({ ...f, marketSector: e.target.value }))} placeholder="Hospitality / Retail" />
                </FormField>
                <FormField label="Location *">
                  <Input value={leadForm.location} onChange={(e) => setLeadForm((f) => ({ ...f, location: e.target.value }))} placeholder="Atlanta, GA" />
                </FormField>
                <FormField label="Source Name">
                  <Input value={leadForm.sourceName} onChange={(e) => setLeadForm((f) => ({ ...f, sourceName: e.target.value }))} placeholder="Permit feed, plan room, etc." />
                </FormField>
              </div>
            </div>

            <Separator style={{ borderColor: "#e6dec2" }} />

            {/* Status + scores */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#d29c3c" }}>Status & Scoring</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FormField label="Status">
                  <Select value={leadForm.status} onValueChange={(v) => setLeadForm((f) => ({ ...f, status: v as LeadStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label="Buying Stage">
                  <Select value={leadForm.buyingStage} onValueChange={(v) => setLeadForm((f) => ({ ...f, buyingStage: v as BuyingStage }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormField>
                <FormField label={`Heat Score: ${leadForm.heatScore}`}>
                  <input type="range" min={0} max={100} value={leadForm.heatScore} onChange={(e) => setLeadForm((f) => ({ ...f, heatScore: Number(e.target.value) }))} className="w-full accent-[#d29c3c]" />
                </FormField>
                <FormField label={`Confidence: ${leadForm.confidenceScore}`}>
                  <input type="range" min={0} max={100} value={leadForm.confidenceScore} onChange={(e) => setLeadForm((f) => ({ ...f, confidenceScore: Number(e.target.value) }))} className="w-full accent-[#d29c3c]" />
                </FormField>
              </div>
            </div>

            <Separator style={{ borderColor: "#e6dec2" }} />

            {/* Financials + timing */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#d29c3c" }}>Financials & Timing</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField label="Est. Project Value ($)">
                  <Input type="number" value={leadForm.estimatedProjectValue} onChange={(e) => setLeadForm((f) => ({ ...f, estimatedProjectValue: e.target.value }))} placeholder="18500000" />
                </FormField>
                <FormField label="Est. Lighting Value ($)">
                  <Input type="number" value={leadForm.estimatedLightingValue} onChange={(e) => setLeadForm((f) => ({ ...f, estimatedLightingValue: e.target.value }))} placeholder="740000" />
                </FormField>
                <FormField label="Decision Window">
                  <Input value={leadForm.decisionWindow} onChange={(e) => setLeadForm((f) => ({ ...f, decisionWindow: e.target.value }))} placeholder="Next 30–45 days" />
                </FormField>
                <FormField label="Expected Bid Date">
                  <Input type="date" value={leadForm.expectedBidDate} onChange={(e) => setLeadForm((f) => ({ ...f, expectedBidDate: e.target.value }))} />
                </FormField>
                <FormField label="Expected Award Date">
                  <Input type="date" value={leadForm.expectedAwardDate} onChange={(e) => setLeadForm((f) => ({ ...f, expectedAwardDate: e.target.value }))} />
                </FormField>
                <FormField label="Construction Start">
                  <Input type="date" value={leadForm.constructionStartDate} onChange={(e) => setLeadForm((f) => ({ ...f, constructionStartDate: e.target.value }))} />
                </FormField>
              </div>
            </div>

            <Separator style={{ borderColor: "#e6dec2" }} />

            {/* Account map */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#d29c3c" }}>Account Map</p>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Owner"><Input value={leadForm.ownerName} onChange={(e) => setLeadForm((f) => ({ ...f, ownerName: e.target.value }))} placeholder="Developer / owner name" /></FormField>
                <FormField label="Architect"><Input value={leadForm.architectName} onChange={(e) => setLeadForm((f) => ({ ...f, architectName: e.target.value }))} placeholder="Architecture firm" /></FormField>
                <FormField label="General Contractor"><Input value={leadForm.generalContractorName} onChange={(e) => setLeadForm((f) => ({ ...f, generalContractorName: e.target.value }))} placeholder="GC name" /></FormField>
                <FormField label="Electrical Engineer"><Input value={leadForm.electricalEngineerName} onChange={(e) => setLeadForm((f) => ({ ...f, electricalEngineerName: e.target.value }))} placeholder="MEP / EE firm" /></FormField>
                <FormField label="Primary Contact Name"><Input value={leadForm.primaryContactName} onChange={(e) => setLeadForm((f) => ({ ...f, primaryContactName: e.target.value }))} placeholder="Contact name" /></FormField>
                <FormField label="Primary Contact Title"><Input value={leadForm.primaryContactTitle} onChange={(e) => setLeadForm((f) => ({ ...f, primaryContactTitle: e.target.value }))} placeholder="Title" /></FormField>
                <FormField label="Primary Contact Email"><Input type="email" value={leadForm.primaryContactEmail} onChange={(e) => setLeadForm((f) => ({ ...f, primaryContactEmail: e.target.value }))} placeholder="email@example.com" /></FormField>
                <FormField label="Primary Contact Phone"><Input value={leadForm.primaryContactPhone} onChange={(e) => setLeadForm((f) => ({ ...f, primaryContactPhone: e.target.value }))} placeholder="(404) 555-0100" /></FormField>
              </div>
            </div>

            <Separator style={{ borderColor: "#e6dec2" }} />

            {/* Intelligence */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#d29c3c" }}>Intelligence</p>
              <div className="space-y-4">
                <FormField label="Primary Signal *">
                  <Textarea value={leadForm.primarySignal} onChange={(e) => setLeadForm((f) => ({ ...f, primarySignal: e.target.value }))} placeholder="Why is this lead hot right now?" rows={2} />
                </FormField>
                <FormField label="Summary">
                  <Textarea value={leadForm.summary} onChange={(e) => setLeadForm((f) => ({ ...f, summary: e.target.value }))} placeholder="Why this is a strong SLS fit…" rows={3} />
                </FormField>
                <FormField label="Recommended Next Step">
                  <Textarea value={leadForm.recommendedNextStep} onChange={(e) => setLeadForm((f) => ({ ...f, recommendedNextStep: e.target.value }))} placeholder="Route to rep, contact architect, etc." rows={2} />
                </FormField>
                <FormField label="Internal Notes">
                  <Textarea value={leadForm.notes} onChange={(e) => setLeadForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Internal notes…" rows={2} />
                </FormField>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setShowLeadModal(false); setEditingLead(null); }}>Cancel</Button>
            <Button
              onClick={handleLeadSubmit}
              disabled={!leadForm.companyName || !leadForm.projectName || !leadForm.projectType || !leadForm.location || !leadForm.primarySignal || createLead.isPending || updateLead.isPending}
              style={{ background: "#d29c3c", color: "#fff", border: "none" }}
            >
              {createLead.isPending || updateLead.isPending ? "Saving…" : editingLead?.id ? "Save Changes" : "Add Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Signal Sheet ──────────────────────────────────────────────── */}
      <Sheet open={showSignalSheet} onOpenChange={setShowSignalSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>Add Buying Signal</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <FormField label="Signal Type *">
              <Select value={signalForm.type} onValueChange={(v) => setSignalForm((f) => ({ ...f, type: v as SignalType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SIGNAL_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Signal Title *">
              <Input value={signalForm.title} onChange={(e) => setSignalForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Commercial alteration permit filed" />
            </FormField>
            <FormField label="Description">
              <Textarea value={signalForm.description} onChange={(e) => setSignalForm((f) => ({ ...f, description: e.target.value }))} placeholder="Additional context about this signal…" rows={3} />
            </FormField>
            <FormField label="Signal Date">
              <Input type="date" value={signalForm.signalDate} onChange={(e) => setSignalForm((f) => ({ ...f, signalDate: e.target.value }))} />
            </FormField>
            <FormField label="Source Name">
              <Input value={signalForm.sourceName} onChange={(e) => setSignalForm((f) => ({ ...f, sourceName: e.target.value }))} placeholder="Permit feed, plan room, manual research…" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={`Impact Score: ${signalForm.impactScore}`}>
                <input type="range" min={0} max={100} value={signalForm.impactScore} onChange={(e) => setSignalForm((f) => ({ ...f, impactScore: Number(e.target.value) }))} className="w-full accent-[#d29c3c]" />
              </FormField>
              <FormField label={`Confidence: ${signalForm.confidenceScore}`}>
                <input type="range" min={0} max={100} value={signalForm.confidenceScore} onChange={(e) => setSignalForm((f) => ({ ...f, confidenceScore: Number(e.target.value) }))} className="w-full accent-[#d29c3c]" />
              </FormField>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="ghost" onClick={() => setShowSignalSheet(false)} className="flex-1">Cancel</Button>
            <Button
              onClick={handleSignalSubmit}
              disabled={!signalForm.title || addSignal.isPending}
              className="flex-1"
              style={{ background: "#d29c3c", color: "#fff", border: "none" }}
            >
              {addSignal.isPending ? "Saving…" : "Add Signal"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Convert to Project Confirm ────────────────────────────────────── */}
      <Dialog open={showConvertConfirm} onOpenChange={setShowConvertConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>Convert to Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "#1b110b", opacity: 0.75 }}>
            This will create a new project pre-populated with this lead's details and mark the lead as <strong>Won</strong>. You'll be taken to the new project immediately.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConvertConfirm(false)}>Cancel</Button>
            <Button
              onClick={() => { if (convertLeadId) convertToProject.mutate({ id: convertLeadId }); }}
              disabled={convertToProject.isPending}
              style={{ background: "#d29c3c", color: "#fff", border: "none" }}
            >
              {convertToProject.isPending ? "Converting…" : "Convert & Open Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Outreach Sequence Sheet ───────────────────────────────────────── */}
      <Sheet open={showOutreach} onOpenChange={(open) => { if (!open) { setShowOutreach(false); setOutreachData(null); } }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>
                <span className="flex items-center gap-2"><Mail size={18} style={{ color: "#d29c3c" }} /> AI Cold Outreach Sequence</span>
              </SheetTitle>
              {outreachData && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setOutreachData(null); if (outreachLeadId) generateOutreach.mutate({ id: outreachLeadId }); }}
                  className="gap-1.5 text-xs"
                  style={{ color: "#d29c3c" }}
                >
                  <RefreshCw size={12} /> Regenerate
                </Button>
              )}
            </div>
          </SheetHeader>

          {generateOutreach.isPending && !outreachData ? (
            <div className="mt-12 flex flex-col items-center gap-4 text-center">
              <div className="h-10 w-10 rounded-full border-4 border-[#d29c3c] border-t-transparent animate-spin" />
              <p className="text-sm" style={{ color: "#1b110b", opacity: 0.7 }}>Analyzing signals and crafting your personalized outreach sequence…</p>
            </div>
          ) : generateOutreach.isError ? (
            <div className="mt-8 text-sm text-red-600">Failed to generate outreach. Please try again.</div>
          ) : outreachData ? (
            <div className="mt-6 space-y-6">
              {/* Strategy note */}
              <div className="rounded-lg border-l-4 p-4" style={{ borderColor: "#d29c3c", background: "#fdf6e8" }}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: "#d29c3c" }}>Strategy Note</div>
                <p className="text-sm leading-6" style={{ color: "#1b110b", opacity: 0.8 }}>{outreachData.strategyNote}</p>
              </div>

              {/* Three touches */}
              {(["touch1", "touch2", "touch3"] as const).map((key, idx) => {
                const touch = outreachData[key];
                const dayLabel = ["Day 1 — Initial Outreach", "Day 5 — Follow-Up", "Day 12 — Final Touch"][idx];
                const copied = copiedTouch === key;
                return (
                  <div key={key} className="rounded-lg border" style={{ borderColor: "#e6dec2" }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#e6dec2", background: "#f9f9f9" }}>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#d29c3c" }}>{dayLabel}</div>
                        <div className="mt-1 font-medium text-sm" style={{ color: "#1b110b" }}>{touch.subject}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyTouch(key, `Subject: ${touch.subject}\n\n${touch.body}\n\nCTA: ${touch.callToAction}`)}
                        className="gap-1.5 text-xs shrink-0"
                        style={{ color: copied ? "#22c55e" : "#d29c3c" }}
                      >
                        {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                    <div className="p-4">
                      <pre className="whitespace-pre-wrap text-sm leading-7 font-sans" style={{ color: "#1b110b", opacity: 0.85 }}>{touch.body}</pre>
                      <div className="mt-4 flex items-start gap-2 rounded-md p-3" style={{ background: "#fdf6e8" }}>
                        <ClipboardList size={14} className="mt-0.5 shrink-0" style={{ color: "#d29c3c" }} />
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#d29c3c" }}>CTA: </span>
                          <span className="text-sm" style={{ color: "#1b110b", opacity: 0.8 }}>{touch.callToAction}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <p className="text-xs text-center" style={{ color: "#1b110b", opacity: 0.45 }}>
                AI-generated sequence — review and personalize before sending. Not stored in the database.
              </p>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Local helper components ──────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label style={{ color: "#1b110b", opacity: 0.7, fontSize: "12px", fontFamily: "Inter, sans-serif" }}>{label}</Label>
      {children}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "#e6dec2", background: "#f9f9f9" }}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: "#1b110b", opacity: 0.45 }}>
        <span style={{ color: "#d29c3c" }}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-xl" style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, color: "#1b110b" }}>{value}</div>
    </div>
  );
}

function BriefBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "#e6dec2", background: "#fff" }}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#d29c3c" }}>{title}</div>
      <p className="mt-2 text-sm leading-6" style={{ color: "#1b110b", opacity: 0.75 }}>{children}</p>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
      <span className="inline-flex items-center gap-2" style={{ color: "rgba(255,255,255,0.55)" }}>
        <CalendarDays className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-medium" style={{ color: "#fff" }}>{value}</span>
    </div>
  );
}

function AccountRow({ label, value, subvalue }: { label: string; value?: string | null; subvalue?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "#e6dec2" }}>
      <span className="text-xs uppercase tracking-widest" style={{ color: "#1b110b", opacity: 0.45 }}>{label}</span>
      <span className="text-right font-medium" style={{ color: "#1b110b" }}>
        {value ?? "—"}
        {subvalue && <span className="block text-xs font-normal" style={{ color: "#1b110b", opacity: 0.55 }}>{subvalue}</span>}
      </span>
    </div>
  );
}
