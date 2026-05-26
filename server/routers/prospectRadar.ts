import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import {
  INTERNAL_ROLES,
  prospectLeads,
  prospectSignals,
} from "../../drizzle/schema";
import { getDb } from "../db";

const leadStatusValues = [
  "new",
  "researching",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
  "nurture",
] as const;

const buyingStageValues = [
  "early_planning",
  "design",
  "pricing",
  "bidding",
  "awarded",
  "procurement",
] as const;

const signalTypeValues = [
  "permit",
  "plan_room",
  "construction_start",
  "architect_activity",
  "gc_award",
  "budget_approved",
  "renovation",
  "tenant_improvement",
  "hospitality_pipeline",
  "municipal_bid",
  "relationship",
  "news",
] as const;

function requireInternal(role: string) {
  if (!INTERNAL_ROLES.includes(role as any)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

const ProspectLeadInput = z.object({
  companyName: z.string().min(1).max(255),
  projectName: z.string().min(1).max(255),
  projectType: z.string().min(1).max(128),
  marketSector: z.string().max(128).optional(),
  location: z.string().min(1).max(255),
  status: z.enum(leadStatusValues).optional(),
  buyingStage: z.enum(buyingStageValues).optional(),
  heatScore: z.number().int().min(0).max(100).optional(),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  estimatedProjectValue: z.number().nonnegative().optional(),
  estimatedLightingValue: z.number().nonnegative().optional(),
  decisionWindow: z.string().max(128).optional(),
  expectedBidDate: z.string().optional(),
  expectedAwardDate: z.string().optional(),
  constructionStartDate: z.string().optional(),
  ownerName: z.string().max(255).optional(),
  architectName: z.string().max(255).optional(),
  generalContractorName: z.string().max(255).optional(),
  electricalEngineerName: z.string().max(255).optional(),
  primaryContactName: z.string().max(255).optional(),
  primaryContactTitle: z.string().max(255).optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().max(64).optional(),
  primarySignal: z.string().min(1).max(255),
  sourceName: z.string().max(255).optional(),
  sourceUrl: z.string().url().optional(),
  summary: z.string().optional(),
  recommendedNextStep: z.string().optional(),
  notes: z.string().optional(),
  assignedRepId: z.number().int().positive().optional(),
});

const ProspectSignalInput = z.object({
  prospectId: z.number().int().positive(),
  type: z.enum(signalTypeValues),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  signalDate: z.string().optional(),
  sourceName: z.string().max(255).optional(),
  sourceUrl: z.string().url().optional(),
  confidenceScore: z.number().int().min(0).max(100).optional(),
  impactScore: z.number().int().min(0).max(100).optional(),
});

function money(value?: number) {
  return value === undefined ? undefined : value.toString();
}

const demoProspects = [
  {
    lead: {
      companyName: "Sterling Ridge Development",
      projectName: "West Midtown Adaptive Reuse Food Hall",
      projectType: "Mixed-use adaptive reuse",
      marketSector: "Hospitality / Retail",
      location: "Atlanta, GA — West Midtown",
      status: "qualified" as const,
      buyingStage: "design" as const,
      heatScore: 94,
      confidenceScore: 88,
      estimatedProjectValue: "18500000",
      estimatedLightingValue: "740000",
      decisionWindow: "Next 30–45 days",
      expectedBidDate: "2026-06-18",
      expectedAwardDate: "2026-07-10",
      constructionStartDate: "2026-08-03",
      ownerName: "Sterling Ridge Development",
      architectName: "Harris + Cole Studio",
      generalContractorName: "Peachtree Commercial Builders",
      electricalEngineerName: "BrightLine MEP",
      primaryContactName: "Maya Reynolds",
      primaryContactTitle: "Development Manager",
      primaryContactEmail: "maya.reynolds@example.com",
      primarySignal:
        "Permit activity and food hall renovation scope indicate decorative architectural lighting package needs.",
      sourceName: "Illustrative market radar seed",
      summary:
        "High-fit commercial renovation with public-facing hospitality zones, premium fixture requirements, and an active design-to-pricing window. SLS should pursue architect and GC influence before bid documents are finalized.",
      recommendedNextStep:
        "Route to sales rep for architect introduction, then provide concept fixture alternates and manufacturer shortlist within one week.",
      notes: "Demo radar record for account-based management workflow validation.",
    },
    signals: [
      {
        type: "permit" as const,
        title: "Commercial alteration permit signal",
        description:
          "Permit language suggests a multi-tenant food hall build-out with updated electrical and finish scopes.",
        signalDate: "2026-05-20",
        sourceName: "Illustrative permit feed",
        confidenceScore: 88,
        impactScore: 95,
      },
      {
        type: "plan_room" as const,
        title: "Plan-room pricing window opening",
        description:
          "Early pricing package appears likely within 30–45 days based on timeline and contractor activity.",
        signalDate: "2026-05-23",
        sourceName: "Illustrative plan-room feed",
        confidenceScore: 82,
        impactScore: 90,
      },
      {
        type: "renovation" as const,
        title: "Adaptive reuse scope",
        description:
          "Historic shell plus hospitality use case increases need for decorative, architectural, and code-compliant lighting coordination.",
        signalDate: "2026-05-24",
        sourceName: "Manual sales research",
        confidenceScore: 85,
        impactScore: 89,
      },
    ],
  },
  {
    lead: {
      companyName: "Northlake Health Partners",
      projectName: "Northlake Ambulatory Care Center Expansion",
      projectType: "Medical office expansion",
      marketSector: "Healthcare",
      location: "Tucker, GA",
      status: "researching" as const,
      buyingStage: "early_planning" as const,
      heatScore: 87,
      confidenceScore: 76,
      estimatedProjectValue: "32000000",
      estimatedLightingValue: "980000",
      decisionWindow: "Next 60–90 days",
      expectedBidDate: "2026-07-28",
      constructionStartDate: "2026-10-01",
      ownerName: "Northlake Health Partners",
      architectName: "Forma Health Design",
      generalContractorName: "TBD",
      electricalEngineerName: "TBD",
      primarySignal:
        "Healthcare expansion planning points to exam-room, corridor, exterior, and controls package opportunity.",
      sourceName: "Illustrative market radar seed",
      summary:
        "Large healthcare prospect with meaningful lighting value and early enough timing for basis-of-design influence. Decision makers are not fully mapped, so research and relationship routing are the immediate needs.",
      recommendedNextStep:
        "Identify electrical engineer and owner facilities contact, then prepare healthcare controls and low-glare fixture positioning.",
      notes: "Demo radar record for account-based management workflow validation.",
    },
    signals: [
      {
        type: "news" as const,
        title: "Expansion planning mention",
        description:
          "Public market chatter indicates ambulatory expansion planning and capital allocation.",
        signalDate: "2026-05-14",
        sourceName: "Illustrative news monitoring",
        confidenceScore: 72,
        impactScore: 86,
      },
      {
        type: "architect_activity" as const,
        title: "Architect specialty fit",
        description:
          "Healthcare design partner appears aligned with project type and could influence specification early.",
        signalDate: "2026-05-21",
        sourceName: "Manual sales research",
        confidenceScore: 78,
        impactScore: 82,
      },
    ],
  },
  {
    lead: {
      companyName: "Chattahoochee Logistics Group",
      projectName: "South Fulton Distribution Campus Phase II",
      projectType: "Industrial distribution",
      marketSector: "Industrial",
      location: "South Fulton, GA",
      status: "contacted" as const,
      buyingStage: "bidding" as const,
      heatScore: 82,
      confidenceScore: 84,
      estimatedProjectValue: "56000000",
      estimatedLightingValue: "1250000",
      decisionWindow: "Next 14–21 days",
      expectedBidDate: "2026-06-07",
      expectedAwardDate: "2026-06-28",
      constructionStartDate: "2026-08-17",
      ownerName: "Chattahoochee Logistics Group",
      architectName: "Wareline Design",
      generalContractorName: "Summit Tilt-Up Construction",
      electricalEngineerName: "Piedmont Electrical Consulting",
      primaryContactName: "Grant Wallace",
      primaryContactTitle: "Preconstruction Manager",
      primaryContactEmail: "grant.wallace@example.com",
      primarySignal:
        "GC award and accelerated bid timing signal an immediate high-bay and site-lighting package opportunity.",
      sourceName: "Illustrative market radar seed",
      summary:
        "Industrial project is late-stage and time-sensitive. SLS should focus on responsiveness, high-bay availability, controls compliance, and value-engineered alternates.",
      recommendedNextStep:
        "Schedule preconstruction call, confirm fixture schedule gaps, and submit high-bay/site-lighting package alternates within 72 hours.",
      notes: "Demo radar record for account-based management workflow validation.",
    },
    signals: [
      {
        type: "gc_award" as const,
        title: "General contractor identified",
        description:
          "Named GC indicates the project has moved from planning toward active procurement and bid coordination.",
        signalDate: "2026-05-19",
        sourceName: "Illustrative GC award feed",
        confidenceScore: 86,
        impactScore: 88,
      },
      {
        type: "construction_start" as const,
        title: "Phase II start window approaching",
        description:
          "Construction start timing creates urgency for lighting submittals, long-lead fixture strategy, and controls coordination.",
        signalDate: "2026-05-25",
        sourceName: "Manual sales research",
        confidenceScore: 82,
        impactScore: 84,
      },
    ],
  },
  {
    lead: {
      companyName: "City of Marietta Facilities",
      projectName: "Downtown Civic Center Modernization",
      projectType: "Municipal renovation",
      marketSector: "Civic / Institutional",
      location: "Marietta, GA",
      status: "new" as const,
      buyingStage: "pricing" as const,
      heatScore: 78,
      confidenceScore: 70,
      estimatedProjectValue: "9400000",
      estimatedLightingValue: "360000",
      decisionWindow: "Next 45–60 days",
      expectedBidDate: "2026-07-02",
      constructionStartDate: "2026-09-15",
      ownerName: "City of Marietta Facilities",
      architectName: "CivicWorks Architecture",
      generalContractorName: "TBD",
      electricalEngineerName: "Apex MEP Group",
      primarySignal:
        "Municipal modernization and bid preparation indicate auditorium, exterior, and public-space lighting needs.",
      sourceName: "Illustrative market radar seed",
      summary:
        "Civic renovation has a moderate-to-high fit for SLS because public spaces require durable, attractive lighting with documentation support. Procurement rules may require early spec influence and compliant alternates.",
      recommendedNextStep:
        "Map procurement requirements, contact electrical engineer, and prepare compliant fixture families with public-space case references.",
      notes: "Demo radar record for account-based management workflow validation.",
    },
    signals: [
      {
        type: "municipal_bid" as const,
        title: "Municipal bid preparation",
        description:
          "Bid timing appears to be moving into pricing preparation, with a likely public procurement process.",
        signalDate: "2026-05-22",
        sourceName: "Illustrative municipal bid feed",
        confidenceScore: 70,
        impactScore: 78,
      },
      {
        type: "budget_approved" as const,
        title: "Capital improvement alignment",
        description:
          "Project scope aligns with funded public-facility modernization work.",
        signalDate: "2026-05-16",
        sourceName: "Manual sales research",
        confidenceScore: 68,
        impactScore: 74,
      },
    ],
  },
];

export const prospectRadarRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(leadStatusValues).optional(),
          buyingStage: z.enum(buyingStageValues).optional(),
          minHeatScore: z.number().int().min(0).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      requireInternal(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const filters = [
        input?.status ? eq(prospectLeads.status, input.status) : undefined,
        input?.buyingStage ? eq(prospectLeads.buyingStage, input.buyingStage) : undefined,
        input?.minHeatScore !== undefined
          ? gte(prospectLeads.heatScore, input.minHeatScore)
          : undefined,
      ].filter(Boolean) as any[];

      const leads = await db
        .select()
        .from(prospectLeads)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(prospectLeads.heatScore), desc(prospectLeads.updatedAt));

      // Attach signals for each lead
      const leadIds = leads.map((l) => l.id);
      const signals =
        leadIds.length > 0
          ? await db
              .select()
              .from(prospectSignals)
              .where(inArray(prospectSignals.prospectId, leadIds))
          : [];

      return leads.map((lead) => ({
        ...lead,
        signals: signals.filter((s) => s.prospectId === lead.id),
      }));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      requireInternal(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [lead] = await db
        .select()
        .from(prospectLeads)
        .where(eq(prospectLeads.id, input.id));
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      const signals = await db
        .select()
        .from(prospectSignals)
        .where(eq(prospectSignals.prospectId, input.id));

      return { ...lead, signals };
    }),

  create: protectedProcedure.input(ProspectLeadInput).mutation(async ({ ctx, input }) => {
    requireInternal(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const { estimatedProjectValue, estimatedLightingValue, ...rest } = input;
    const result = await db.insert(prospectLeads).values({
      ...rest,
      estimatedProjectValue: money(estimatedProjectValue),
      estimatedLightingValue: money(estimatedLightingValue),
      createdBy: ctx.user.id,
    });
    const [row] = await db
      .select()
      .from(prospectLeads)
      .where(eq(prospectLeads.id, (result as any).insertId));
    return row;
  }),

  update: protectedProcedure
    .input(ProspectLeadInput.partial().extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireInternal(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { id, estimatedProjectValue, estimatedLightingValue, ...rest } = input;
      await db
        .update(prospectLeads)
        .set({
          ...rest,
          ...(estimatedProjectValue !== undefined
            ? { estimatedProjectValue: money(estimatedProjectValue) }
            : {}),
          ...(estimatedLightingValue !== undefined
            ? { estimatedLightingValue: money(estimatedLightingValue) }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(prospectLeads.id, id));
      const [row] = await db
        .select()
        .from(prospectLeads)
        .where(eq(prospectLeads.id, id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  addSignal: protectedProcedure.input(ProspectSignalInput).mutation(async ({ ctx, input }) => {
    requireInternal(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const [lead] = await db
      .select({ id: prospectLeads.id })
      .from(prospectLeads)
      .where(eq(prospectLeads.id, input.prospectId));
    if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
    const result = await db.insert(prospectSignals).values(input);
    await db
      .update(prospectLeads)
      .set({ updatedAt: new Date() })
      .where(eq(prospectLeads.id, input.prospectId));
    const [row] = await db
      .select()
      .from(prospectSignals)
      .where(eq(prospectSignals.id, (result as any).insertId));
    return row;
  }),

  loadDemo: protectedProcedure.mutation(async ({ ctx }) => {
    requireInternal(ctx.user.role);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const projectNames = demoProspects.map((p) => p.lead.projectName);
    const existing = await db
      .select({ id: prospectLeads.id })
      .from(prospectLeads)
      .where(inArray(prospectLeads.projectName, projectNames));

    if (existing.length > 0) {
      return { ok: true, created: 0, skipped: existing.length };
    }

    for (const prospect of demoProspects) {
      const result = await db.insert(prospectLeads).values({
        ...prospect.lead,
        assignedRepId: ctx.user.id,
        createdBy: ctx.user.id,
      });
      const leadId = (result as any).insertId as number;
      if (prospect.signals.length > 0) {
        await db.insert(prospectSignals).values(
          prospect.signals.map((signal) => ({
            ...signal,
            prospectId: leadId,
          })),
        );
      }
    }

    return { ok: true, created: demoProspects.length, skipped: 0 };
  }),
});
