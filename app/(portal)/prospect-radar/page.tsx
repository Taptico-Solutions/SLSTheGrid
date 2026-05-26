"use client";

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
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
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
  if (score >= 70) return "border-sls-gold/40 bg-sls-gold-pale text-sls-gold";
  return "border-sls-sand bg-white text-sls-dark-brown/70";
}

function statusTone(status?: string | null): "approved" | "pending" | "progress" | "rejected" | "review" {
  if (status === "qualified" || status === "won") return "approved";
  if (status === "contacted" || status === "proposal") return "progress";
  if (status === "lost") return "rejected";
  if (status === "researching" || status === "nurture") return "review";
  return "pending";
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
    return <div className="text-sm text-sls-dark-brown/60">Loading Prospect Radar…</div>;
  }

  if (!isInternal) {
    return (
      <>
        <PageHeader
          title="Prospect Radar"
          subtitle="Hot-lead intelligence for the SLS account-based management workflow."
        />
        <EmptyState
          title="Internal access only"
          description="Prospect Radar is reserved for SLS and Taptico internal users because it contains account strategy, buying signals, and opportunity intelligence."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Prospect Radar"
        subtitle="Prioritized hot prospects from construction buying signals, permit movement, plan-room activity, GC activity, and relationship intelligence."
        action={
          <Button
            onClick={() => loadDemo.mutate()}
            disabled={loadDemo.isPending}
            variant="gold"
          >
            <Sparkles size={15} />
            {loadDemo.isPending ? "Loading…" : "Load Demo Leads"}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Hot Leads" value={stats.total} icon={<Radar size={18} />} />
        <StatCard label="Urgent Leads" value={stats.urgent} icon={<Flame size={18} />} />
        <StatCard label="Avg. Heat" value={stats.avgHeat ? `${stats.avgHeat}%` : "—"} icon={<Activity size={18} />} />
        <StatCard label="Lighting Pipeline" value={formatMoney(stats.pipeline)} icon={<CircleDollarSign size={18} />} />
      </div>

      <Card className="mt-6 border-l-4 border-l-sls-gold bg-white">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <CardTitle>Buying Signal Radar</CardTitle>
            <CardContent className="mt-2 max-w-3xl p-0">
              Each card represents a commercial construction opportunity where signal strength, timing, and SLS fit indicate potential lighting demand. Click a card to populate the detailed pursuit brief below.
            </CardContent>
          </div>
          <div className="flex flex-wrap gap-2">
            {[70, 80, 90].map((score) => (
              <Button
                key={score}
                size="sm"
                variant={minHeatScore === score ? "solid" : "ghost"}
                onClick={() => setMinHeatScore(score as 70 | 80 | 90)}
              >
                {score}+ heat
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {leadsQuery.isLoading ? (
        <div className="mt-6 text-sm text-sls-dark-brown/60">Scanning for hot leads…</div>
      ) : leadsQuery.error ? (
        <EmptyState
          title="Prospect Radar is ready for migration"
          description="The page is built, but the new prospect_leads and prospect_signals tables must be migrated before live data can load. Apply drizzle/0003_prospect_radar.sql, then reload demo leads or connect real buying-signal feeds."
        />
      ) : leads.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No hot leads yet"
            description="Load demo leads to preview the account-based management radar, or connect market feeds for permits, plans, bid activity, and construction intelligence."
            action={
              <Button onClick={() => loadDemo.mutate()} disabled={loadDemo.isPending}>
                <Sparkles size={15} /> Load Demo Leads
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {leads.map((lead) => {
              const selected = lead.id === selectedLeadId;
              const topSignals = lead.signals.slice(0, 3);
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelectedId(lead.id)}
                  className={cn(
                    "sls-card group flex h-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:border-sls-gold/60 hover:shadow-sm",
                    selected && "border-sls-gold bg-sls-gold-pale/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sls-dark-brown/50">
                        {lead.marketSector ?? lead.projectType}
                      </div>
                      <h2 className="mt-1 font-slab text-lg uppercase leading-tight text-sls-dark-brown">
                        {lead.projectName}
                      </h2>
                      <div className="mt-2 flex items-center gap-1 text-xs text-sls-dark-brown/60">
                        <MapPin className="h-3.5 w-3.5" />
                        {lead.location}
                      </div>
                    </div>
                    <div className={cn("rounded-xl border px-3 py-2 text-center", heatTone(lead.heatScore))}>
                      <div className="text-[10px] uppercase tracking-widest">Heat</div>
                      <div className="font-slab text-xl leading-none">{lead.heatScore}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone={statusTone(lead.status)}>{STATUS_LABEL[lead.status] ?? lead.status}</Badge>
                    <Badge tone="review">{STAGE_LABEL[lead.buyingStage] ?? lead.buyingStage}</Badge>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm text-sls-dark-brown/75">
                    {lead.primarySignal}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-y border-sls-sand py-3 text-xs text-sls-dark-brown/70">
                    <div>
                      <div className="uppercase tracking-widest text-sls-dark-brown/40">Lighting Value</div>
                      <div className="mt-1 font-semibold text-sls-dark-brown">{formatMoney(lead.estimatedLightingValue)}</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-widest text-sls-dark-brown/40">Decision Window</div>
                      <div className="mt-1 font-semibold text-sls-dark-brown">{lead.decisionWindow ?? "—"}</div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {topSignals.map((signal) => (
                      <div key={signal.id} className="flex items-center justify-between gap-3 rounded-md bg-white/80 px-3 py-2 text-xs">
                        <span className="truncate text-sls-dark-brown/75">{SIGNAL_LABEL[signal.type] ?? signal.type}: {signal.title}</span>
                        <span className="font-semibold text-sls-gold">{signal.impactScore}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sls-gold">
                    View pursuit brief <ArrowDown className="h-3.5 w-3.5 transition group-hover:translate-y-0.5" />
                  </div>
                </button>
              );
            })}
          </section>

          <section className="mt-8" id="prospect-detail">
            <Card className="border-t-4 border-t-sls-gold">
              {!selectedLead ? (
                <div className="text-sm text-sls-dark-brown/60">Select a lead to view the pursuit brief.</div>
              ) : (
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sls-gold">
                          Selected Pursuit Brief
                        </div>
                        <h2 className="mt-2 font-slab text-2xl uppercase text-sls-dark-brown">
                          {selectedLead.projectName}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-sls-dark-brown/65">
                          <span className="inline-flex items-center gap-1"><Building2 className="h-4 w-4" /> {selectedLead.companyName}</span>
                          <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {selectedLead.location}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={statusTone(selectedLead.status)}>{STATUS_LABEL[selectedLead.status] ?? selectedLead.status}</Badge>
                        <Badge tone="review">{STAGE_LABEL[selectedLead.buyingStage] ?? selectedLead.buyingStage}</Badge>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                      <Metric label="Heat Score" value={`${selectedLead.heatScore}%`} icon={<Flame className="h-4 w-4" />} />
                      <Metric label="Confidence" value={`${selectedLead.confidenceScore}%`} icon={<Target className="h-4 w-4" />} />
                      <Metric label="Project Value" value={formatMoney(selectedLead.estimatedProjectValue)} icon={<CircleDollarSign className="h-4 w-4" />} />
                      <Metric label="Lighting Value" value={formatMoney(selectedLead.estimatedLightingValue)} icon={<CircleDollarSign className="h-4 w-4" />} />
                    </div>

                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                      <BriefBlock title="Why This Is Hot">
                        {selectedLead.summary ?? selectedLead.primarySignal}
                      </BriefBlock>
                      <BriefBlock title="Recommended Next Step">
                        {selectedLead.recommendedNextStep ?? "Assign an SLS owner, validate the buying committee, and confirm the next construction milestone."}
                      </BriefBlock>
                    </div>

                    <div className="mt-6">
                      <CardTitle>Buying Signals</CardTitle>
                      <div className="mt-3 space-y-3">
                        {selectedLead.signals.map((signal) => (
                          <div key={signal.id} className="rounded-lg border border-sls-sand bg-sls-off-white p-4">
                            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sls-gold">
                                  {SIGNAL_LABEL[signal.type] ?? signal.type}
                                </div>
                                <div className="mt-1 font-medium text-sls-dark-brown">{signal.title}</div>
                              </div>
                              <div className="flex gap-2 text-xs">
                                <span className="rounded-full bg-white px-3 py-1 text-sls-dark-brown/70">Impact {signal.impactScore}</span>
                                <span className="rounded-full bg-white px-3 py-1 text-sls-dark-brown/70">Confidence {signal.confidenceScore}</span>
                              </div>
                            </div>
                            {signal.description && <p className="mt-3 text-sm text-sls-dark-brown/70">{signal.description}</p>}
                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-sls-dark-brown/55">
                              <span>{formatDate(signal.signalDate)}</span>
                              {signal.sourceName && <span>{signal.sourceName}</span>}
                              {signal.sourceUrl && (
                                <a className="inline-flex items-center gap-1 text-sls-gold hover:underline" href={signal.sourceUrl} target="_blank" rel="noreferrer">
                                  Source <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-5">
                    <Card className="bg-sls-dark-brown text-white">
                      <CardTitle className="text-sls-gold">Pursuit Timing</CardTitle>
                      <div className="mt-4 space-y-3 text-sm text-white/80">
                        <TimelineRow label="Decision Window" value={selectedLead.decisionWindow ?? "—"} />
                        <TimelineRow label="Expected Bid" value={formatDate(selectedLead.expectedBidDate)} />
                        <TimelineRow label="Expected Award" value={formatDate(selectedLead.expectedAwardDate)} />
                        <TimelineRow label="Construction Start" value={formatDate(selectedLead.constructionStartDate)} />
                      </div>
                    </Card>

                    <Card>
                      <CardTitle>Account Map</CardTitle>
                      <div className="mt-4 space-y-3 text-sm">
                        <AccountRow label="Owner" value={selectedLead.ownerName} />
                        <AccountRow label="Architect" value={selectedLead.architectName} />
                        <AccountRow label="GC" value={selectedLead.generalContractorName} />
                        <AccountRow label="Electrical Engineer" value={selectedLead.electricalEngineerName} />
                        <AccountRow label="Primary Contact" value={selectedLead.primaryContactName} subvalue={selectedLead.primaryContactTitle} />
                        <AccountRow label="Assigned Rep" value={selectedLead.assignedRep?.name ?? selectedLead.assignedRep?.email} />
                      </div>
                    </Card>

                    <Card>
                      <CardTitle>Source</CardTitle>
                      <CardContent className="mt-3 p-0">
                        <div className="flex items-start gap-3">
                          <Users className="mt-0.5 h-4 w-4 text-sls-gold" />
                          <div>
                            <div className="font-medium text-sls-dark-brown">{selectedLead.sourceName ?? "Market intelligence"}</div>
                            <p className="mt-1 text-sls-dark-brown/65">{selectedLead.notes ?? "Use this section to connect live permit, plan-room, bid, and relationship-intelligence sources."}</p>
                            {selectedLead.sourceUrl && (
                              <a className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-sls-gold hover:underline" href={selectedLead.sourceUrl} target="_blank" rel="noreferrer">
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
            </Card>
          </section>
        </>
      )}
    </>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-sls-sand bg-sls-off-white p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-sls-dark-brown/45">
        <span className="text-sls-gold">{icon}</span>
        {label}
      </div>
      <div className="mt-2 font-slab text-xl text-sls-dark-brown">{value}</div>
    </div>
  );
}

function BriefBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-sls-sand bg-white p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sls-gold">{title}</div>
      <p className="mt-2 text-sm leading-6 text-sls-dark-brown/75">{children}</p>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <span className="inline-flex items-center gap-2 text-white/55"><CalendarDays className="h-3.5 w-3.5" /> {label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function AccountRow({ label, value, subvalue }: { label: string; value?: string | null; subvalue?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-sls-sand pb-3 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-widest text-sls-dark-brown/45">{label}</span>
      <span className="text-right font-medium text-sls-dark-brown">
        {value ?? "—"}
        {subvalue && <span className="block text-xs font-normal text-sls-dark-brown/55">{subvalue}</span>}
      </span>
    </div>
  );
}
