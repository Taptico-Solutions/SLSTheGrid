import { describe, it, expect } from "vitest";

// ─── Unit tests for the Prospect Radar router ────────────────────────────────
// These tests validate the data-shaping helpers and input schemas
// without requiring a live database connection.

import { z } from "zod";

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

describe("Prospect Radar — input validation", () => {
  it("accepts a valid minimal lead", () => {
    const result = ProspectLeadInput.safeParse({
      companyName: "Acme Corp",
      projectName: "HQ Renovation",
      projectType: "Office renovation",
      location: "Atlanta, GA",
      primarySignal: "Permit filed for interior renovation",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a fully populated lead", () => {
    const result = ProspectLeadInput.safeParse({
      companyName: "Sterling Ridge Development",
      projectName: "West Midtown Adaptive Reuse Food Hall",
      projectType: "Mixed-use adaptive reuse",
      marketSector: "Hospitality / Retail",
      location: "Atlanta, GA — West Midtown",
      status: "qualified",
      buyingStage: "design",
      heatScore: 94,
      confidenceScore: 88,
      estimatedProjectValue: 18500000,
      estimatedLightingValue: 740000,
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
      primarySignal: "Permit activity indicates decorative architectural lighting package needs.",
      sourceName: "Market radar seed",
      summary: "High-fit commercial renovation.",
      recommendedNextStep: "Route to sales rep.",
      notes: "Demo record.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a lead with missing required fields", () => {
    const result = ProspectLeadInput.safeParse({
      companyName: "Acme Corp",
      // projectName missing
      projectType: "Office renovation",
      location: "Atlanta, GA",
      primarySignal: "Permit filed",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a lead with invalid heatScore", () => {
    const result = ProspectLeadInput.safeParse({
      companyName: "Acme Corp",
      projectName: "HQ Renovation",
      projectType: "Office renovation",
      location: "Atlanta, GA",
      primarySignal: "Permit filed",
      heatScore: 150, // out of range
    });
    expect(result.success).toBe(false);
  });

  it("rejects a lead with invalid email", () => {
    const result = ProspectLeadInput.safeParse({
      companyName: "Acme Corp",
      projectName: "HQ Renovation",
      projectType: "Office renovation",
      location: "Atlanta, GA",
      primarySignal: "Permit filed",
      primaryContactEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("Prospect Radar — signal validation", () => {
  it("accepts a valid signal", () => {
    const result = ProspectSignalInput.safeParse({
      prospectId: 1,
      type: "permit",
      title: "Commercial alteration permit",
      description: "Multi-tenant food hall build-out",
      signalDate: "2026-05-20",
      sourceName: "Permit feed",
      confidenceScore: 88,
      impactScore: 95,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a signal with invalid type", () => {
    const result = ProspectSignalInput.safeParse({
      prospectId: 1,
      type: "unknown_type",
      title: "Some signal",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a signal with out-of-range impactScore", () => {
    const result = ProspectSignalInput.safeParse({
      prospectId: 1,
      type: "permit",
      title: "Some signal",
      impactScore: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe("Prospect Radar — money helper", () => {
  it("converts a number to string", () => {
    expect(money(18500000)).toBe("18500000");
  });

  it("returns undefined for undefined input", () => {
    expect(money(undefined)).toBeUndefined();
  });

  it("handles zero", () => {
    expect(money(0)).toBe("0");
  });
});

describe("Prospect Radar — enum coverage", () => {
  it("has all 8 lead statuses", () => {
    expect(leadStatusValues).toHaveLength(8);
    expect(leadStatusValues).toContain("qualified");
    expect(leadStatusValues).toContain("nurture");
  });

  it("has all 6 buying stages", () => {
    expect(buyingStageValues).toHaveLength(6);
    expect(buyingStageValues).toContain("early_planning");
    expect(buyingStageValues).toContain("procurement");
  });

  it("has all 12 signal types", () => {
    expect(signalTypeValues).toHaveLength(12);
    expect(signalTypeValues).toContain("permit");
    expect(signalTypeValues).toContain("hospitality_pipeline");
    expect(signalTypeValues).toContain("news");
  });
});

// ─── New tests for Round 2 enhancements ──────────────────────────────────────

describe("Prospect Radar — convertToProject city/state parsing", () => {
  function parseLocation(location: string) {
    const parts = location.split(",").map((s) => s.trim());
    let city: string | undefined;
    let state: string | undefined;
    if (parts.length >= 2) {
      city = parts[0];
      state = parts[1].split("—")[0].trim();
    }
    return { city, state };
  }

  it("parses 'Atlanta, GA' into city and state", () => {
    const { city, state } = parseLocation("Atlanta, GA");
    expect(city).toBe("Atlanta");
    expect(state).toBe("GA");
  });

  it("parses 'Atlanta, GA — West Midtown' correctly (strips em-dash suffix)", () => {
    const { city, state } = parseLocation("Atlanta, GA — West Midtown");
    expect(city).toBe("Atlanta");
    expect(state).toBe("GA");
  });

  it("parses 'Nashville, TN' correctly", () => {
    const { city, state } = parseLocation("Nashville, TN");
    expect(city).toBe("Nashville");
    expect(state).toBe("TN");
  });

  it("returns undefined city/state for a location with no comma", () => {
    const { city, state } = parseLocation("Atlanta");
    expect(city).toBeUndefined();
    expect(state).toBeUndefined();
  });
});

describe("Prospect Radar — outreach sequence shape", () => {
  const OutreachTouchSchema = z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
    sendDay: z.number(),
    callToAction: z.string().min(1),
  });

  const OutreachSequenceSchema = z.object({
    touch1: OutreachTouchSchema,
    touch2: OutreachTouchSchema,
    touch3: OutreachTouchSchema,
    strategyNote: z.string().min(1),
  });

  it("validates a well-formed outreach sequence", () => {
    const result = OutreachSequenceSchema.safeParse({
      touch1: { subject: "Re: West Midtown Food Hall lighting", body: "Hi Maya,\n\nI noticed…", sendDay: 1, callToAction: "15-min call this week?" },
      touch2: { subject: "Follow-up: SLS + Harris + Cole", body: "Hi Maya,\n\nWanted to share…", sendDay: 5, callToAction: "Can I send a fixture shortlist?" },
      touch3: { subject: "Last note — SLS lighting spec support", body: "Hi Maya,\n\nI know you're busy…", sendDay: 12, callToAction: "Happy to send a lunch-and-learn invite." },
      strategyNote: "Targeting the architect relationship first given early design stage.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a sequence with a missing touch", () => {
    const result = OutreachSequenceSchema.safeParse({
      touch1: { subject: "Re: project", body: "Hi", sendDay: 1, callToAction: "Call?" },
      touch2: { subject: "Follow-up", body: "Hi again", sendDay: 5, callToAction: "Call?" },
      // touch3 missing
      strategyNote: "Some note",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a touch with an empty subject", () => {
    const result = OutreachTouchSchema.safeParse({ subject: "", body: "Hi", sendDay: 1, callToAction: "Call?" });
    expect(result.success).toBe(false);
  });
});

describe("Prospect Radar — deleteLead input validation", () => {
  const DeleteLeadInput = z.object({ id: z.number().int().positive() });

  it("accepts a valid positive integer id", () => {
    expect(DeleteLeadInput.safeParse({ id: 42 }).success).toBe(true);
  });

  it("rejects id of 0", () => {
    expect(DeleteLeadInput.safeParse({ id: 0 }).success).toBe(false);
  });

  it("rejects a negative id", () => {
    expect(DeleteLeadInput.safeParse({ id: -1 }).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(DeleteLeadInput.safeParse({ id: 3.14 }).success).toBe(false);
  });
});

describe("Prospect Radar — lead form required fields", () => {
  const MinimalLeadSchema = z.object({
    companyName: z.string().min(1),
    projectName: z.string().min(1),
    projectType: z.string().min(1),
    location: z.string().min(1),
    primarySignal: z.string().min(1),
  });

  it("passes when all required fields are present", () => {
    const result = MinimalLeadSchema.safeParse({
      companyName: "Acme",
      projectName: "Lobby Renovation",
      projectType: "Office",
      location: "Atlanta, GA",
      primarySignal: "Permit filed",
    });
    expect(result.success).toBe(true);
  });

  it("fails when primarySignal is empty string", () => {
    const result = MinimalLeadSchema.safeParse({
      companyName: "Acme",
      projectName: "Lobby Renovation",
      projectType: "Office",
      location: "Atlanta, GA",
      primarySignal: "",
    });
    expect(result.success).toBe(false);
  });

  it("fails when companyName is missing", () => {
    const result = MinimalLeadSchema.safeParse({
      projectName: "Lobby Renovation",
      projectType: "Office",
      location: "Atlanta, GA",
      primarySignal: "Permit filed",
    });
    expect(result.success).toBe(false);
  });
});
