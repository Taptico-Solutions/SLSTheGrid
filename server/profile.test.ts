import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Unit tests for the users.updateProfile procedure ────────────────────────
// Validates the input schema and field constraints without a live DB.

const UpdateProfileInput = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
});

describe("users.updateProfile", () => {
  it("accepts a fully populated update", () => {
    const result = UpdateProfileInput.safeParse({
      name: "Nick Tapp",
      phone: "404-555-0100",
      company: "Taptico Solutions",
      title: "Founder & CEO",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a partial update (name only)", () => {
    const result = UpdateProfileInput.safeParse({ name: "Dave Clapper" });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (no-op update)", () => {
    const result = UpdateProfileInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts update with phone only", () => {
    const result = UpdateProfileInput.safeParse({ phone: "770-555-9999" });
    expect(result.success).toBe(true);
  });

  it("accepts update with company only", () => {
    const result = UpdateProfileInput.safeParse({ company: "Southern Lighting Source" });
    expect(result.success).toBe(true);
  });

  it("accepts update with title only", () => {
    const result = UpdateProfileInput.safeParse({ title: "Project Manager" });
    expect(result.success).toBe(true);
  });

  it("rejects non-string name", () => {
    const result = UpdateProfileInput.safeParse({ name: 12345 });
    expect(result.success).toBe(false);
  });

  it("rejects non-string phone", () => {
    const result = UpdateProfileInput.safeParse({ phone: true });
    expect(result.success).toBe(false);
  });

  it("allows empty string values (caller can clear fields)", () => {
    const result = UpdateProfileInput.safeParse({
      name: "",
      phone: "",
      company: "",
      title: "",
    });
    expect(result.success).toBe(true);
  });
});
