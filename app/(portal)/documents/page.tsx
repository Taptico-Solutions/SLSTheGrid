"use client";

import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Loader2,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const CATEGORY_LABEL: Record<string, string> = {
  case_study: "Case Studies",
  story_bank: "Story Bank",
  sow: "Statement of Work",
  contract: "Contracts",
  brand_asset: "Brand Assets",
  marketing_material: "Marketing Materials",
  submittal: "Submittals",
  spec_sheet: "Spec Sheets",
  cut_sheet: "Cut Sheets",
  as_built: "As-Builts",
  photo: "Photos",
  other: "Other",
};

const CATEGORY_ORDER = [
  "sow",
  "contract",
  "case_study",
  "story_bank",
  "submittal",
  "spec_sheet",
  "cut_sheet",
  "as_built",
  "brand_asset",
  "marketing_material",
  "photo",
  "other",
];

const CATEGORY_OPTIONS = CATEGORY_ORDER.map((value) => ({
  value,
  label: CATEGORY_LABEL[value] ?? value,
}));

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file

function inferCategoryFromName(name: string): string {
  const n = name.toLowerCase();
  if (/(case[\s_-]?study|cs[\s_-])/i.test(n)) return "case_study";
  if (/story[\s_-]?bank/i.test(n)) return "story_bank";
  if (/(sow|statement\s+of\s+work|timeline|engagement)/i.test(n)) return "sow";
  if (/(msa|contract|nda|agreement)/i.test(n)) return "contract";
  if (/(brand|logo|color|font|guideline)/i.test(n)) return "brand_asset";
  if (/(deck|brochure|capabilit|one[\s_-]?pager|flyer|marketing)/i.test(n))
    return "marketing_material";
  if (/(submittal)/i.test(n)) return "submittal";
  if (/(spec[\s_-]?sheet|spec\.|specification)/i.test(n)) return "spec_sheet";
  if (/(cut[\s_-]?sheet|cutsheet)/i.test(n)) return "cut_sheet";
  if (/(as[\s_-]?built|asbuilt)/i.test(n)) return "as_built";
  if (/\.(png|jpe?g|gif|webp|heic|tiff?)$/i.test(n)) return "photo";
  return "other";
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:<mime>;base64,<b64>"
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

type Row = {
  id: string;
  file: File;
  name: string;
  category: string;
  projectId: number | null;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

export default function DocumentsPage() {
  const list = trpc.documents.list.useQuery();
  const projects = trpc.projects.list.useQuery();
  const getSigned = trpc.documents.getSignedUrl.useMutation();
  const upload = trpc.documents.upload.useMutation();
  const utils = trpc.useUtils();

  const [opening, setOpening] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  // Files default to the shared vault (no project). Users can opt in to
  // tag a specific project on a per-row basis.

  const docs = list.data ?? [];
  const grouped = useMemo(
    () =>
      docs.reduce<Record<string, typeof docs>>((acc, d) => {
        (acc[d.category] ??= []).push(d);
        return acc;
      }, {}),
    [docs],
  );

  const projectName = (id: number | null) => {
    if (id === null) return "Vault · unattached";
    return projects.data?.find((p) => p.id === id)?.name ?? `Project ${id}`;
  };

  const open = async (id: number) => {
    setOpening(id);
    try {
      const { url } = await getSigned.mutateAsync({ id });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert(
        "We could not generate a download link. The file may still be syncing to storage. Try again in a minute.",
      );
    } finally {
      setOpening(null);
    }
  };

  const onFilesPicked = (files: FileList | null) => {
    if (!files) return;
    const next: Row[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      name: file.name.replace(/\.[^.]+$/, ""),
      category: inferCategoryFromName(file.name),
      projectId: null,
      status: "pending",
    }));
    setRows((prev) => [...prev, ...next]);
  };

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const closeModal = () => {
    setModalOpen(false);
    setRows([]);
  };

  const uploadAll = async () => {
    const ready = rows.filter(
      (r) => r.status === "pending" || r.status === "error",
    );
    // Run with concurrency 3 to keep the UI responsive and the server happy.
    const queue = [...ready];
    const inFlight = new Set<Promise<void>>();

    const runOne = async (row: Row) => {
      if (row.file.size > MAX_BYTES) {
        updateRow(row.id, {
          status: "error",
          error: `File is over 50 MB (${Math.round(row.file.size / 1024 / 1024)} MB).`,
        });
        return;
      }
      updateRow(row.id, { status: "uploading", error: undefined });
      try {
        const fileData = await readFileAsBase64(row.file);
        await upload.mutateAsync({
          projectId: row.projectId ?? undefined,
          name: row.name || row.file.name,
          fileData,
          fileType: row.file.type || "application/octet-stream",
          fileSize: row.file.size,
          category: row.category as never, // zod enum
        });
        updateRow(row.id, { status: "done" });
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: unknown }).message)
            : "Upload failed.";
        updateRow(row.id, { status: "error", error: msg });
      }
    };

    while (queue.length > 0 || inFlight.size > 0) {
      while (queue.length > 0 && inFlight.size < 3) {
        const row = queue.shift()!;
        const p = runOne(row).finally(() => inFlight.delete(p));
        inFlight.add(p);
      }
      if (inFlight.size > 0) {
        await Promise.race([...inFlight]);
      }
    }

    await utils.documents.list.invalidate();
  };

  const allDone =
    rows.length > 0 && rows.every((r) => r.status === "done");
  const anyUploading = rows.some((r) => r.status === "uploading");
  const successCount = rows.filter((r) => r.status === "done").length;
  const failCount = rows.filter((r) => r.status === "error").length;

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Every file you have access to across every project."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Upload size={14} /> Upload
          </Button>
        }
      />

      {list.isLoading && (
        <div className="text-sm text-sls-dark-brown/60">Loading documents...</div>
      )}

      {list.data && docs.length === 0 && (
        <EmptyState
          title="No documents yet"
          description="Click Upload to drop in case studies, contracts, photos, anything."
        />
      )}

      <div className="space-y-6">
        {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((category) => (
          <Card key={category}>
            <CardTitle>{CATEGORY_LABEL[category] ?? category}</CardTitle>
            <CardContent className="mt-3 divide-y divide-sls-sand">
              {grouped[category]!.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText
                      size={18}
                      className="shrink-0 text-sls-dark-brown/60"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-sls-dark-brown">
                        {d.name}
                      </div>
                      <div className="text-xs text-sls-dark-brown/60">
                        {projectName(d.projectId)}
                        {" · "}
                        {d.fileType ?? "file"}
                        {d.fileSize
                          ? ` · ${Math.round(d.fileSize / 1024)} KB`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{CATEGORY_LABEL[d.category] ?? d.category}</Badge>
                    <Button
                      variant="ghost"
                      onClick={() => open(d.id)}
                      disabled={opening === d.id}
                    >
                      {opening === d.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !anyUploading) closeModal();
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-sls-sand bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-sls-sand px-5 py-4">
              <h2 className="font-slab text-xl uppercase text-sls-dark-brown">
                Upload Documents
              </h2>
              <button
                onClick={closeModal}
                disabled={anyUploading}
                className="text-sls-dark-brown/60 hover:text-sls-dark-brown disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <label className="block">
                <div className="mb-2 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                  Pick one file or many. Drop a whole folder.
                </div>
                <div className="flex items-center justify-center rounded-md border-2 border-dashed border-sls-sand bg-sls-off-white p-6 transition hover:border-sls-gold">
                  <span className="text-sm text-sls-dark-brown/70">
                    Click to choose files (Cmd or Shift click to multi-select)
                  </span>
                  <input
                    type="file"
                    multiple
                    className="absolute h-0 w-0 opacity-0"
                    onChange={(e) => onFilesPicked(e.target.files)}
                  />
                </div>
              </label>

              {rows.length === 0 && (
                <div className="mt-4 text-sm text-sls-dark-brown/60">
                  No files selected yet.
                </div>
              )}

              {rows.length > 0 && (
                <div className="mt-4 space-y-2">
                  {rows.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-md border border-sls-sand bg-white p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-sls-dark-brown">
                            {r.file.name}
                          </div>
                          <div className="text-xs text-sls-dark-brown/60">
                            {Math.round(r.file.size / 1024)} KB ·{" "}
                            {r.file.type || "unknown type"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.status === "uploading" && (
                            <Loader2
                              size={16}
                              className="animate-spin text-sls-gold"
                            />
                          )}
                          {r.status === "done" && (
                            <CheckCircle2 size={16} className="text-green-600" />
                          )}
                          {r.status === "error" && (
                            <AlertCircle size={16} className="text-red-600" />
                          )}
                          {r.status === "pending" && (
                            <button
                              onClick={() => removeRow(r.id)}
                              className="text-sls-dark-brown/40 hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_180px]">
                        <input
                          type="text"
                          value={r.name}
                          onChange={(e) =>
                            updateRow(r.id, { name: e.target.value })
                          }
                          disabled={r.status !== "pending" && r.status !== "error"}
                          className="rounded-md border border-sls-sand px-3 py-1.5 text-sm focus:border-sls-gold focus:outline-none disabled:bg-sls-sand/30"
                          placeholder="Document name"
                        />
                        <select
                          value={r.category}
                          onChange={(e) =>
                            updateRow(r.id, { category: e.target.value })
                          }
                          disabled={r.status !== "pending" && r.status !== "error"}
                          className="rounded-md border border-sls-sand px-2 py-1.5 text-sm focus:border-sls-gold focus:outline-none disabled:bg-sls-sand/30"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={r.projectId ?? ""}
                          onChange={(e) =>
                            updateRow(r.id, {
                              projectId: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                          disabled={r.status !== "pending" && r.status !== "error"}
                          className="rounded-md border border-sls-sand px-2 py-1.5 text-sm focus:border-sls-gold focus:outline-none disabled:bg-sls-sand/30"
                          title="Optional - leave as Vault to store without tying to a project"
                        >
                          <option value="">Vault (no project)</option>
                          {projects.data?.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {r.error && (
                        <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                          {r.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-sls-sand px-5 py-4">
              <div className="text-xs text-sls-dark-brown/60">
                {rows.length === 0 && "Pick files above to get started."}
                {rows.length > 0 && (
                  <>
                    {rows.length} file{rows.length === 1 ? "" : "s"} ·{" "}
                    {successCount} done · {failCount} failed
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {allDone ? (
                  <Button onClick={closeModal}>Done</Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={closeModal}
                      disabled={anyUploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={uploadAll}
                      disabled={rows.length === 0 || anyUploading}
                    >
                      {anyUploading ? "Uploading..." : "Upload all"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
