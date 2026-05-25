import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock getDb ────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

// ── Helper to build a mock Drizzle DB ─────────────────────────────────────────
function makeMockDb(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return chain;
}

// ── Auth context helpers ──────────────────────────────────────────────────────
function makeCtx(role: string): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: role as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("search.global", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty results when query is too short", async () => {
    // The procedure has min(1) on query, so a 1-char query is valid but
    // we test the happy path where DB returns nothing
    const db = makeMockDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(makeCtx("sls_admin"));
    const result = await caller.search.global({ query: "x" });

    expect(result).toHaveProperty("projects");
    expect(result).toHaveProperty("documents");
    expect(result).toHaveProperty("submittals");
    expect(result.projects).toEqual([]);
    expect(result.documents).toEqual([]);
    expect(result.submittals).toEqual([]);
  });

  it("returns results for admin without project scoping", async () => {
    const mockProjects = [
      { id: 1, name: "Ponce City Market", status: "active", city: "Atlanta", state: "GA", buildingType: "Mixed Use" },
    ];
    const mockDocs = [
      { id: 10, name: "Spec Sheet v1", type: "spec_sheet", status: "approved", projectId: 1, projectName: "Ponce City Market" },
    ];
    const mockSubmittals = [
      { id: 20, title: "Pendant Submittal", status: "under_review", projectId: 1, projectName: "Ponce City Market" },
    ];

    // Each call to limit() returns the next set of results
    let callCount = 0;
    const db = makeMockDb({
      limit: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(mockProjects);
        if (callCount === 2) return Promise.resolve(mockDocs);
        return Promise.resolve(mockSubmittals);
      }),
    });
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(makeCtx("sls_admin"));
    const result = await caller.search.global({ query: "Ponce" });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]?.name).toBe("Ponce City Market");
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.name).toBe("Spec Sheet v1");
    expect(result.submittals).toHaveLength(1);
    expect(result.submittals[0]?.title).toBe("Pendant Submittal");
  });

  it("returns empty results for client with no project memberships", async () => {
    // The teamRows query is: db.select().from(projectTeam).where(...)
    // — no .limit() call, so where() must resolve to an array directly.
    // The three search queries each end with .limit() and should return [].
    const db = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]), // teamRows query resolves here
      limit: vi.fn().mockResolvedValue([]), // search queries resolve here
    };
    vi.mocked(getDb).mockResolvedValue(db as any);

    const caller = appRouter.createCaller(makeCtx("client_architect"));
    const result = await caller.search.global({ query: "Ponce" });

    expect(result.projects).toEqual([]);
    expect(result.documents).toEqual([]);
    expect(result.submittals).toEqual([]);
  });

  it("throws UNAUTHORIZED when user is not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.search.global({ query: "test" })).rejects.toThrow();
  });
});
