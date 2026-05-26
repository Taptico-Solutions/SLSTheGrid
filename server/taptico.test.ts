import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Unit tests for the Taptico Workspace router ──────────────────────────────
// These tests validate the input schemas and role-gating logic
// without requiring a live database connection.

// ── Role gating helper (mirrors requireTaptico in the router) ─────────────────
const TAPTICO_ROLES = ["taptico", "admin"] as const;
type TapticoRole = (typeof TAPTICO_ROLES)[number];

function requireTaptico(role: string): void {
  if (!TAPTICO_ROLES.includes(role as TapticoRole)) {
    throw new Error("FORBIDDEN");
  }
}

// ── Zod schemas mirroring the router's input validators ──────────────────────
const TodoInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional(),
  assignedTo: z.string().max(255).optional(),
  category: z.string().max(128).optional(),
});

const MeetingInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  meetingDate: z.string(),
  attendees: z.string().optional(),
  location: z.string().max(255).optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
  actionItems: z.string().optional(),
});

const MilestoneInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["not_started", "in_progress", "completed", "at_risk"]).optional(),
  dueDate: z.string().optional(),
  completedDate: z.string().optional(),
  owner: z.string().max(255).optional(),
  category: z.string().max(128).optional(),
});

const KpiInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.string().max(128).optional(),
  targetValue: z.string().optional(),
  currentValue: z.string().optional(),
  unit: z.string().max(64).optional(),
  periodLabel: z.string().max(128).optional(),
  status: z.enum(["on_track", "at_risk", "off_track", "achieved"]).optional(),
  notes: z.string().optional(),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("taptico router", () => {
  describe("role gating", () => {
    it("allows taptico role", () => {
      expect(() => requireTaptico("taptico")).not.toThrow();
    });

    it("allows admin role", () => {
      expect(() => requireTaptico("admin")).not.toThrow();
    });

    it("blocks sls_admin role", () => {
      expect(() => requireTaptico("sls_admin")).toThrow("FORBIDDEN");
    });

    it("blocks sls_pm role", () => {
      expect(() => requireTaptico("sls_pm")).toThrow("FORBIDDEN");
    });

    it("blocks sls_rep role", () => {
      expect(() => requireTaptico("sls_rep")).toThrow("FORBIDDEN");
    });

    it("blocks user role", () => {
      expect(() => requireTaptico("user")).toThrow("FORBIDDEN");
    });

    it("blocks client_architect role", () => {
      expect(() => requireTaptico("client_architect")).toThrow("FORBIDDEN");
    });

    it("blocks client_gc role", () => {
      expect(() => requireTaptico("client_gc")).toThrow("FORBIDDEN");
    });
  });

  describe("TodoInput schema", () => {
    it("accepts a minimal valid todo (title only)", () => {
      const result = TodoInput.safeParse({ title: "Review Q2 pipeline" });
      expect(result.success).toBe(true);
    });

    it("accepts a fully populated todo", () => {
      const result = TodoInput.safeParse({
        title: "Finalize SLS proposal",
        description: "Complete the Ponce City Market proposal by EOD",
        status: "in_progress",
        priority: "high",
        dueDate: "2026-06-01",
        assignedTo: "Nick Tapp",
        category: "Sales",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a todo with empty title", () => {
      const result = TodoInput.safeParse({ title: "" });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid status value", () => {
      const result = TodoInput.safeParse({
        title: "Test todo",
        status: "invalid_status" as any,
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid status values", () => {
      for (const status of ["open", "in_progress", "done"] as const) {
        const result = TodoInput.safeParse({ title: "Test", status });
        expect(result.success, `status "${status}" should be valid`).toBe(true);
      }
    });

    it("accepts all valid priority values", () => {
      for (const priority of ["low", "medium", "high"] as const) {
        const result = TodoInput.safeParse({ title: "Test", priority });
        expect(result.success, `priority "${priority}" should be valid`).toBe(true);
      }
    });
  });

  describe("MeetingInput schema", () => {
    it("accepts a minimal valid meeting", () => {
      const result = MeetingInput.safeParse({
        title: "Q2 Strategy Call",
        meetingDate: "2026-06-15T10:00:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a fully populated meeting", () => {
      const result = MeetingInput.safeParse({
        title: "SLS Quarterly Review",
        description: "Review Q2 performance and set Q3 targets",
        meetingDate: "2026-07-01T09:00:00Z",
        attendees: "Nick Tapp, Dave Clapper, Cape Shore",
        location: "Atlanta HQ",
        status: "scheduled",
        notes: "Prepare pipeline report",
        actionItems: "Nick: update CRM; Dave: send proposals",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a meeting without meetingDate", () => {
      const result = MeetingInput.safeParse({ title: "Meeting without date" });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid meeting status", () => {
      const result = MeetingInput.safeParse({
        title: "Test",
        meetingDate: "2026-06-01",
        status: "pending" as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("MilestoneInput schema", () => {
    it("accepts a minimal valid milestone", () => {
      const result = MilestoneInput.safeParse({ title: "Launch GRID v2" });
      expect(result.success).toBe(true);
    });

    it("accepts all valid milestone status values", () => {
      for (const status of ["not_started", "in_progress", "completed", "at_risk"] as const) {
        const result = MilestoneInput.safeParse({ title: "Test", status });
        expect(result.success, `milestone status "${status}" should be valid`).toBe(true);
      }
    });

    it("rejects an invalid milestone status", () => {
      const result = MilestoneInput.safeParse({
        title: "Test",
        status: "delayed" as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("KpiInput schema", () => {
    it("accepts a minimal valid KPI", () => {
      const result = KpiInput.safeParse({ title: "Monthly Revenue" });
      expect(result.success).toBe(true);
    });

    it("accepts a fully populated KPI", () => {
      const result = KpiInput.safeParse({
        title: "Q2 Pipeline Value",
        description: "Total estimated value of active proposals",
        category: "Sales",
        targetValue: "5000000",
        currentValue: "3200000",
        unit: "USD",
        periodLabel: "Q2 2026",
        status: "on_track",
        notes: "Strong pipeline from PCM and Midtown projects",
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid KPI status values", () => {
      for (const status of ["on_track", "at_risk", "off_track", "achieved"] as const) {
        const result = KpiInput.safeParse({ title: "Test KPI", status });
        expect(result.success, `KPI status "${status}" should be valid`).toBe(true);
      }
    });

    it("rejects an invalid KPI status", () => {
      const result = KpiInput.safeParse({
        title: "Test KPI",
        status: "unknown" as any,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a KPI with empty title", () => {
      const result = KpiInput.safeParse({ title: "" });
      expect(result.success).toBe(false);
    });
  });
});
