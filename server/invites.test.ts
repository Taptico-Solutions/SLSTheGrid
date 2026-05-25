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

/**
 * Build a mock DB where every select() chain eventually resolves to `rows`.
 * Supports multiple sequential calls by accepting an array of row arrays.
 */
function buildSelectDb(rowSequence: any[][], insertOk = true) {
  let callIndex = 0;

  function makeChain(resolveWith: any[]) {
    const chain: any = {};
    ["from", "leftJoin", "where", "limit"].forEach(m => {
      chain[m] = vi.fn().mockReturnValue(chain);
    });
    chain.limit = vi.fn().mockResolvedValue(resolveWith);
    chain.orderBy = vi.fn().mockResolvedValue(resolveWith);
    return chain;
  }

  const db: any = {
    select: vi.fn().mockImplementation(() => {
      const rows = rowSequence[callIndex] ?? [];
      callIndex++;
      return makeChain(rows);
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };

  return db;
}

describe("invites router", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────────────
  describe("create", () => {
    it("returns a token and inviteUrl for sls_admin without project", async () => {
      const db = buildSelectDb([]);
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
    });

    it("returns a token with projectId stored when project is specified", async () => {
      // First select: project validation returns a row
      const db = buildSelectDb([[{ id: 5 }]]);
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("sls_admin"));
      const result = await caller.create({
        role: "client_gc",
        inviteCode: "proj-code",
        expiresInDays: 14,
        origin: "https://example.com",
        projectId: 5,
        projectRole: "GC Lead",
      });

      expect(result.inviteUrl).toMatch(/^https:\/\/example\.com\/invite\//);
      expect(result.token).toBeTruthy();
    });

    it("throws NOT_FOUND when specified project does not exist", async () => {
      const db = buildSelectDb([[]]); // project not found
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("sls_admin"));
      await expect(
        caller.create({
          role: "client_gc",
          inviteCode: "abcd",
          expiresInDays: 7,
          origin: "https://example.com",
          projectId: 999,
        })
      ).rejects.toThrow("Project not found.");
    });

    it("throws FORBIDDEN for non-admin users", async () => {
      const caller = invitesRouter.createCaller(makeCtx("sls_rep"));
      await expect(
        caller.create({
          role: "user",
          inviteCode: "abcd",
          expiresInDays: 7,
          origin: "https://example.com",
        })
      ).rejects.toThrow("Admin access required");
    });
  });

  // ── list ────────────────────────────────────────────────────────────────────
  describe("list", () => {
    it("returns invite rows including projectName for sls_admin", async () => {
      const rows = [
        {
          id: 1, token: "tok1", role: "client_gc", label: "Test", isRevoked: false,
          expiresAt: null, usedAt: null, createdAt: new Date(),
          usedByName: null, usedByEmail: null,
          projectId: 3, projectRole: "GC Lead", projectName: "Ponce City Market",
        },
      ];
      // orderBy is the terminal call for list
      const chain: any = {};
      ["from", "leftJoin", "where"].forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
      chain.orderBy = vi.fn().mockResolvedValue(rows);
      const db: any = { select: vi.fn().mockReturnValue(chain) };
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("sls_admin"));
      const result = await caller.list();
      expect(result).toHaveLength(1);
      expect(result[0].projectName).toBe("Ponce City Market");
    });

    it("throws FORBIDDEN for non-admin", async () => {
      const caller = invitesRouter.createCaller(makeCtx("user"));
      await expect(caller.list()).rejects.toThrow("Admin access required");
    });
  });

  // ── revoke ──────────────────────────────────────────────────────────────────
  describe("revoke", () => {
    it("marks invite as revoked", async () => {
      const db = buildSelectDb([]);
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
    it("promotes user role and marks invite used on correct code (no project)", async () => {
      const invite = {
        id: 10, token: "validtoken", inviteCode: "correct-code",
        role: "sls_pm", isRevoked: false, usedAt: null, expiresAt: null,
        projectId: null, projectRole: null,
      };
      // Only one select call: fetch invite
      const db = buildSelectDb([[invite]]);
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("user", 42));
      const result = await caller.redeem({ token: "validtoken", inviteCode: "correct-code" });
      expect(result.success).toBe(true);
      expect(result.role).toBe("sls_pm");
      expect(result.projectAssigned).toBe(false);
      expect(result.projectId).toBeNull();
    });

    it("auto-assigns user to project when invite has projectId", async () => {
      const invite = {
        id: 11, token: "projtoken", inviteCode: "proj-code",
        role: "client_architect", isRevoked: false, usedAt: null, expiresAt: null,
        projectId: 7, projectRole: "Lead Architect",
      };
      // Two select calls: fetch invite, then check existing membership (none)
      const db = buildSelectDb([[invite], []]);
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("user", 55));
      const result = await caller.redeem({ token: "projtoken", inviteCode: "proj-code" });
      expect(result.success).toBe(true);
      expect(result.projectAssigned).toBe(true);
      expect(result.projectId).toBe(7);
      expect(db.insert).toHaveBeenCalledTimes(1); // inserted into project_team
    });

    it("does not duplicate project membership if user is already a member", async () => {
      const invite = {
        id: 12, token: "duptoken", inviteCode: "dup-code",
        role: "client_gc", isRevoked: false, usedAt: null, expiresAt: null,
        projectId: 3, projectRole: null,
      };
      // Two select calls: fetch invite, then check membership (already a member)
      const db = buildSelectDb([[invite], [{ id: 99 }]]);
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("user", 77));
      const result = await caller.redeem({ token: "duptoken", inviteCode: "dup-code" });
      expect(result.success).toBe(true);
      expect(result.projectAssigned).toBe(true);
      expect(db.insert).not.toHaveBeenCalled(); // no duplicate insert
    });

    it("throws UNAUTHORIZED on wrong invite code", async () => {
      const invite = {
        id: 10, token: "validtoken", inviteCode: "correct-code",
        role: "sls_pm", isRevoked: false, usedAt: null, expiresAt: null,
        projectId: null, projectRole: null,
      };
      const db = buildSelectDb([[invite]]);
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("user", 42));
      await expect(
        caller.redeem({ token: "validtoken", inviteCode: "wrong-code" })
      ).rejects.toThrow("Incorrect invite code.");
    });

    it("throws NOT_FOUND when token is invalid or expired", async () => {
      const db = buildSelectDb([[]]); // no rows
      vi.mocked(getDb).mockResolvedValue(db as any);

      const caller = invitesRouter.createCaller(makeCtx("user", 42));
      await expect(
        caller.redeem({ token: "badtoken", inviteCode: "any" })
      ).rejects.toThrow("Invite link is invalid or expired.");
    });
  });
});
