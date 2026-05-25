import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, StatusBadge, EmptyState, GoldButton, LoadingSpinner } from "@/components/SLSComponents";
import { FolderOpen, Upload, FileText, Download, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function formatBytes(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// Document type values must match the server-side z.enum and the DB mysqlEnum.
// "marketing_materials" and "case_study" are new — we add them to both the
// Zod schema and the DB enum in the same change.
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
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState<{
    name: string;
    type: DocTypeValue;
    file: File | null;
  }>({ name: "", type: "other", file: null });

  const { data: docs, isLoading, refetch } = trpc.documents.listAll.useQuery();

  const uploadDoc = trpc.documents.upload.useMutation({
    onSuccess: () => {
      refetch();
      setShowUpload(false);
      setUploadForm({ name: "", type: "other", file: null });
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

  const filtered = (docs ?? []).filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || d.type === typeFilter;
    return matchSearch && matchType;
  });

  async function handleUpload() {
    if (!uploadForm.file) { toast.error("Please select a file"); return; }
    if (!uploadForm.name.trim()) { toast.error("Please enter a document name"); return; }

    // Validate file size client-side (25 MB limit to stay well under the 50 MB body limit)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (uploadForm.file.size > MAX_SIZE) {
      toast.error(`File too large. Maximum size is 25 MB (your file: ${formatBytes(uploadForm.file.size)})`);
      return;
    }

    setUploading(true);
    try {
      // Use arrayBuffer + manual base64 conversion — more reliable than FileReader
      const arrayBuffer = await uploadForm.file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]!);
      }
      const base64 = btoa(binary);

      if (!base64) {
        toast.error("Could not read file contents. Please try again.");
        return;
      }

      await uploadDoc.mutateAsync({
        name: uploadForm.name.trim(),
        type: uploadForm.type as any,
        fileDataBase64: base64,
        fileName: uploadForm.file.name,
        mimeType: uploadForm.file.type || "application/octet-stream",
        fileSize: uploadForm.file.size,
      });
    } catch (err: any) {
      // onError on the mutation handles the toast; this catch prevents unhandled rejection
      console.error("[Upload] Unexpected error:", err);
      if (!uploadDoc.error) {
        toast.error(`Upload failed: ${err?.message ?? "Unknown error"}`);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleDialogClose(open: boolean) {
    if (!uploading) {
      setShowUpload(open);
      if (!open) setUploadForm({ name: "", type: "other", file: null });
    }
  }

  return (
    <div className="page-enter">
      <PageHeader title="Document Vault" subtitle="Centralized repository for all project documents and files"
        actions={<GoldButton variant="filled" onClick={() => setShowUpload(true)}><Upload size={14} className="mr-1.5 inline" />Upload Document</GoldButton>} />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#a09080" }} />
            <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" style={{ fontFamily: "Inter, sans-serif", borderColor: "#e8e3d8" }} />
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
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a09080" }}>{filtered.length} document{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon={<FolderOpen size={48} />} title="No Documents" description="Upload project documents, specs, and submittals."
            action={<GoldButton variant="filled" onClick={() => setShowUpload(true)}>Upload First Document</GoldButton>} />
        ) : (
          <div className="sls-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#f9f6f0" }}>
                  {["Name", "Type", "Project", "Size", "Uploaded", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e8e3d8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr key={doc.id} className="border-b" style={{ borderColor: "#f0ebe0" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={14} style={{ color: "#d29c3c", flexShrink: 0 }} />
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 500, color: "#1b110b" }}>{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={DOC_TYPE_OPTIONS.find(t => t.value === doc.type)?.label ?? doc.type ?? "other"} />
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>{doc.projectId ? `#${doc.projectId}` : "General"}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>{formatBytes(doc.fileSize)}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>{new Date(doc.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-[#f5e9cc] transition-colors" title="Download"><Download size={13} style={{ color: "#d29c3c" }} /></a>
                        {isInternal && <button onClick={() => deleteDoc.mutate({ id: doc.id })} className="p-1.5 rounded hover:bg-red-50 transition-colors"><Trash2 size={13} style={{ color: "#ef4444" }} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              <Select
                value={uploadForm.type}
                onValueChange={v => setUploadForm(f => ({ ...f, type: v as DocTypeValue }))}
              >
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
