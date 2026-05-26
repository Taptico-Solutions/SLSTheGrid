import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Unit tests for the Pursuits (Chase List) router ─────────────────────────
// These tests validate the input schemas, column mapping logic, and
// stats aggregation helpers without requiring a live database connection.

// ── Zod schemas mirroring the router's input validators ──────────────────────
const VALID_STAGES = ["identified", "qualifying", "proposal", "negotiation", "won", "lost", "on_hold"] as const;
const VALID_PRIORITIES = ["low", "medium", "high", "critical"] as const;
const VALID_SOURCES = [
  "referral",
  "cold_outreach",
  "inbound",
  "trade_show",
  "existing_client",
  "architect_spec",
  "gc_relationship",
  "permit_data",
  "other",
] as const;
const VALID_ACTIVITY_TYPES = ["note", "call", "email", "meeting", "follow_up"] as const;

const PursuitCreateInput = z.object({
  companyName: z.string().min(1).max(255),
  projectName: z.string().min(1).max(255),
  projectType: z.string().optional(),
  marketSector: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stage: z.enum(VALID_STAGES).optional(),
  priority: z.enum(VALID_PRIORITIES).optional(),
  source: z.enum(VALID_SOURCES).optional(),
  estimatedValue: z.string().optional(),
  lightingValue: z.string().optional(),
  winProbability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional(),
  primaryContactPhone: z.string().optional(),
  ownerName: z.string().optional(),
  architectName: z.string().optional(),
  generalContractorName: z.string().optional(),
  assignedRepId: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const BulkImportRowInput = z.object({
  companyName: z.string().min(1),
  projectName: z.string().min(1),
  projectType: z.string().optional(),
  marketSector: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stage: z.string().optional(),
  priority: z.string().optional(),
  source: z.string().optional(),
  estimatedValue: z.string().optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().optional(),
  primaryContactPhone: z.string().optional(),
  ownerName: z.string().optional(),
  architectName: z.string().optional(),
  generalContractorName: z.string().optional(),
  notes: z.string().optional(),
});

const AddActivityInput = z.object({
  pursuitId: z.number().int(),
  type: z.enum(VALID_ACTIVITY_TYPES),
  title: z.string().min(1).max(255),
  body: z.string().optional(),
});

// ── Column mapping helper (mirrors the Pursuits.tsx client-side logic) ────────
function mapRowToFields(raw: Record<string, string>): Record<string, string | undefined> {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[\s_\-]+/g, "_").replace(/[^a-z0-9_]/g, "");

  const fieldMap: Record<string, string> = {
    name: "companyName",
    company: "companyName",
    company_name: "companyName",
    account: "companyName",
    project: "projectName",
    project_name: "projectName",
    opportunity: "projectName",
    type: "projectType",
    project_type: "projectType",
    sector: "marketSector",
    market_sector: "marketSector",
    city: "city",
    state: "state",
    stage: "stage",
    priority: "priority",
    source: "source",
    value: "estimatedValue",
    estimated_value: "estimatedValue",
    budget: "estimatedValue",
    contact: "primaryContactName",
    contact_name: "primaryContactName",
    primary_contact: "primaryContactName",
    email: "primaryContactEmail",
    phone: "primaryContactPhone",
    owner: "ownerName",
    architect: "architectName",
    gc: "generalContractorName",
    general_contractor: "generalContractorName",
    notes: "notes",
    roles_to_target: "notes",
  };

  const result: Record<string, string | undefined> = {};
  for (const [rawKey, value] of Object.entries(raw)) {
    const normalizedKey = normalize(rawKey);
    const mappedField = fieldMap[normalizedKey];
    if (mappedField && value) {
      result[mappedField] = value;
    }
  }
  return result;
}

// ── Stats aggregation helper ──────────────────────────────────────────────────
function computeStats(rows: Array<{ stage: string; estimatedValue: string | null }>) {
  const byStage: Record<string, number> = {};
  let totalValue = 0;
  for (const r of rows) {
    byStage[r.stage] = (byStage[r.stage] ?? 0) + 1;
    if (r.estimatedValue) totalValue += parseFloat(r.estimatedValue);
  }
  return { total: rows.length, byStage, totalValue };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("pursuits router", () => {
  describe("PursuitCreateInput schema", () => {
    it("accepts a minimal valid pursuit (company + project only)", () => {
      const result = PursuitCreateInput.safeParse({
        companyName: "Acme Corp",
        projectName: "Downtown Hotel Renovation",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a fully populated pursuit", () => {
      const result = PursuitCreateInput.safeParse({
        companyName: "Biltmore Properties",
        projectName: "Ponce City Market Phase 2",
        projectType: "Hospitality",
        marketSector: "Hotel & Lodging",
        city: "Atlanta",
        state: "GA",
        stage: "proposal",
        priority: "high",
        source: "architect_spec",
        estimatedValue: "850000",
        lightingValue: "120000",
        winProbability: 65,
        primaryContactName: "Jane Smith",
        primaryContactEmail: "jane@biltmore.com",
        primaryContactPhone: "404-555-1234",
        ownerName: "Biltmore Properties LLC",
        architectName: "Cooper Carry",
        generalContractorName: "Brasfield & Gorrie",
        notes: "Strong relationship with architect",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a pursuit with empty companyName", () => {
      const result = PursuitCreateInput.safeParse({
        companyName: "",
        projectName: "Some Project",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a pursuit with invalid email format", () => {
      const result = PursuitCreateInput.safeParse({
        companyName: "Acme",
        projectName: "Project X",
        primaryContactEmail: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects winProbability outside 0-100 range", () => {
      const result = PursuitCreateInput.safeParse({
        companyName: "Acme",
        projectName: "Project X",
        winProbability: 150,
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid stage value", () => {
      const result = PursuitCreateInput.safeParse({
        companyName: "Acme",
        projectName: "Project X",
        stage: "unknown_stage" as any,
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid stage values", () => {
      for (const stage of VALID_STAGES) {
        const result = PursuitCreateInput.safeParse({
          companyName: "Acme",
          projectName: "Project X",
          stage,
        });
        expect(result.success, `stage "${stage}" should be valid`).toBe(true);
      }
    });

    it("accepts all valid priority values", () => {
      for (const priority of VALID_PRIORITIES) {
        const result = PursuitCreateInput.safeParse({
          companyName: "Acme",
          projectName: "Project X",
          priority,
        });
        expect(result.success, `priority "${priority}" should be valid`).toBe(true);
      }
    });
  });

  describe("BulkImportRowInput schema", () => {
    it("accepts a valid import row with company and project", () => {
      const result = BulkImportRowInput.safeParse({
        companyName: "Acme Corp",
        projectName: "Office Fit-Out",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a row with empty companyName", () => {
      const result = BulkImportRowInput.safeParse({
        companyName: "",
        projectName: "Office Fit-Out",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a row with unknown stage string (router normalizes it)", () => {
      const result = BulkImportRowInput.safeParse({
        companyName: "Acme",
        projectName: "Project X",
        stage: "some_unknown_stage",
      });
      // The router normalizes unknown stages to "identified"
      expect(result.success).toBe(true);
    });
  });

  describe("column mapping helper", () => {
    it("maps 'Name' column to companyName", () => {
      const mapped = mapRowToFields({ Name: "Acme Corp" });
      expect(mapped.companyName).toBe("Acme Corp");
    });

    it("maps 'Type' column to projectType", () => {
      const mapped = mapRowToFields({ Type: "Healthcare" });
      expect(mapped.projectType).toBe("Healthcare");
    });

    it("maps 'Roles to Target' column to notes", () => {
      const mapped = mapRowToFields({ "Roles to Target": "Architect, GC" });
      expect(mapped.notes).toBe("Architect, GC");
    });

    it("maps 'Company Name' column to companyName", () => {
      const mapped = mapRowToFields({ "Company Name": "Biltmore Properties" });
      expect(mapped.companyName).toBe("Biltmore Properties");
    });

    it("maps 'Estimated Value' column to estimatedValue", () => {
      const mapped = mapRowToFields({ "Estimated Value": "500000" });
      expect(mapped.estimatedValue).toBe("500000");
    });

    it("ignores empty values", () => {
      const mapped = mapRowToFields({ Name: "", Type: "Healthcare" });
      expect(mapped.companyName).toBeUndefined();
      expect(mapped.projectType).toBe("Healthcare");
    });

    it("handles mixed-case and space-separated column names", () => {
      const mapped = mapRowToFields({ "General Contractor": "Brasfield & Gorrie" });
      expect(mapped.generalContractorName).toBe("Brasfield & Gorrie");
    });
  });

  describe("stats aggregation", () => {
    it("returns zero stats for empty dataset", () => {
      const stats = computeStats([]);
      expect(stats.total).toBe(0);
      expect(stats.totalValue).toBe(0);
      expect(stats.byStage).toEqual({});
    });

    it("counts pursuits by stage correctly", () => {
      const rows = [
        { stage: "proposal", estimatedValue: "100000" },
        { stage: "proposal", estimatedValue: "200000" },
        { stage: "qualifying", estimatedValue: null },
        { stage: "won", estimatedValue: "500000" },
      ];
      const stats = computeStats(rows);
      expect(stats.total).toBe(4);
      expect(stats.byStage.proposal).toBe(2);
      expect(stats.byStage.qualifying).toBe(1);
      expect(stats.byStage.won).toBe(1);
    });

    it("sums estimatedValue correctly, ignoring nulls", () => {
      const rows = [
        { stage: "proposal", estimatedValue: "100000" },
        { stage: "won", estimatedValue: null },
        { stage: "qualifying", estimatedValue: "250000" },
      ];
      const stats = computeStats(rows);
      expect(stats.totalValue).toBe(350000);
    });
  });

  describe("AddActivityInput schema", () => {
    it("accepts a valid note activity", () => {
      const result = AddActivityInput.safeParse({
        pursuitId: 1,
        type: "note",
        title: "Initial contact made",
        body: "Spoke with Jane about the project timeline.",
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid activity types", () => {
      for (const type of VALID_ACTIVITY_TYPES) {
        const result = AddActivityInput.safeParse({
          pursuitId: 1,
          type,
          title: "Activity",
        });
        expect(result.success, `activity type "${type}" should be valid`).toBe(true);
      }
    });

    it("rejects an invalid activity type", () => {
      const result = AddActivityInput.safeParse({
        pursuitId: 1,
        type: "unknown_type" as any,
        title: "Activity",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty title", () => {
      const result = AddActivityInput.safeParse({
        pursuitId: 1,
        type: "note",
        title: "",
      });
      expect(result.success).toBe(false);
    });
  });
});
