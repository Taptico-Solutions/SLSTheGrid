import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Input schema matching users.uploadAvatar procedure ───────────────────────
const UploadAvatarInput = z.object({
  base64: z.string().min(1).max(5_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

// ─── getInitials helper (duplicated here for unit testing) ────────────────────
function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

describe("users.uploadAvatar input validation", () => {
  it("accepts a valid JPEG upload", () => {
    const result = UploadAvatarInput.safeParse({
      base64: "abc123def456",
      mimeType: "image/jpeg",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid PNG upload", () => {
    const result = UploadAvatarInput.safeParse({
      base64: "abc123def456",
      mimeType: "image/png",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid WebP upload", () => {
    const result = UploadAvatarInput.safeParse({
      base64: "abc123def456",
      mimeType: "image/webp",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid GIF upload", () => {
    const result = UploadAvatarInput.safeParse({
      base64: "abc123def456",
      mimeType: "image/gif",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unsupported mime type", () => {
    const result = UploadAvatarInput.safeParse({
      base64: "abc123def456",
      mimeType: "image/bmp",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty base64 string", () => {
    const result = UploadAvatarInput.safeParse({
      base64: "",
      mimeType: "image/jpeg",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a base64 string exceeding 5MB", () => {
    const result = UploadAvatarInput.safeParse({
      base64: "x".repeat(5_000_001),
      mimeType: "image/jpeg",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing mimeType", () => {
    const result = UploadAvatarInput.safeParse({ base64: "abc123" });
    expect(result.success).toBe(false);
  });
});

describe("getInitials helper", () => {
  it("returns ? for null", () => expect(getInitials(null)).toBe("?"));
  it("returns ? for undefined", () => expect(getInitials(undefined)).toBe("?"));
  it("returns ? for empty string", () => expect(getInitials("")).toBe("?"));
  it("returns single initial for one-word name", () => expect(getInitials("Nick")).toBe("N"));
  it("returns first+last initials for two-word name", () => expect(getInitials("Nick Tapp")).toBe("NT"));
  it("returns first+last initials for three-word name", () => expect(getInitials("Nick A Tapp")).toBe("NT"));
  it("handles extra whitespace", () => expect(getInitials("  Dave   Clapper  ")).toBe("DC"));
  it("uppercases initials", () => expect(getInitials("john doe")).toBe("JD"));
});
