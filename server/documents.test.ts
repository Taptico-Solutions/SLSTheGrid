import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Hoist mocks so they are available before vi.mock() factory runs ───────────
const { mockRows, mockWhere, mockFrom, mockSelect, mockDb } = vi.hoisted(() => {
  const mockRows = [
    { id: 1, name: "Spec Sheet A", fileUrl: "/manus-storage/doc1.pdf", fileName: "spec-a.pdf", mimeType: "application/pdf" },
    { id: 2, name: "Cut Sheet B",  fileUrl: "/manus-storage/doc2.pdf", fileName: "cut-b.pdf",  mimeType: "application/pdf" },
  ];
  const mockWhere  = vi.fn().mockResolvedValue(mockRows);
  const mockFrom   = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  const mockDb = { select: mockSelect, delete: vi.fn(), insert: vi.fn(), update: vi.fn() };
  return { mockRows, mockWhere, mockFrom, mockSelect, mockDb };
});

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../drizzle/schema", () => ({
  documents: { id: "id", name: "name", fileUrl: "fileUrl", fileName: "fileName", mimeType: "mimeType" },
  users: {},
  projects: {},
  projectTeam: {},
  milestones: {},
  submittals: {},
  budgetItems: {},
  changeOrders: {},
  messages: {},
  notifications: {},
  manufacturers: {},
  contacts: {},
  activityLog: {},
  inviteTokens: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, op: "eq" })),
  and: vi.fn((...args) => ({ op: "and", args })),
  or:  vi.fn((...args) => ({ op: "or",  args })),
  desc: vi.fn(col => ({ col, dir: "desc" })),
  isNull: vi.fn(col => ({ col, op: "isNull" })),
  sql: vi.fn(s => s),
  inArray: vi.fn((col, vals) => ({ col, vals, op: "inArray" })),
}));

vi.mock("../server/_core/llm",     () => ({ invokeLLM: vi.fn() }));
vi.mock("../server/storage",       () => ({ storagePut: vi.fn() }));
vi.mock("nanoid",                  () => ({ nanoid: () => "test-id" }));
vi.mock("../server/routers/seed",  () => ({ seedRouter: {} }));
vi.mock("../server/routers/invites", () => ({ invitesRouter: {} }));
vi.mock("../server/routers/search",  () => ({ searchRouter: {} }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(role = "sls_admin"): TrpcContext {
  return {
    user: { id: 1, openId: "test-open-id", name: "Test User", email: "test@example.com", loginMethod: "manus", role: role as any, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: vi.fn() } as any,
  };
}

describe("documents.getBulkDownloadUrls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue(mockRows);
  });

  it("returns file info for requested IDs", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.documents.getBulkDownloadUrls({ ids: [1, 2] });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 1, name: "Spec Sheet A", fileUrl: "/manus-storage/doc1.pdf", fileName: "spec-a.pdf" });
    expect(result[1]).toMatchObject({ id: 2, name: "Cut Sheet B",  fileUrl: "/manus-storage/doc2.pdf", fileName: "cut-b.pdf" });
  });

  it("falls back to document name when fileName is null", async () => {
    mockWhere.mockResolvedValueOnce([
      { id: 3, name: "No Filename Doc", fileUrl: "/manus-storage/doc3.pdf", fileName: null, mimeType: null },
    ]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.documents.getBulkDownloadUrls({ ids: [3] });
    expect(result[0]?.fileName).toBe("No Filename Doc");
    expect(result[0]?.mimeType).toBe("application/octet-stream");
  });

  it("rejects unauthenticated requests", async () => {
    const unauthCtx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as any, res: { clearCookie: vi.fn() } as any };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(caller.documents.getBulkDownloadUrls({ ids: [1] })).rejects.toThrow(TRPCError);
  });

  it("rejects empty ids array (Zod validation)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.documents.getBulkDownloadUrls({ ids: [] })).rejects.toThrow();
  });

  it("rejects arrays exceeding 50 items (Zod validation)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const tooMany = Array.from({ length: 51 }, (_, i) => i + 1);
    await expect(caller.documents.getBulkDownloadUrls({ ids: tooMany })).rejects.toThrow();
  });
});
