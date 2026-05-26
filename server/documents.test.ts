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
  documentVersions: { id: "id", documentId: "documentId", versionNumber: "versionNumber" },
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

describe("documents.upload with projectId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([]);
    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({ insertId: 99 }),
    });
  });

  it("accepts an optional projectId and resolves without throwing", async () => {
    // storagePut is mocked to return a url
    const { storagePut } = await import("../server/storage");
    (storagePut as any).mockResolvedValue({ key: "sls-docs/1/test.pdf", url: "/manus-storage/test.pdf" });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.documents.upload({
      name: "Lobby Spec",
      type: "spec_sheet",
      fileDataBase64: btoa("fake-pdf-bytes"),
      fileName: "lobby-spec.pdf",
      mimeType: "application/pdf",
      fileSize: 1024,
      projectId: 42,
    });
    expect(result).toMatchObject({ id: expect.any(Number), url: expect.any(String) });
  });

  it("accepts upload without projectId (general document)", async () => {
    const { storagePut } = await import("../server/storage");
    (storagePut as any).mockResolvedValue({ key: "sls-docs/1/test2.pdf", url: "/manus-storage/test2.pdf" });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.documents.upload({
      name: "General Doc",
      type: "other",
      fileDataBase64: btoa("fake-bytes"),
      fileName: "general.pdf",
      mimeType: "application/pdf",
    });
    expect(result).toMatchObject({ id: expect.any(Number), url: expect.any(String) });
  });
});

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

describe("documents.listVersions", () => {
  const mockDoc = {
    id: 10,
    name: "Lobby Spec",
    fileUrl: "/manus-storage/doc10.pdf",
    fileKey: "sls-docs/1/doc10.pdf",
    fileName: "lobby-spec.pdf",
    mimeType: "application/pdf",
    projectId: null,
    currentVersion: 2,
    version: 2,
    fileSize: 2048,
    uploadedBy: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-06-01"),
    status: "active",
    type: "spec_sheet",
  };

  const mockVersionRows = [
    { id: 1, documentId: 10, versionNumber: 1, fileUrl: "/manus-storage/doc10-v1.pdf", fileKey: "sls-docs/1/doc10-v1.pdf", fileName: "lobby-spec-v1.pdf", mimeType: "application/pdf", fileSize: 1024, uploadedBy: 1, notes: "Initial upload", createdAt: new Date("2024-01-01") },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns version history for a document without projectId", async () => {
    // Each db.select() call returns a fresh chain
    let selectCallCount = 0;
    mockSelect.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // First select: fetch parent document — chain is .from().where().limit()
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockDoc]),
            }),
          }),
        };
      }
      // Second select: fetch version rows — chain is .from().where().orderBy()
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockVersionRows),
          }),
        }),
      };
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.documents.listVersions({ documentId: 10 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ versionNumber: 1, fileName: "lobby-spec-v1.pdf" });
  });

  it("throws NOT_FOUND when document does not exist", async () => {
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
    });
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.documents.listVersions({ documentId: 999 })).rejects.toThrow(TRPCError);
  });

  it("rejects unauthenticated requests", async () => {
    const unauthCtx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as any, res: { clearCookie: vi.fn() } as any };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(caller.documents.listVersions({ documentId: 10 })).rejects.toThrow(TRPCError);
  });
});

describe("documents.uploadVersion", () => {
  const mockDoc = {
    id: 10,
    name: "Lobby Spec",
    fileUrl: "/manus-storage/doc10.pdf",
    fileKey: "sls-docs/1/doc10.pdf",
    fileName: "lobby-spec.pdf",
    mimeType: "application/pdf",
    projectId: null,
    currentVersion: 1,
    version: 1,
    fileSize: 1024,
    uploadedBy: 1,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    status: "active",
    type: "spec_sheet",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("snapshots current version and bumps to v2", async () => {
    const { storagePut } = await import("../server/storage");
    (storagePut as any).mockResolvedValue({ key: "sls-docs/1/doc10-v2.pdf", url: "/manus-storage/doc10-v2.pdf" });

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([mockDoc]) }),
    });
    mockDb.insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) });
    mockDb.update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue({}) }) });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.documents.uploadVersion({
      documentId: 10,
      fileDataBase64: btoa("new-file-bytes"),
      fileName: "lobby-spec-v2.pdf",
      mimeType: "application/pdf",
      fileSize: 2048,
      notes: "Updated for Phase 2",
    });
    expect(result).toMatchObject({ id: 10, versionNumber: 2 });
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("throws NOT_FOUND when document does not exist", async () => {
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
    });
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.documents.uploadVersion({
      documentId: 999,
      fileDataBase64: btoa("bytes"),
      fileName: "test.pdf",
      mimeType: "application/pdf",
    })).rejects.toThrow(TRPCError);
  });

  it("rejects unauthenticated requests", async () => {
    const unauthCtx: TrpcContext = { user: null, req: { protocol: "https", headers: {} } as any, res: { clearCookie: vi.fn() } as any };
    const caller = appRouter.createCaller(unauthCtx);
    await expect(caller.documents.uploadVersion({
      documentId: 10,
      fileDataBase64: btoa("bytes"),
      fileName: "test.pdf",
      mimeType: "application/pdf",
    })).rejects.toThrow(TRPCError);
  });
});
