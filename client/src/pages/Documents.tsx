import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, StatusBadge, EmptyState, GoldButton, LoadingSpinner } from "@/components/SLSComponents";
import { FolderOpen, Upload, FileText, Download, Trash2, Search, CheckSquare, Square, Archive, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import JSZip from "jszip";

function formatBytes(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const DOC_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "spec_sheet",          label: "Spec Sheet" },
  { value: "submittal",           label: "Submittal" },
  { value: "approval",            label: "Approval" },
  { value: "change_order",        label: "Change Order" },
  { value: "invoice",             label: "Invoice" },
  { value: "cut_sheet",           label: "Cut Sheet" },
  { value: "as_built",            label: "As-Built" },
  { value: "warranty",            label: "Warranty" },
  { value: "field_photo",         label: "Field Photo" },
  { value: "marketing_materials", label: "Marketing Materials" },
  { value: "case_study",          label: "Case Studies" },
  { value: "other",               label: "Other" },
];

type DocTypeValue = typeof DOC_TYPE_OPTIONS[number]["value"];

export default function Documents() {
  const { user } = useAuth();
  const isInternal = ["sls_admin", "sls_rep", "sls_pm", "admin"].includes(user?.role ?? "");

  // Filter state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState<{
    name: string;
    type: DocTypeValue;
    file: File | null;
    projectId: number | null;
  }>({ name: "", type: "other", file: null, projectId: null });

  // Projects for the "Link to Project" dropdown
  const { data: projectsList } = trpc.projects.list.useQuery(undefined, { enabled: showUpload });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  const { data: docs, isLoading, refetch } = trpc.documents.listAll.useQuery();

  const uploadDoc = trpc.documents.upload.useMutation({
    onSuccess: () => {
      refetch();
      setShowUpload(false);
      setUploadForm({ name: "", type: "other", file: null, projectId: null });
      toast.success("Document uploaded successfully");
    },
    onError: (err) => {
      console.error("[Upload] tRPC mutation error:", err);
      toast.error(`Upload failed: ${err.message ?? "Unknown error"}`);
    },
  });

  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Deleted"); },
  });

  // Lazy query — only fires when we call refetch with ids
  const getBulkUrls = trpc.documents.getBulkDownloadUrls.useQuery(
    { ids: Array.from(selectedIds) },
    { enabled: false }
  );

  const filtered = (docs ?? []).filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || d.type === typeFilter;
    return matchSearch && matchType;
  });

  // ── Selection helpers ────────────────────────────────────────────────────────
  const allFilteredSelected =
    filtered.length > 0 && filtered.every(d => selectedIds.has(d.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(d => next.delete(d.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(d => next.add(d.id));
        return next;
      });
    }
  }, [allFilteredSelected, filtered]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIds(new Set());

  // ── Bulk download ────────────────────────────────────────────────────────────
  async function handleBulkDownload() {
    if (selectedIds.size === 0) return;
    setZipping(true);
    setZipProgress(0);
    try {
      // Fetch signed URLs from server
      const result = await getBulkUrls.refetch();
      const files = result.data;
      if (!files || files.length === 0) {
        toast.error("Could not retrieve download URLs. Please try again.");
        return;
      }

      const zip = new JSZip();
      const total = files.length;
      let done = 0;

      // Fetch each file and add to zip
      await Promise.all(
        files.map(async (f) => {
          try {
            const resp = await fetch(f.fileUrl, { credentials: "include" });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            // Sanitise filename and deduplicate
            const safeName = (f.fileName || f.name || `file-${f.id}`)
              .replace(/[/\\:*?"<>|]/g, "_");
            zip.file(safeName, blob);
          } catch (err) {
            console.warn(`[BulkDownload] Failed to fetch ${f.name}:`, err);
            // Still count it so progress advances
          } finally {
            done++;
            setZipProgress(Math.round((done / total) * 90));
          }
        })
      );

      setZipProgress(95);
      const content = await zip.generateAsync({ type: "blob" });
      setZipProgress(100);

      // Trigger browser download
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SLS-Documents-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${files.length} file${files.length !== 1 ? "s" : ""} as zip`);
      clearSelection();
    } catch (err: any) {
      console.error("[BulkDownload] Error:", err);
      toast.error(`Zip export failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setZipping(false);
      setZipProgress(0);
    }
  }

  // ── Upload ───────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!uploadForm.file) { toast.error("Please select a file"); return; }
    if (!uploadForm.name.trim()) { toast.error("Please enter a document name"); return; }
    const MAX_SIZE = 25 * 1024 * 1024;
    if (uploadForm.file.size > MAX_SIZE) {
      toast.error(`File too large. Maximum size is 25 MB (your file: ${formatBytes(uploadForm.file.size)})`);
      return;
    }
    setUploading(true);
    try {
      const arrayBuffer = await uploadForm.file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]!);
      const base64 = btoa(binary);
      if (!base64) { toast.error("Could not read file contents. Please try again."); return; }
      await uploadDoc.mutateAsync({
        name: uploadForm.name.trim(),
        type: uploadForm.type as any,
        fileDataBase64: base64,
        fileName: uploadForm.file.name,
        mimeType: uploadForm.file.type || "application/octet-stream",
        fileSize: uploadForm.file.size,
        ...(uploadForm.projectId ? { projectId: uploadForm.projectId } : {}),
      });
    } catch (err: any) {
      console.error("[Upload] Unexpected error:", err);
      if (!uploadDoc.error) toast.error(`Upload failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  }

  function handleDialogClose(open: boolean) {
    if (!uploading) {
      setShowUpload(open);
      if (!open) setUploadForm({ name: "", type: "other", file: null, projectId: null });
    }
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Document Vault"
        subtitle="Centralized repository for all project documents and files"
        actions={
          <GoldButton variant="filled" onClick={() => setShowUpload(true)}>
            <Upload size={14} className="mr-1.5 inline" />Upload Document
          </GoldButton>
        }
      />
      <div className="p-6 space-y-4">

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#a09080" }} />
            <Input
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 text-sm"
              style={{ fontFamily: "Inter, sans-serif", borderColor: "#e8e3d8" }}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] text-sm" style={{ fontFamily: "Inter, sans-serif", borderColor: "#e8e3d8" }}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOC_TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a09080" }}>
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Bulk action bar — appears when items are selected */}
        {someSelected && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border"
            style={{ background: "#fdf6e8", borderColor: "#d29c3c", fontFamily: "Inter, sans-serif" }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#1b110b" }}>
              {selectedIds.size} file{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex-1" />
            {zipping && (
              <div className="flex items-center gap-2 min-w-[160px]">
                <Progress value={zipProgress} className="h-1.5 flex-1" style={{ background: "#e8e3d8" }} />
                <span style={{ fontSize: "11px", color: "#7a6e62" }}>{zipProgress}%</span>
              </div>
            )}
            <GoldButton
              variant="filled"
              onClick={handleBulkDownload}
              disabled={zipping}
            >
              <Archive size={13} className="mr-1.5 inline" />
              {zipping ? "Zipping…" : `Download ${selectedIds.size} as Zip`}
            </GoldButton>
            <button
              onClick={clearSelection}
              className="p-1 rounded hover:bg-[#f5e9cc] transition-colors"
              title="Clear selection"
            >
              <X size={14} style={{ color: "#7a6e62" }} />
            </button>
          </div>
        )}

        {/* Document table */}
        {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={48} />}
            title="No Documents"
            description="Upload project documents, specs, and submittals."
            action={<GoldButton variant="filled" onClick={() => setShowUpload(true)}>Upload First Document</GoldButton>}
          />
        ) : (
          <div className="sls-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9f6f0" }}>
                  {/* Select-all checkbox */}
                  <th className="px-3 py-3 w-8" style={{ borderBottom: "1px solid #e8e3d8" }}>
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center"
                      title={allFilteredSelected ? "Deselect all" : "Select all"}
                    >
                      {allFilteredSelected
                        ? <CheckSquare size={15} style={{ color: "#d29c3c" }} />
                        : <Square size={15} style={{ color: "#c0b8a8" }} />}
                    </button>
                  </th>
                  {["Name", "Type", "Project", "Size", "Uploaded", "Status", ""].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e8e3d8" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => {
                  const isSelected = selectedIds.has(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      className="border-b transition-colors"
                      style={{
                        borderColor: "#f0ebe0",
                        background: isSelected ? "#fdf6e8" : undefined,
                      }}
                    >
                      {/* Row checkbox */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleOne(doc.id)}
                          className="flex items-center justify-center"
                        >
                          {isSelected
                            ? <CheckSquare size={15} style={{ color: "#d29c3c" }} />
                            : <Square size={15} style={{ color: "#c0b8a8" }} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={14} style={{ color: "#d29c3c", flexShrink: 0 }} />
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#1b110b" }}>
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={DOC_TYPE_OPTIONS.find(t => t.value === doc.type)?.label ?? doc.type ?? "other"} />
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>
                        {doc.projectId
                          ? (projectsList ?? []).find(p => p.id === doc.projectId)?.name ?? `#${doc.projectId}`
                          : "General"}
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>
                        {formatBytes(doc.fileSize)}
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-[#f5e9cc] transition-colors"
                            title="Download"
                          >
                            <Download size={13} style={{ color: "#d29c3c" }} />
                          </a>
                          {isInternal && (
                            <button
                              onClick={() => deleteDoc.mutate({ id: doc.id })}
                              className="p-1.5 rounded hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} style={{ color: "#ef4444" }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Roboto Slab, serif", textTransform: "uppercase", letterSpacing: "0.04em", color: "#1b110b" }}>
              Upload Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>
                Document Name *
              </Label>
              <Input
                value={uploadForm.name}
                onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Lobby Pendant Spec Sheet"
                style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }}
              />
            </div>
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>
                Document Type *
              </Label>
              <Select value={uploadForm.type} onValueChange={v => setUploadForm(f => ({ ...f, type: v as DocTypeValue }))}>
                <SelectTrigger style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }}>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>
                Link to Project <span style={{ color: "#a09080", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
              </Label>
              <Select
                value={uploadForm.projectId ? String(uploadForm.projectId) : "none"}
                onValueChange={v => setUploadForm(f => ({ ...f, projectId: v === "none" ? null : Number(v) }))}
              >
                <SelectTrigger style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }}>
                  <SelectValue placeholder="No project (general document)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project (general document)</SelectItem>
                  {(projectsList ?? []).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>
                File * <span style={{ color: "#a09080", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(max 25 MB)</span>
              </Label>
              <input
                type="file"
                onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
                className="w-full mt-1 text-sm"
                style={{ fontFamily: "Inter, sans-serif" }}
                disabled={uploading}
              />
              {uploadForm.file && (
                <p className="text-xs mt-1" style={{ color: "#a09080", fontFamily: "Inter, sans-serif" }}>
                  {uploadForm.file.name} — {formatBytes(uploadForm.file.size)}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GoldButton onClick={() => handleDialogClose(false)} disabled={uploading}>Cancel</GoldButton>
              <GoldButton
                variant="filled"
                onClick={handleUpload}
                disabled={uploading || !uploadForm.file || !uploadForm.name.trim()}
              >
                {uploading ? "Uploading…" : "Upload"}
              </GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
