import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, StatusBadge, EmptyState, GoldButton, LoadingSpinner } from "@/components/SLSComponents";
import { ClipboardCheck, Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Submittals() {
  const { user } = useAuth();
  const canApprove = ["sls_admin", "sls_pm", "client_architect", "admin"].includes(user?.role ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected" | "needs_revision">("approved");
  const [reviewComment, setReviewComment] = useState("");

  const { data: submittals, isLoading, refetch } = trpc.submittals.listAll.useQuery();
  const reviewSubmittal = trpc.submittals.review.useMutation({
    onSuccess: () => { refetch(); setReviewId(null); setReviewComment(""); toast.success("Submittal reviewed"); },
    onError: () => toast.error("Review failed"),
  });

  const filtered = (submittals ?? []).filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pending = filtered.filter(s => s.status === "submitted" || s.status === "under_review");
  const reviewed = filtered.filter(s => !["submitted","under_review","draft"].includes(s.status ?? ""));

  return (
    <div className="page-enter">
      <PageHeader title="Submittals" subtitle="Track and manage submittal approvals across all projects" />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#a09080" }} />
            <Input placeholder="Search submittals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" style={{ fontFamily: "Inter, sans-serif", borderColor: "#e8e3d8" }} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] text-sm" style={{ fontFamily: "Inter, sans-serif", borderColor: "#e8e3d8" }}>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {["draft","submitted","under_review","approved","rejected","needs_revision","resubmitted"].map(s => (
                <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon={<ClipboardCheck size={48} />} title="No Submittals" description="Submittals will appear here once created from projects." />
        ) : (
          <div className="space-y-4">
            {pending.length > 0 && (
              <div className="sls-card">
                <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "#e8e3d8", background: "#fef9c3" }}>
                  <ClipboardCheck size={14} style={{ color: "#854d0e" }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#854d0e", textTransform: "uppercase", letterSpacing: "0.08em" }}>Pending Review ({pending.length})</span>
                </div>
                <div className="divide-y" style={{ borderColor: "#f0ebe0" }}>
                  {pending.map(s => (
                    <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                      <ClipboardCheck size={16} style={{ color: "#d29c3c", flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "13px", color: "#1b110b" }}>{s.title}</div>
                        {s.description && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}>{s.description}</div>}
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080" }}>Project #{s.projectId} · Rev {s.revisionNumber}</div>
                      </div>
                      <StatusBadge status={s.status ?? "submitted"} />
                      {canApprove && (
                        <div className="flex gap-1">
                          <button onClick={() => { setReviewId(s.id); setReviewStatus("approved"); }} className="px-3 py-1.5 rounded text-xs font-medium uppercase tracking-wide transition-colors" style={{ background: "#dcfce7", color: "#166534", fontFamily: "Inter, sans-serif" }}>
                            <Check size={12} className="inline mr-1" />Approve
                          </button>
                          <button onClick={() => { setReviewId(s.id); setReviewStatus("rejected"); }} className="px-3 py-1.5 rounded text-xs font-medium uppercase tracking-wide transition-colors" style={{ background: "#fee2e2", color: "#991b1b", fontFamily: "Inter, sans-serif" }}>
                            <X size={12} className="inline mr-1" />Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewed.length > 0 && (
              <div className="sls-card">
                <div className="px-5 py-3 border-b" style={{ borderColor: "#e8e3d8" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em" }}>Reviewed ({reviewed.length})</span>
                </div>
                <div className="divide-y" style={{ borderColor: "#f0ebe0" }}>
                  {reviewed.map(s => (
                    <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                      <ClipboardCheck size={14} style={{ color: "#a09080", flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: "13px", color: "#262b2e" }}>{s.title}</div>
                        {s.comments && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>{s.comments}</div>}
                      </div>
                      <StatusBadge status={s.status ?? "draft"} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={reviewId !== null} onOpenChange={() => setReviewId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{ fontFamily: "Roboto Slab, serif", textTransform: "uppercase", letterSpacing: "0.04em", color: "#1b110b" }}>Review Submittal</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Decision</Label>
              <Select value={reviewStatus} onValueChange={v => setReviewStatus(v as any)}>
                <SelectTrigger style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="needs_revision">Needs Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Comments</Label>
              <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md text-sm resize-none" style={{ border: "1px solid #e8e3d8", fontFamily: "Inter, sans-serif", outline: "none" }} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GoldButton onClick={() => setReviewId(null)}>Cancel</GoldButton>
              <GoldButton variant="filled" onClick={() => reviewId && reviewSubmittal.mutate({ id: reviewId, status: reviewStatus, comments: reviewComment })} disabled={reviewSubmittal.isPending}>Submit Review</GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
