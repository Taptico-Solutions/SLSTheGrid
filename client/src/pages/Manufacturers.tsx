import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, EmptyState, GoldButton, LoadingSpinner } from "@/components/SLSComponents";
import { Factory, Plus, Globe, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Manufacturers() {
  const { user } = useAuth();
  const isInternal = ["sls_admin", "sls_rep", "sls_pm", "admin"].includes(user?.role ?? "");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", website: "", repName: "", repEmail: "", repPhone: "", notes: "" });

  const { data: manufacturers, isLoading, refetch } = trpc.manufacturers.list.useQuery();
  const createMfr = trpc.manufacturers.create.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); setForm({ name: "", website: "", repName: "", repEmail: "", repPhone: "", notes: "" }); toast.success("Manufacturer added"); },
    onError: () => toast.error("Failed to add manufacturer"),
  });
  // delete not yet implemented

  return (
    <div className="page-enter">
      <PageHeader title="Manufacturers" subtitle="Lighting manufacturer partners and product line contacts"
        actions={isInternal ? <GoldButton variant="filled" onClick={() => setShowAdd(true)}><Plus size={14} className="mr-1.5 inline" />Add Manufacturer</GoldButton> : undefined} />
      <div className="p-6">
        {isLoading ? <LoadingSpinner /> : (manufacturers ?? []).length === 0 ? (
          <EmptyState icon={<Factory size={48} />} title="No Manufacturers" description="Add lighting manufacturer partners and their contact information."
            action={isInternal ? <GoldButton variant="filled" onClick={() => setShowAdd(true)}>Add First Manufacturer</GoldButton> : undefined} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(manufacturers ?? []).map(m => (
              <div key={m.id} className="sls-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ background: "#f5e9cc" }}>
                    <Factory size={18} style={{ color: "#d29c3c" }} />
                  </div>

                </div>
                <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "15px", color: "#1b110b", marginBottom: "8px" }}>{m.name}</h3>
                <div className="space-y-1.5">
                  {m.repName && (
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{m.repName}</span>
                    </div>
                  )}
                  {m.repEmail && (
                    <div className="flex items-center gap-2">
                      <Mail size={11} style={{ color: "#a09080" }} />
                      <a href={`mailto:${m.repEmail}`} style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#d29c3c" }}>{m.repEmail}</a>
                    </div>
                  )}
                  {m.repPhone && (
                    <div className="flex items-center gap-2">
                      <Phone size={11} style={{ color: "#a09080" }} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{m.repPhone}</span>
                    </div>
                  )}
                  {m.website && (
                    <div className="flex items-center gap-2">
                      <Globe size={11} style={{ color: "#a09080" }} />
                      <a href={m.website} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#d29c3c" }}>{m.website.replace(/^https?:\/\//, "")}</a>
                    </div>
                  )}
                  {m.notes && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f0ebe0" }}>{m.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{ fontFamily: "Roboto Slab, serif", textTransform: "uppercase", letterSpacing: "0.04em", color: "#1b110b" }}>Add Manufacturer</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Company Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Rep Name</Label><Input value={form.repName} onChange={e => setForm(f => ({ ...f, repName: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
              <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Phone</Label><Input value={form.repPhone} onChange={e => setForm(f => ({ ...f, repPhone: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            </div>
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Email</Label><Input value={form.repEmail} onChange={e => setForm(f => ({ ...f, repEmail: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Notes</Label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-md text-sm resize-none" style={{ border: "1px solid #e8e3d8", fontFamily: "Inter, sans-serif", outline: "none" }} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <GoldButton onClick={() => setShowAdd(false)}>Cancel</GoldButton>
              <GoldButton variant="filled" onClick={() => createMfr.mutate(form)} disabled={createMfr.isPending || !form.name}>Add Manufacturer</GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
