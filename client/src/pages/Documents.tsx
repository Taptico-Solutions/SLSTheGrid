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

const DOC_TYPES = ["spec_sheet","submittal","approval","change_order","invoice","cut_sheet","as_built","warranty","field_photo","other"];

export default function Documents() {
  const { user } = useAuth();
  const isInternal = ["sls_admin", "sls_rep", "sls_pm", "admin"].includes(user?.role ?? "");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", type: "other" as const, file: null as File | null });

  const { data: docs, isLoading, refetch } = trpc.documents.listAll.useQuery();
  const uploadDoc = trpc.documents.upload.useMutation({
    onSuccess: () => { refetch(); setShowUpload(false); setUploadForm({ name: "", type: "other", file: null }); toast.success("Document uploaded"); },
    onError: () => toast.error("Upload failed"),
  });
  const deleteDoc = trpc.documents.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Deleted"); } });

  const filtered = (docs ?? []).filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || d.type === typeFilter;
    return matchSearch && matchType;
  });

  async function handleUpload() {
    if (!uploadForm.file || !uploadForm.name) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      await uploadDoc.mutateAsync({ name: uploadForm.name, type: uploadForm.type, fileDataBase64: base64, fileName: uploadForm.file!.name, mimeType: uploadForm.file!.type, fileSize: uploadForm.file!.size });
      setUploading(false);
    };
    reader.readAsDataURL(uploadForm.file);
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
            <SelectTrigger className="w-[160px] text-sm" style={{ fontFamily: "Inter, sans-serif", borderColor: "#e8e3d8" }}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}
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
                    <td className="px-4 py-3"><StatusBadge status={doc.type ?? "other"} /></td>
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

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{ fontFamily: "Roboto Slab, serif", textTransform: "uppercase", letterSpacing: "0.04em", color: "#1b110b" }}>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Document Name *</Label><Input value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Document Type</Label>
              <Select value={uploadForm.type} onValueChange={v => setUploadForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }}><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>File *</Label>
              <input type="file" onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} className="w-full mt-1 text-sm" style={{ fontFamily: "Inter, sans-serif" }} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GoldButton onClick={() => setShowUpload(false)}>Cancel</GoldButton>
              <GoldButton variant="filled" onClick={handleUpload} disabled={uploading || !uploadForm.file || !uploadForm.name}>{uploading ? "Uploading..." : "Upload"}</GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
