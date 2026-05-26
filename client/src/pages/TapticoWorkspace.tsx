import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CheckSquare, Calendar, Flag, Target, Plus, Pencil, Trash2,
  TrendingUp, TrendingDown, Minus, AlertCircle, Clock, CheckCircle2,
  Users, Zap, Lock,
} from "lucide-react";

// ── Access guard ──────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-[#1b110b] flex items-center justify-center">
        <Lock className="w-8 h-8 text-[#d29c3c]" />
      </div>
      <h2 className="text-2xl font-bold text-[#1b110b]" style={{ fontFamily: "'Roboto Slab', serif" }}>
        TAPTICO WORKSPACE
      </h2>
      <p className="text-gray-500 max-w-sm">
        This workspace is private to the Taptico Solutions team. Contact Nick to request access.
      </p>
    </div>
  );
}

// ── Status / priority badge helpers ──────────────────────────────────────────
const TODO_STATUS_COLORS: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};
const MILESTONE_STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  delayed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};
const KPI_STATUS_COLORS: Record<string, string> = {
  on_track: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  off_track: "bg-red-100 text-red-700",
  achieved: "bg-[#d29c3c]/20 text-[#b07d20]",
};

function fmt(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Confirm delete dialog ─────────────────────────────────────────────────────
function ConfirmDelete({ open, onConfirm, onCancel, label }: { open: boolean; onConfirm: () => void; onCancel: () => void; label: string }) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Delete {label}?</DialogTitle></DialogHeader>
        <p className="text-sm text-gray-500">This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TO-DOS TAB
// ══════════════════════════════════════════════════════════════════════════════
function TodosTab() {
  const utils = trpc.useUtils();
  const { data: todos = [], isLoading } = trpc.taptico.listTodos.useQuery();
  const createMutation = trpc.taptico.createTodo.useMutation({ onSuccess: () => { utils.taptico.listTodos.invalidate(); toast.success("To-do added"); setModalOpen(false); resetForm(); } });
  const updateMutation = trpc.taptico.updateTodo.useMutation({ onSuccess: () => { utils.taptico.listTodos.invalidate(); toast.success("To-do updated"); setModalOpen(false); resetForm(); } });
  const deleteMutation = trpc.taptico.deleteTodo.useMutation({ onSuccess: () => { utils.taptico.listTodos.invalidate(); toast.success("To-do deleted"); } });

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", status: "todo", priority: "medium", dueDate: "", tags: "" });

  function resetForm() { setForm({ title: "", description: "", status: "todo", priority: "medium", dueDate: "", tags: "" }); setEditId(null); }
  function openEdit(t: any) { setForm({ title: t.title, description: t.description ?? "", status: t.status, priority: t.priority, dueDate: t.dueDate ?? "", tags: t.tags ?? "" }); setEditId(t.id); setModalOpen(true); }
  function handleSubmit() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const payload = { title: form.title, description: form.description || undefined, status: form.status as any, priority: form.priority as any, dueDate: form.dueDate || undefined, tags: form.tags || undefined };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  }

  const byStatus = { todo: todos.filter(t => t.status === "todo"), in_progress: todos.filter(t => t.status === "in_progress"), done: todos.filter(t => t.status === "done"), blocked: todos.filter(t => t.status === "blocked") };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3 text-sm text-gray-500">
          {Object.entries(byStatus).map(([s, items]) => (
            <span key={s} className={`px-2 py-0.5 rounded-full text-xs font-medium ${TODO_STATUS_COLORS[s]}`}>{fmt(s)}: {items.length}</span>
          ))}
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-[#d29c3c] hover:bg-[#b07d20] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add To-Do
        </Button>
      </div>

      {isLoading ? <div className="text-center py-12 text-gray-400">Loading...</div> : todos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No to-dos yet. Add your first task.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map(t => (
            <div key={t.id} className={`flex items-start gap-3 p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow ${t.status === "done" ? "opacity-60" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-medium text-sm ${t.status === "done" ? "line-through text-gray-400" : "text-[#1b110b]"}`}>{t.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TODO_STATUS_COLORS[t.status]}`}>{fmt(t.status)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[t.priority]}`}>{fmt(t.priority)}</span>
                  {t.dueDate && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{t.dueDate}</span>}
                </div>
                {t.description && <p className="text-xs text-gray-500 mt-1 truncate">{t.description}</p>}
                {t.tags && <p className="text-xs text-[#d29c3c] mt-1">{t.tags}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={v => { if (!v) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-['Roboto_Slab'] uppercase tracking-wide">{editId ? "Edit To-Do" : "New To-Do"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["todo","in_progress","done","blocked"].map(s => <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Priority</label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","medium","high","urgent"].map(s => <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Due Date</label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Tags</label><Input placeholder="e.g. design, urgent" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#d29c3c] hover:bg-[#b07d20] text-white">
              {editId ? "Save Changes" : "Add To-Do"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={deleteId !== null} label="to-do" onConfirm={() => { if (deleteId) { deleteMutation.mutate({ id: deleteId }); setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MEETINGS TAB
// ══════════════════════════════════════════════════════════════════════════════
function MeetingsTab() {
  const utils = trpc.useUtils();
  const { data: meetings = [], isLoading } = trpc.taptico.listMeetings.useQuery();
  const createMutation = trpc.taptico.createMeeting.useMutation({ onSuccess: () => { utils.taptico.listMeetings.invalidate(); toast.success("Meeting saved"); setModalOpen(false); resetForm(); } });
  const updateMutation = trpc.taptico.updateMeeting.useMutation({ onSuccess: () => { utils.taptico.listMeetings.invalidate(); toast.success("Meeting updated"); setModalOpen(false); resetForm(); } });
  const deleteMutation = trpc.taptico.deleteMeeting.useMutation({ onSuccess: () => { utils.taptico.listMeetings.invalidate(); toast.success("Meeting deleted"); } });

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", meetingDate: "", durationMinutes: "60", attendees: "", agenda: "", notes: "", actionItems: "", meetingType: "internal" });

  function resetForm() { setForm({ title: "", description: "", meetingDate: "", durationMinutes: "60", attendees: "", agenda: "", notes: "", actionItems: "", meetingType: "internal" }); setEditId(null); }
  function openEdit(m: any) {
    const dt = m.meetingDate ? new Date(m.meetingDate).toISOString().slice(0, 16) : "";
    setForm({ title: m.title, description: m.description ?? "", meetingDate: dt, durationMinutes: String(m.durationMinutes ?? 60), attendees: m.attendees ?? "", agenda: m.agenda ?? "", notes: m.notes ?? "", actionItems: m.actionItems ?? "", meetingType: m.meetingType });
    setEditId(m.id); setModalOpen(true);
  }
  function handleSubmit() {
    if (!form.title.trim() || !form.meetingDate) { toast.error("Title and date are required"); return; }
    const payload = { title: form.title, description: form.description || undefined, meetingDate: form.meetingDate, durationMinutes: parseInt(form.durationMinutes) || 60, attendees: form.attendees || undefined, agenda: form.agenda || undefined, notes: form.notes || undefined, actionItems: form.actionItems || undefined, meetingType: form.meetingType as any };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  }

  const MEETING_TYPE_COLORS: Record<string, string> = { internal: "bg-blue-100 text-blue-700", client: "bg-green-100 text-green-700", vendor: "bg-purple-100 text-purple-700", planning: "bg-yellow-100 text-yellow-700", review: "bg-orange-100 text-orange-700", other: "bg-gray-100 text-gray-600" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{meetings.length} meeting{meetings.length !== 1 ? "s" : ""} logged</p>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-[#d29c3c] hover:bg-[#b07d20] text-white">
          <Plus className="w-4 h-4 mr-2" /> Log Meeting
        </Button>
      </div>

      {isLoading ? <div className="text-center py-12 text-gray-400">Loading...</div> : meetings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No meetings logged yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m: any) => (
            <div key={m.id} className="p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-[#1b110b]">{m.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MEETING_TYPE_COLORS[m.meetingType] ?? "bg-gray-100 text-gray-600"}`}>{fmt(m.meetingType)}</span>
                    <span className="text-xs text-gray-400">{m.meetingDate ? new Date(m.meetingDate).toLocaleString() : ""} · {m.durationMinutes}min</span>
                  </div>
                  {m.attendees && <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" />{m.attendees}</p>}
                  {m.notes && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{m.notes}</p>}
                  {m.actionItems && <div className="mt-2 p-2 bg-[#d29c3c]/10 rounded text-xs text-[#1b110b]"><span className="font-semibold">Action Items: </span>{m.actionItems}</div>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={v => { if (!v) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-['Roboto_Slab'] uppercase tracking-wide">{editId ? "Edit Meeting" : "Log Meeting"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Meeting title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Date & Time *</label><Input type="datetime-local" value={form.meetingDate} onChange={e => setForm(f => ({ ...f, meetingDate: e.target.value }))} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Duration (min)</label><Input type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} /></div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Type</label>
              <Select value={form.meetingType} onValueChange={v => setForm(f => ({ ...f, meetingType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["internal","client","vendor","planning","review","other"].map(s => <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Attendees (comma-separated)" value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} />
            <Textarea placeholder="Agenda" value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} rows={2} />
            <Textarea placeholder="Notes / Summary" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            <Textarea placeholder="Action Items" value={form.actionItems} onChange={e => setForm(f => ({ ...f, actionItems: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#d29c3c] hover:bg-[#b07d20] text-white">
              {editId ? "Save Changes" : "Log Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={deleteId !== null} label="meeting" onConfirm={() => { if (deleteId) { deleteMutation.mutate({ id: deleteId }); setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MILESTONES TAB
// ══════════════════════════════════════════════════════════════════════════════
function MilestonesTab() {
  const utils = trpc.useUtils();
  const { data: milestones = [], isLoading } = trpc.taptico.listMilestones.useQuery();
  const createMutation = trpc.taptico.createMilestone.useMutation({ onSuccess: () => { utils.taptico.listMilestones.invalidate(); toast.success("Milestone added"); setModalOpen(false); resetForm(); } });
  const updateMutation = trpc.taptico.updateMilestone.useMutation({ onSuccess: () => { utils.taptico.listMilestones.invalidate(); toast.success("Milestone updated"); setModalOpen(false); resetForm(); } });
  const deleteMutation = trpc.taptico.deleteMilestone.useMutation({ onSuccess: () => { utils.taptico.listMilestones.invalidate(); toast.success("Milestone deleted"); } });

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", completedDate: "", status: "upcoming", category: "product", owner: "", progress: "0" });

  function resetForm() { setForm({ title: "", description: "", dueDate: "", completedDate: "", status: "upcoming", category: "product", owner: "", progress: "0" }); setEditId(null); }
  function openEdit(m: any) { setForm({ title: m.title, description: m.description ?? "", dueDate: m.dueDate ?? "", completedDate: m.completedDate ?? "", status: m.status, category: m.category, owner: m.owner ?? "", progress: String(m.progress ?? 0) }); setEditId(m.id); setModalOpen(true); }
  function handleSubmit() {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const payload = { title: form.title, description: form.description || undefined, dueDate: form.dueDate || undefined, completedDate: form.completedDate || undefined, status: form.status as any, category: form.category as any, owner: form.owner || undefined, progress: parseInt(form.progress) || 0 };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 text-xs">
          {["upcoming","in_progress","completed","delayed"].map(s => (
            <span key={s} className={`px-2 py-0.5 rounded-full font-medium ${MILESTONE_STATUS_COLORS[s]}`}>
              {fmt(s)}: {milestones.filter((m: any) => m.status === s).length}
            </span>
          ))}
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-[#d29c3c] hover:bg-[#b07d20] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Milestone
        </Button>
      </div>

      {isLoading ? <div className="text-center py-12 text-gray-400">Loading...</div> : milestones.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No milestones yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m: any) => (
            <div key={m.id} className="p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-[#1b110b]">{m.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MILESTONE_STATUS_COLORS[m.status]}`}>{fmt(m.status)}</span>
                    <Badge variant="outline" className="text-xs">{fmt(m.category)}</Badge>
                    {m.dueDate && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />Due {m.dueDate}</span>}
                    {m.owner && <span className="text-xs text-gray-400">Owner: {m.owner}</span>}
                  </div>
                  {m.description && <p className="text-xs text-gray-500 mb-2">{m.description}</p>}
                  <div className="flex items-center gap-2">
                    <Progress value={m.progress ?? 0} className="h-1.5 flex-1" />
                    <span className="text-xs text-gray-500 shrink-0">{m.progress ?? 0}%</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={v => { if (!v) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-['Roboto_Slab'] uppercase tracking-wide">{editId ? "Edit Milestone" : "New Milestone"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Milestone title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["upcoming","in_progress","completed","delayed","cancelled"].map(s => <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["product","business","technical","marketing","partnership","other"].map(s => <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Due Date</label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Completed Date</label><Input type="date" value={form.completedDate} onChange={e => setForm(f => ({ ...f, completedDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Owner</label><Input placeholder="Name or team" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Progress (%)</label><Input type="number" min="0" max="100" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#d29c3c] hover:bg-[#b07d20] text-white">
              {editId ? "Save Changes" : "Add Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={deleteId !== null} label="milestone" onConfirm={() => { if (deleteId) { deleteMutation.mutate({ id: deleteId }); setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KPIs TAB
// ══════════════════════════════════════════════════════════════════════════════
function KpisTab() {
  const utils = trpc.useUtils();
  const { data: kpis = [], isLoading } = trpc.taptico.listKpis.useQuery();
  const createMutation = trpc.taptico.createKpi.useMutation({ onSuccess: () => { utils.taptico.listKpis.invalidate(); toast.success("KPI added"); setModalOpen(false); resetForm(); } });
  const updateMutation = trpc.taptico.updateKpi.useMutation({ onSuccess: () => { utils.taptico.listKpis.invalidate(); toast.success("KPI updated"); setModalOpen(false); resetForm(); } });
  const deleteMutation = trpc.taptico.deleteKpi.useMutation({ onSuccess: () => { utils.taptico.listKpis.invalidate(); toast.success("KPI deleted"); } });

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "other", targetValue: "", currentValue: "", unit: "", period: "monthly", periodLabel: "", trend: "flat", status: "on_track", notes: "" });

  function resetForm() { setForm({ name: "", description: "", category: "other", targetValue: "", currentValue: "", unit: "", period: "monthly", periodLabel: "", trend: "flat", status: "on_track", notes: "" }); setEditId(null); }
  function openEdit(k: any) { setForm({ name: k.name, description: k.description ?? "", category: k.category, targetValue: k.targetValue ?? "", currentValue: k.currentValue ?? "", unit: k.unit ?? "", period: k.period, periodLabel: k.periodLabel ?? "", trend: k.trend ?? "flat", status: k.status, notes: k.notes ?? "" }); setEditId(k.id); setModalOpen(true); }
  function handleSubmit() {
    if (!form.name.trim()) { toast.error("KPI name is required"); return; }
    const payload = { name: form.name, description: form.description || undefined, category: form.category as any, targetValue: form.targetValue || undefined, currentValue: form.currentValue || undefined, unit: form.unit || undefined, period: form.period as any, periodLabel: form.periodLabel || undefined, trend: form.trend as any, status: form.status as any, notes: form.notes || undefined };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  }

  function TrendIcon({ trend }: { trend: string }) {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  }

  function pct(current: string | null, target: string | null) {
    const c = parseFloat(current ?? "0");
    const t = parseFloat(target ?? "0");
    if (!t) return 0;
    return Math.min(100, Math.round((c / t) * 100));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 text-xs">
          {["on_track","at_risk","off_track","achieved"].map(s => (
            <span key={s} className={`px-2 py-0.5 rounded-full font-medium ${KPI_STATUS_COLORS[s]}`}>
              {fmt(s)}: {kpis.filter((k: any) => k.status === s).length}
            </span>
          ))}
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-[#d29c3c] hover:bg-[#b07d20] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add KPI
        </Button>
      </div>

      {isLoading ? <div className="text-center py-12 text-gray-400">Loading...</div> : kpis.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No KPIs tracked yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpis.map((k: any) => {
            const progress = pct(k.currentValue, k.targetValue);
            return (
              <div key={k.id} className="p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1b110b]">{k.name}</span>
                      <TrendIcon trend={k.trend} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KPI_STATUS_COLORS[k.status]}`}>{fmt(k.status)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <Badge variant="outline" className="text-xs">{fmt(k.category)}</Badge>
                      <span>{fmt(k.period)}{k.periodLabel ? ` · ${k.periodLabel}` : ""}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(k)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(k.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {(k.targetValue || k.currentValue) && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Current: <strong className="text-[#1b110b]">{k.currentValue ?? "—"}{k.unit ? ` ${k.unit}` : ""}</strong></span>
                      <span>Target: <strong className="text-[#1b110b]">{k.targetValue ?? "—"}{k.unit ? ` ${k.unit}` : ""}</strong></span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-right text-xs text-gray-400 mt-0.5">{progress}%</p>
                  </div>
                )}
                {k.notes && <p className="text-xs text-gray-500 line-clamp-2">{k.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={v => { if (!v) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-['Roboto_Slab'] uppercase tracking-wide">{editId ? "Edit KPI" : "New KPI"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="KPI name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["revenue","growth","product","operations","client","team","other"].map(s => <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Period</label>
                <Select value={form.period} onValueChange={v => setForm(f => ({ ...f, period: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["weekly","monthly","quarterly","annual","custom"].map(s => <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Current Value</label><Input placeholder="0" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Target Value</label><Input placeholder="100" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))} /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">Unit</label><Input placeholder="%, $, leads" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["on_track","at_risk","off_track","achieved"].map(s => <SelectItem key={s} value={s}>{fmt(s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Trend</label>
                <Select value={form.trend} onValueChange={v => setForm(f => ({ ...f, trend: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="up">↑ Up</SelectItem><SelectItem value="flat">→ Flat</SelectItem><SelectItem value="down">↓ Down</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Input placeholder="Period label (e.g. Q2 2026)" value={form.periodLabel} onChange={e => setForm(f => ({ ...f, periodLabel: e.target.value }))} />
            <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#d29c3c] hover:bg-[#b07d20] text-white">
              {editId ? "Save Changes" : "Add KPI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete open={deleteId !== null} label="KPI" onConfirm={() => { if (deleteId) { deleteMutation.mutate({ id: deleteId }); setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function TapticoWorkspace() {
  const { user } = useAuth();

  if (!user) return null;
  if (user.role !== "taptico") return <AccessDenied />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#1b110b] flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#d29c3c]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1b110b] uppercase tracking-wide" style={{ fontFamily: "'Roboto Slab', serif" }}>
              Taptico Workspace
            </h1>
            <p className="text-sm text-gray-500">Private · Taptico Solutions internal operations</p>
          </div>
          <div className="ml-auto">
            <Badge className="bg-[#1b110b] text-[#d29c3c] border-[#d29c3c] border">
              <Lock className="w-3 h-3 mr-1" /> Internal Only
            </Badge>
          </div>
        </div>
        <div className="h-px bg-[#e6dec2] mt-4" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="todos">
        <TabsList className="mb-6 bg-[#f9f9f9] border border-[#e6dec2]">
          <TabsTrigger value="todos" className="data-[state=active]:bg-[#d29c3c] data-[state=active]:text-white gap-2">
            <CheckSquare className="w-4 h-4" /> To-Dos
          </TabsTrigger>
          <TabsTrigger value="meetings" className="data-[state=active]:bg-[#d29c3c] data-[state=active]:text-white gap-2">
            <Calendar className="w-4 h-4" /> Meetings
          </TabsTrigger>
          <TabsTrigger value="milestones" className="data-[state=active]:bg-[#d29c3c] data-[state=active]:text-white gap-2">
            <Flag className="w-4 h-4" /> Milestones
          </TabsTrigger>
          <TabsTrigger value="kpis" className="data-[state=active]:bg-[#d29c3c] data-[state=active]:text-white gap-2">
            <Target className="w-4 h-4" /> KPIs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos"><TodosTab /></TabsContent>
        <TabsContent value="meetings"><MeetingsTab /></TabsContent>
        <TabsContent value="milestones"><MilestonesTab /></TabsContent>
        <TabsContent value="kpis"><KpisTab /></TabsContent>
      </Tabs>
    </div>
  );
}
