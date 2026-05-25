import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ── Mock the DB module so tests run without a real database ──────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { invitesRouter } from "./routers/invites";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(role: string = "sls_admin", id: number = 1): TrpcContext {
  return {
    user: {
      id,
      openId: "test-open-id",
      email: "admin@sls.com",
      name: "Test Admin",
      loginMethod: "manus",
      role: role as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as AuthenticatedUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ── Shared mock DB builder ────────────────────────────────────────────────────
function buildMockDb(overrides: Record<string, any> = {}) {
  const base = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return { ...base, ...overrides };
}

describe("invites router", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────────────
  describe("create", () => {
    it("returns a token and inviteUrl for sls_admin", async () => {
      const db = buildMockDb();
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("sls_admin"));
      const result = await caller.create({
        role: "client_architect",
        inviteCode: "secret123",
        expiresInDays: 7,
        origin: "https://example.com",
      });

      expect(result.inviteUrl).toMatch(/^https:\/\/example\.com\/invite\//);
      expect(result.token).toBeTruthy();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(db.insert).toHaveBeenCalled();
    });

    it("throws FORBIDDEN for non-admin users", async () => {
      const caller = invitesRouter.createCaller(makeCtx("sls_rep"));
      await expect(
        caller.create({
          role: "user",
          inviteCode: "abcd", // must be >=4 chars to pass Zod before FORBIDDEN check
          expiresInDays: 7,
          origin: "https://example.com",
        })
      ).rejects.toThrow("Admin access required");
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────
  describe("list", () => {
    it("returns invite rows for sls_admin", async () => {
      const rows = [
        { id: 1, token: "tok1", role: "client_gc", label: "Test", isRevoked: false, expiresAt: null, usedAt: null, createdAt: new Date(), usedByName: null, usedByEmail: null },
      ];
      const db = buildMockDb({ orderBy: vi.fn().mockResolvedValue(rows) });
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("sls_admin"));
      const result = await caller.list();
      expect(result).toHaveLength(1);
      expect(result[0].token).toBe("tok1");
    });

    it("throws FORBIDDEN for non-admin", async () => {
      const caller = invitesRouter.createCaller(makeCtx("user"));
      await expect(caller.list()).rejects.toThrow("Admin access required");
    });
  });

  // ── revoke ──────────────────────────────────────────────────────────────────
  describe("revoke", () => {
    it("marks invite as revoked", async () => {
      const db = buildMockDb({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) });
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("sls_admin"));
      const result = await caller.revoke({ id: 5 });
      expect(result).toEqual({ success: true });
    });

    it("throws FORBIDDEN for non-admin", async () => {
      const caller = invitesRouter.createCaller(makeCtx("client_gc"));
      await expect(caller.revoke({ id: 1 })).rejects.toThrow("Admin access required");
    });
  });

  // ── redeem ──────────────────────────────────────────────────────────────────
  describe("redeem", () => {
    it("promotes user role and marks invite used on correct code", async () => {
      const invite = {
        id: 10,
        token: "validtoken",
        inviteCode: "correct-code",
        role: "sls_pm",
        isRevoked: false,
        usedAt: null,
        expiresAt: null,
      };
      const db = buildMockDb({
        limit: vi.fn().mockResolvedValue([invite]),
        where: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      });
      // Make update().set().where() resolve
      db.update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("user", 42));
      const result = await caller.redeem({ token: "validtoken", inviteCode: "correct-code" });
      expect(result.success).toBe(true);
      expect(result.role).toBe("sls_pm");
    });

    it("throws UNAUTHORIZED on wrong invite code", async () => {
      const invite = {
        id: 10,
        token: "validtoken",
        inviteCode: "correct-code",
        role: "sls_pm",
        isRevoked: false,
        usedAt: null,
        expiresAt: null,
      };
      const db = buildMockDb({ limit: vi.fn().mockResolvedValue([invite]) });
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("user", 42));
      await expect(
        caller.redeem({ token: "validtoken", inviteCode: "wrong-code" })
      ).rejects.toThrow("Incorrect invite code.");
    });

    it("throws NOT_FOUND when token is invalid or expired", async () => {
      const db = buildMockDb({ limit: vi.fn().mockResolvedValue([]) });
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("user", 42));
      await expect(
        caller.redeem({ token: "badtoken", inviteCode: "any" })
      ).rejects.toThrow("Invite link is invalid or expired.");
    });
  });
});
