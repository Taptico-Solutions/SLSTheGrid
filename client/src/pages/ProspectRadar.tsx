import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  Flame,
  MapPin,
  Radar,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/SLSComponents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const INTERNAL_ROLES = ["admin", "sls_admin", "sls_rep", "sls_pm"];

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  researching: "Researching",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
  nurture: "Nurture",
};

const STAGE_LABEL: Record<string, string> = {
  early_planning: "Early Planning",
  design: "Design",
  pricing: "Pricing",
  bidding: "Bidding",
  awarded: "Awarded",
  procurement: "Procurement",
};

const SIGNAL_LABEL: Record<string, string> = {
  permit: "Permit",
  plan_room: "Plan Room",
  construction_start: "Construction Start",
  architect_activity: "Architect Activity",
  gc_award: "GC Award",
  budget_approved: "Budget Approved",
  renovation: "Renovation",
  tenant_improvement: "Tenant Improvement",
  hospitality_pipeline: "Hospitality Pipeline",
  municipal_bid: "Municipal Bid",
  relationship: "Relationship",
  news: "News",
};

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
  if (status === "qualified" || status === "won") {
    return { background: "#d29c3c", color: "#fff", border: "none" };
  }
  if (status === "lost") return {};
  if (status === "contacted" || status === "proposal") {
    return { background: "#e6f0ff", color: "#1a56db", border: "none" };
  }
  return {};
}

export default function ProspectRadarPage() {
  const { data: me, isLoading: meLoading } = trpc.auth.me.useQuery();
  const isInternal = !!me && INTERNAL_ROLES.includes(me.role);
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [minHeatScore, setMinHeatScore] = useState<70 | 80 | 90>(70);

  const leadsQuery = trpc.prospectRadar.list.useQuery(
    { minHeatScore },
    { enabled: isInternal },
  );

  const selectedLeadId = selectedId ?? leadsQuery.data?.[0]?.id;
  const detailQuery = trpc.prospectRadar.get.useQuery(
    { id: selectedLeadId ?? 0 },
    { enabled: isInternal && !!selectedLeadId },
  );

  const loadDemo = trpc.prospectRadar.loadDemo.useMutation({
    onSuccess: async () => {
      await utils.prospectRadar.list.invalidate();
    },
  });

  useEffect(() => {
    if (!selectedId && leadsQuery.data?.length) {
      setSelectedId(leadsQuery.data[0].id);
    }
  }, [leadsQuery.data, selectedId]);

  const leads = leadsQuery.data ?? [];
  const selectedLead = detailQuery.data ?? leads.find((lead) => lead.id === selectedLeadId);

  const stats = useMemo(() => {
    const pipeline = leads.reduce((sum, lead) => sum + Number(lead.estimatedLightingValue ?? 0), 0);
    const avgHeat = leads.length
      ? Math.round(leads.reduce((sum, lead) => sum + lead.heatScore, 0) / leads.length)
      : 0;
    const urgent = leads.filter((lead) => lead.heatScore >= 85).length;
    return { pipeline, avgHeat, urgent, total: leads.length };
  }, [leads]);

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
        <PageHeader
          title="Prospect Radar"
          subtitle="Hot-lead intelligence for the SLS account-based management workflow."
        />
        <EmptyState
          title="Internal access only"
          description="Prospect Radar is reserved for SLS and Taptico internal users because it contains account strategy, buying signals, and opportunity intelligence."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Prospect Radar"
        subtitle="Prioritized hot prospects from construction buying signals, permit movement, plan-room activity, GC activity, and relationship intelligence."
        actions={
          <Button
            onClick={() => loadDemo.mutate()}
            disabled={loadDemo.isPending}
            className="gap-2"
            style={{ background: "#d29c3c", color: "#fff", border: "none", fontFamily: "Inter, sans-serif" }}
          >
            <Sparkles size={15} />
            {loadDemo.isPending ? "Loading…" : "Load Demo Leads"}
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Hot Leads" value={stats.total} icon={<Radar size={18} />} />
        <StatCard label="Urgent Leads" value={stats.urgent} icon={<Flame size={18} />} />
        <StatCard label="Avg. Heat" value={stats.avgHeat ? `${stats.avgHeat}%` : "—"} icon={<Activity size={18} />} />
        <StatCard label="Lighting Pipeline" value={formatMoney(stats.pipeline)} icon={<CircleDollarSign size={18} />} />
      </div>

      {/* Filter bar */}
      <Card style={{ borderLeft: "4px solid #d29c3c" }}>
        <CardHeader className="pb-2">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>
                Buying Signal Radar
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm" style={{ color: "#1b110b", opacity: 0.65, fontFamily: "Inter, sans-serif" }}>
                Each card represents a commercial construction opportunity where signal strength, timing, and SLS fit indicate potential lighting demand. Click a card to populate the detailed pursuit brief below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {([70, 80, 90] as const).map((score) => (
                <Button
                  key={score}
                  size="sm"
                  variant={minHeatScore === score ? "default" : "ghost"}
                  onClick={() => setMinHeatScore(score)}
                  style={
                    minHeatScore === score
                      ? { background: "#d29c3c", color: "#fff", fontFamily: "Inter, sans-serif" }
                      : { fontFamily: "Inter, sans-serif" }
                  }
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
        <div className="text-sm" style={{ color: "#1b110b", opacity: 0.6, fontFamily: "Inter, sans-serif" }}>
          Scanning for hot leads…
        </div>
      ) : leadsQuery.error ? (
        <EmptyState
          title="Prospect Radar is ready"
          description="The page is built and the tables are migrated. Load demo leads to preview the account-based management radar, or connect real buying-signal feeds."
        />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No hot leads yet"
          description="Load demo leads to preview the account-based management radar, or connect market feeds for permits, plans, bid activity, and construction intelligence."
          action={
            <Button
              onClick={() => loadDemo.mutate()}
              disabled={loadDemo.isPending}
              className="gap-2"
              style={{ background: "#d29c3c", color: "#fff", border: "none" }}
            >
              <Sparkles size={15} /> Load Demo Leads
            </Button>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {leads.map((lead) => {
              const selected = lead.id === selectedLeadId;
              const topSignals = lead.signals.slice(0, 3);
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelectedId(lead.id)}
                  className={cn(
                    "group flex h-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-sm rounded-lg border",
                    selected
                      ? "border-[#d29c3c] bg-[#fdf6e8]/40"
                      : "border-[#e6dec2] bg-white hover:border-[#d29c3c]/60",
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                        style={{ color: "#1b110b", opacity: 0.5, fontFamily: "Inter, sans-serif" }}
                      >
                        {lead.marketSector ?? lead.projectType}
                      </div>
                      <h2
                        className="mt-1 text-lg uppercase leading-tight"
                        style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, color: "#1b110b" }}
                      >
                        {lead.projectName}
                      </h2>
                      <div
                        className="mt-2 flex items-center gap-1 text-xs"
                        style={{ color: "#1b110b", opacity: 0.6, fontFamily: "Inter, sans-serif" }}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {lead.location}
                      </div>
                    </div>
                    {/* Heat badge */}
                    <div className={cn("rounded-xl border px-3 py-2 text-center shrink-0", heatTone(lead.heatScore))}>
                      <div className="text-[10px] uppercase tracking-widest">Heat</div>
                      <div className="text-xl leading-none font-bold" style={{ fontFamily: "Roboto Slab, serif" }}>
                        {lead.heatScore}
                      </div>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant={statusVariant(lead.status)} style={statusStyle(lead.status)}>
                      {STATUS_LABEL[lead.status] ?? lead.status}
                    </Badge>
                    <Badge variant="outline" style={{ color: "#1b110b", borderColor: "#e6dec2" }}>
                      {STAGE_LABEL[lead.buyingStage] ?? lead.buyingStage}
                    </Badge>
                  </div>

                  {/* Primary signal */}
                  <p
                    className="mt-4 line-clamp-3 text-sm"
                    style={{ color: "#1b110b", opacity: 0.75, fontFamily: "Inter, sans-serif" }}
                  >
                    {lead.primarySignal}
                  </p>

                  {/* Metrics */}
                  <div
                    className="mt-4 grid grid-cols-2 gap-3 border-y py-3 text-xs"
                    style={{ borderColor: "#e6dec2", color: "#1b110b", opacity: 0.7, fontFamily: "Inter, sans-serif" }}
                  >
                    <div>
                      <div className="uppercase tracking-widest" style={{ opacity: 0.5 }}>
                        Lighting Value
                      </div>
                      <div className="mt-1 font-semibold" style={{ opacity: 1, color: "#1b110b" }}>
                        {formatMoney(lead.estimatedLightingValue)}
                      </div>
                    </div>
                    <div>
                      <div className="uppercase tracking-widest" style={{ opacity: 0.5 }}>
                        Decision Window
                      </div>
                      <div className="mt-1 font-semibold" style={{ opacity: 1, color: "#1b110b" }}>
                        {lead.decisionWindow ?? "—"}
                      </div>
                    </div>
                  </div>

                  {/* Top signals */}
                  <div className="mt-4 space-y-2">
                    {topSignals.map((signal) => (
                      <div
                        key={signal.id}
                        className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-xs"
                        style={{ background: "rgba(255,255,255,0.8)" }}
                      >
                        <span
                          className="truncate"
                          style={{ color: "#1b110b", opacity: 0.75, fontFamily: "Inter, sans-serif" }}
                        >
                          {SIGNAL_LABEL[signal.type] ?? signal.type}: {signal.title}
                        </span>
                        <span className="font-semibold" style={{ color: "#d29c3c" }}>
                          {signal.impactScore}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div
                    className="mt-auto flex items-center gap-2 pt-4 text-xs font-semibold uppercase tracking-[0.2em]"
                    style={{ color: "#d29c3c", fontFamily: "Inter, sans-serif" }}
                  >
                    View pursuit brief{" "}
                    <ArrowDown className="h-3.5 w-3.5 transition group-hover:translate-y-0.5" />
                  </div>
                </button>
              );
            })}
          </section>

          {/* Pursuit brief detail */}
          <section id="prospect-detail">
            <Card style={{ borderTop: "4px solid #d29c3c" }}>
              <CardContent className="pt-6">
                {!selectedLead ? (
                  <div
                    className="text-sm"
                    style={{ color: "#1b110b", opacity: 0.6, fontFamily: "Inter, sans-serif" }}
                  >
                    Select a lead to view the pursuit brief.
                  </div>
                ) : (
                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    {/* Left column */}
                    <div>
                      {/* Brief header */}
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                        <div>
                          <div
                            className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                            style={{ color: "#d29c3c", fontFamily: "Inter, sans-serif" }}
                          >
                            Selected Pursuit Brief
                          </div>
                          <h2
                            className="mt-2 text-2xl uppercase"
                            style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, color: "#1b110b" }}
                          >
                            {selectedLead.projectName}
                          </h2>
                          <div
                            className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm"
                            style={{ color: "#1b110b", opacity: 0.65, fontFamily: "Inter, sans-serif" }}
                          >
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-4 w-4" /> {selectedLead.companyName}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" /> {selectedLead.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={statusVariant(selectedLead.status)}
                            style={statusStyle(selectedLead.status)}
                          >
                            {STATUS_LABEL[selectedLead.status] ?? selectedLead.status}
                          </Badge>
                          <Badge variant="outline" style={{ color: "#1b110b", borderColor: "#e6dec2" }}>
                            {STAGE_LABEL[selectedLead.buyingStage] ?? selectedLead.buyingStage}
                          </Badge>
                        </div>
                      </div>

                      {/* Metric tiles */}
                      <div className="mt-6 grid gap-4 md:grid-cols-4">
                        <Metric
                          label="Heat Score"
                          value={`${selectedLead.heatScore}%`}
                          icon={<Flame className="h-4 w-4" />}
                        />
                        <Metric
                          label="Confidence"
                          value={`${selectedLead.confidenceScore}%`}
                          icon={<Target className="h-4 w-4" />}
                        />
                        <Metric
                          label="Project Value"
                          value={formatMoney(selectedLead.estimatedProjectValue)}
                          icon={<CircleDollarSign className="h-4 w-4" />}
                        />
                        <Metric
                          label="Lighting Value"
                          value={formatMoney(selectedLead.estimatedLightingValue)}
                          icon={<CircleDollarSign className="h-4 w-4" />}
                        />
                      </div>

                      {/* Brief blocks */}
                      <div className="mt-6 grid gap-5 md:grid-cols-2">
                        <BriefBlock title="Why This Is Hot">
                          {selectedLead.summary ?? selectedLead.primarySignal}
                        </BriefBlock>
                        <BriefBlock title="Recommended Next Step">
                          {selectedLead.recommendedNextStep ??
                            "Assign an SLS owner, validate the buying committee, and confirm the next construction milestone."}
                        </BriefBlock>
                      </div>

                      {/* Buying signals */}
                      <div className="mt-6">
                        <h3
                          className="text-sm font-semibold uppercase tracking-widest mb-3"
                          style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}
                        >
                          Buying Signals
                        </h3>
                        <div className="space-y-3">
                          {selectedLead.signals.map((signal) => (
                            <div
                              key={signal.id}
                              className="rounded-lg border p-4"
                              style={{ borderColor: "#e6dec2", background: "#f9f9f9" }}
                            >
                              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                                <div>
                                  <div
                                    className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                                    style={{ color: "#d29c3c", fontFamily: "Inter, sans-serif" }}
                                  >
                                    {SIGNAL_LABEL[signal.type] ?? signal.type}
                                  </div>
                                  <div
                                    className="mt-1 font-medium"
                                    style={{ color: "#1b110b", fontFamily: "Inter, sans-serif" }}
                                  >
                                    {signal.title}
                                  </div>
                                </div>
                                <div className="flex gap-2 text-xs">
                                  <span
                                    className="rounded-full px-3 py-1"
                                    style={{ background: "#fff", color: "#1b110b", opacity: 0.7 }}
                                  >
                                    Impact {signal.impactScore}
                                  </span>
                                  <span
                                    className="rounded-full px-3 py-1"
                                    style={{ background: "#fff", color: "#1b110b", opacity: 0.7 }}
                                  >
                                    Confidence {signal.confidenceScore}
                                  </span>
                                </div>
                              </div>
                              {signal.description && (
                                <p
                                  className="mt-3 text-sm"
                                  style={{ color: "#1b110b", opacity: 0.7, fontFamily: "Inter, sans-serif" }}
                                >
                                  {signal.description}
                                </p>
                              )}
                              <div
                                className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs"
                                style={{ color: "#1b110b", opacity: 0.55, fontFamily: "Inter, sans-serif" }}
                              >
                                <span>{formatDate(signal.signalDate)}</span>
                                {signal.sourceName && <span>{signal.sourceName}</span>}
                                {signal.sourceUrl && (
                                  <a
                                    className="inline-flex items-center gap-1 hover:underline"
                                    style={{ color: "#d29c3c" }}
                                    href={signal.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Source <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right aside */}
                    <aside className="space-y-5">
                      {/* Timing card */}
                      <Card style={{ background: "#1b110b", color: "#fff" }}>
                        <CardHeader className="pb-2">
                          <CardTitle style={{ color: "#d29c3c", fontFamily: "Roboto Slab, serif" }}>
                            Pursuit Timing
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                          <TimelineRow label="Decision Window" value={selectedLead.decisionWindow ?? "—"} />
                          <TimelineRow label="Expected Bid" value={formatDate(selectedLead.expectedBidDate)} />
                          <TimelineRow label="Expected Award" value={formatDate(selectedLead.expectedAwardDate)} />
                          <TimelineRow
                            label="Construction Start"
                            value={formatDate(selectedLead.constructionStartDate)}
                          />
                        </CardContent>
                      </Card>

                      {/* Account map */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>
                            Account Map
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <AccountRow label="Owner" value={selectedLead.ownerName} />
                          <AccountRow label="Architect" value={selectedLead.architectName} />
                          <AccountRow label="GC" value={selectedLead.generalContractorName} />
                          <AccountRow label="Electrical Engineer" value={selectedLead.electricalEngineerName} />
                          <AccountRow
                            label="Primary Contact"
                            value={selectedLead.primaryContactName}
                            subvalue={selectedLead.primaryContactTitle}
                          />
                        </CardContent>
                      </Card>

                      {/* Source card */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle style={{ fontFamily: "Roboto Slab, serif", color: "#1b110b" }}>
                            Source
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-start gap-3">
                            <Users className="mt-0.5 h-4 w-4" style={{ color: "#d29c3c" }} />
                            <div>
                              <div
                                className="font-medium"
                                style={{ color: "#1b110b", fontFamily: "Inter, sans-serif" }}
                              >
                                {selectedLead.sourceName ?? "Market intelligence"}
                              </div>
                              <p
                                className="mt-1 text-sm"
                                style={{ color: "#1b110b", opacity: 0.65, fontFamily: "Inter, sans-serif" }}
                              >
                                {selectedLead.notes ??
                                  "Use this section to connect live permit, plan-room, bid, and relationship-intelligence sources."}
                              </p>
                              {selectedLead.sourceUrl && (
                                <a
                                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest hover:underline"
                                  style={{ color: "#d29c3c" }}
                                  href={selectedLead.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open source <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
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
    </div>
  );
}

// ─── Local helper components ──────────────────────────────────────────────────

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "#e6dec2", background: "#f9f9f9" }}>
      <div
        className="flex items-center gap-2 text-xs uppercase tracking-widest"
        style={{ color: "#1b110b", opacity: 0.45, fontFamily: "Inter, sans-serif" }}
      >
        <span style={{ color: "#d29c3c" }}>{icon}</span>
        {label}
      </div>
      <div
        className="mt-2 text-xl"
        style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, color: "#1b110b" }}
      >
        {value}
      </div>
    </div>
  );
}

function BriefBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "#e6dec2", background: "#fff" }}>
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: "#d29c3c", fontFamily: "Inter, sans-serif" }}
      >
        {title}
      </div>
      <p
        className="mt-2 text-sm leading-6"
        style={{ color: "#1b110b", opacity: 0.75, fontFamily: "Inter, sans-serif" }}
      >
        {children}
      </p>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
      style={{ borderColor: "rgba(255,255,255,0.1)" }}
    >
      <span
        className="inline-flex items-center gap-2"
        style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Inter, sans-serif" }}
      >
        <CalendarDays className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-medium" style={{ color: "#fff", fontFamily: "Inter, sans-serif" }}>
        {value}
      </span>
    </div>
  );
}

function AccountRow({
  label,
  value,
  subvalue,
}: {
  label: string;
  value?: string | null;
  subvalue?: string | null;
}) {
  return (
    <div
      className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
      style={{ borderColor: "#e6dec2" }}
    >
      <span
        className="text-xs uppercase tracking-widest"
        style={{ color: "#1b110b", opacity: 0.45, fontFamily: "Inter, sans-serif" }}
      >
        {label}
      </span>
      <span
        className="text-right font-medium"
        style={{ color: "#1b110b", fontFamily: "Inter, sans-serif" }}
      >
        {value ?? "—"}
        {subvalue && (
          <span
            className="block text-xs font-normal"
            style={{ color: "#1b110b", opacity: 0.55 }}
          >
            {subvalue}
          </span>
        )}
      </span>
    </div>
  );
}
