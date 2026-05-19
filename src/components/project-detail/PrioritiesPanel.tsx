"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/SLSComponents";
import { trpc } from "@/lib/trpc/client";
import {
  CalendarDays,
  Check,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { formatDate } from "./shared";

const STATUS_OPTIONS = [
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
] as const;
type Status = (typeof STATUS_OPTIONS)[number]["value"];

const ADMIN_ROLES = new Set(["admin", "sls_admin"]);

function statusBadgeClass(status: string) {
  switch (status) {
    case "on_track":
      return "bg-emerald-100 text-emerald-800";
    case "at_risk":
      return "bg-amber-100 text-amber-900";
    case "blocked":
      return "bg-red-100 text-red-800";
    case "done":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

type TaskDraft = { label: string };

type FormState = {
  id?: string;
  title: string;
  description: string;
  status: Status;
  targetDate: string;
  ownerUserId: string;
  tasks: TaskDraft[];
};

const emptyForm: FormState = {
  title: "",
  description: "",
  status: "on_track",
  targetDate: "",
  ownerUserId: "",
  tasks: [],
};

export function PrioritiesPanel({ projectId }: { projectId: number }) {
  const me = trpc.auth.me.useQuery();
  const isAdmin = ADMIN_ROLES.has(me.data?.role ?? "");

  const utils = trpc.useUtils();
  const list = trpc.priorities.listByProject.useQuery({ projectId });

  // users.list is admin-only on the server. Non-admins skip the call.
  const users = trpc.users.list.useQuery(undefined, { enabled: isAdmin });

  const toggle = trpc.priorities.toggleTask.useMutation({
    onSuccess: () => utils.priorities.listByProject.invalidate({ projectId }),
  });
  const create = trpc.priorities.create.useMutation({
    onSuccess: () => utils.priorities.listByProject.invalidate({ projectId }),
  });
  const update = trpc.priorities.update.useMutation({
    onSuccess: () => utils.priorities.listByProject.invalidate({ projectId }),
  });
  const remove = trpc.priorities.delete.useMutation({
    onSuccess: () => utils.priorities.listByProject.invalidate({ projectId }),
  });
  const addTask = trpc.priorities.addTask.useMutation({
    onSuccess: () => utils.priorities.listByProject.invalidate({ projectId }),
  });
  const deleteTask = trpc.priorities.deleteTask.useMutation({
    onSuccess: () => utils.priorities.listByProject.invalidate({ projectId }),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  const userById = useMemo(
    () => new Map((users.data ?? []).map((u) => [u.id, u] as const)),
    [users.data],
  );

  const period = useMemo(() => {
    const dates = (list.data ?? [])
      .map((p) => p.targetDate)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d));
    if (dates.length === 0) return null;
    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    if (min.getTime() === max.getTime()) return fmt(min);
    return `${fmt(min)} - ${fmt(max)}`;
  }, [list.data]);

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p: NonNullable<typeof list.data>[number]) {
    setForm({
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      status: p.status as Status,
      targetDate: p.targetDate ?? "",
      ownerUserId: p.ownerUserId ? String(p.ownerUserId) : "",
      tasks: p.tasks.map((t) => ({ label: t.label })),
    });
    setOpenMenuFor(null);
    setModalOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      targetDate: form.targetDate || undefined,
      ownerUserId: form.ownerUserId ? Number(form.ownerUserId) : undefined,
    };
    if (form.id) {
      await update.mutateAsync({ id: form.id, ...payload });
    } else {
      await create.mutateAsync({
        projectId,
        ...payload,
        tasks: form.tasks
          .filter((t) => t.label.trim())
          .map((t, idx) => ({ label: t.label.trim(), isDone: false, taskOrder: idx })),
      });
    }
    setModalOpen(false);
    setForm(emptyForm);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="text-xs uppercase tracking-widest text-sls-dark-brown/60">
          {period ? `Period: ${period}` : "No target dates set"}
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Priority
          </Button>
        )}
      </div>

      {list.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-sls-dark-brown/60">Loading…</CardContent>
        </Card>
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState
          title="No priorities yet."
          description={
            isAdmin
              ? "Add one to start tracking."
              : "Your project admin has not added priorities for this period."
          }
        />
      ) : (
        <ol className="space-y-3">
          {list.data.map((p, idx) => {
            const total = p.tasks.length;
            const done = p.tasks.filter((t) => t.isDone).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const owner = p.ownerUserId ? userById.get(p.ownerUserId) : null;
            return (
              <li key={p.id} className="sls-card overflow-visible p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-slab text-2xl text-sls-gold">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h3 className="font-slab text-lg text-sls-dark-brown">{p.title}</h3>
                    </div>
                    {p.description && (
                      <p className="mt-1 max-w-2xl text-sm text-sls-dark-brown/70">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-sls-dark-brown/60">
                      <span
                        className={
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold " +
                          statusBadgeClass(p.status)
                        }
                      >
                        {statusLabel(p.status)}
                      </span>
                      {p.targetDate && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(p.targetDate)}
                        </span>
                      )}
                      {owner && <span>Owner: {owner.name ?? owner.email ?? `User #${owner.id}`}</span>}
                      {!owner && p.ownerUserId && <span>Owner: User #{p.ownerUserId}</span>}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="relative">
                      <button
                        type="button"
                        aria-label="Priority actions"
                        onClick={() =>
                          setOpenMenuFor((cur) => (cur === p.id ? null : p.id))
                        }
                        className="rounded-md p-1.5 text-sls-dark-brown/60 hover:bg-sls-sand/40"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openMenuFor === p.id && (
                        <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-sls-sand bg-white shadow-card">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-sls-sand/40"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete priority "${p.title}"? This removes its tasks too.`,
                                )
                              ) {
                                remove.mutate({ id: p.id });
                                setOpenMenuFor(null);
                              }
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {total > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-sls-dark-brown/60">
                      <span>
                        {done} of {total} complete
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-sls-sand">
                      <div
                        className="h-full rounded-full bg-sls-gold transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                <ul className="mt-4 space-y-1.5">
                  {p.tasks.map((t) => (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => toggle.mutate({ taskId: t.id, isDone: !t.isDone })}
                        disabled={toggle.isPending}
                        className={
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
                          (t.isDone
                            ? "border-sls-gold bg-sls-gold text-white"
                            : "border-sls-sand bg-white hover:border-sls-gold")
                        }
                        aria-label={t.isDone ? "Mark as not done" : "Mark as done"}
                      >
                        {t.isDone && <Check className="h-3 w-3" />}
                      </button>
                      <span
                        className={
                          "flex-1 " +
                          (t.isDone
                            ? "text-sls-dark-brown/40 line-through"
                            : "text-sls-dark-brown")
                        }
                      >
                        {t.label}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Delete this task?")) {
                              deleteTask.mutate({ id: t.id });
                            }
                          }}
                          className="text-sls-dark-brown/40 hover:text-red-600"
                          aria-label="Delete task"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                  {isAdmin && <InlineAddTask priorityId={p.id} addTask={addTask} />}
                </ul>
              </li>
            );
          })}
        </ol>
      )}

      {modalOpen && (
        <PriorityModal
          form={form}
          setForm={setForm}
          onClose={() => setModalOpen(false)}
          onSubmit={onSubmit}
          users={users.data ?? []}
          isSaving={create.isPending || update.isPending}
          error={create.error?.message ?? update.error?.message ?? null}
        />
      )}
    </div>
  );
}

function InlineAddTask({
  priorityId,
  addTask,
}: {
  priorityId: string;
  addTask: ReturnType<typeof trpc.priorities.addTask.useMutation>;
}) {
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <li className="pt-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-sls-gold hover:underline"
        >
          + Add task
        </button>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2 pt-1">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="New task"
        className="flex-1 rounded-md border border-sls-sand px-2 py-1 text-sm"
        autoFocus
      />
      <Button
        size="sm"
        onClick={() => {
          if (!label.trim()) return;
          addTask.mutate({ priorityId, label: label.trim() });
          setLabel("");
          setOpen(false);
        }}
        disabled={addTask.isPending}
      >
        Add
      </Button>
      <button
        type="button"
        onClick={() => {
          setLabel("");
          setOpen(false);
        }}
        className="text-xs text-sls-dark-brown/60 hover:underline"
      >
        Cancel
      </button>
    </li>
  );
}

function PriorityModal({
  form,
  setForm,
  onClose,
  onSubmit,
  users,
  isSaving,
  error,
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  users: Array<{ id: number; name: string | null; email: string | null; role: string }>;
  isSaving: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-slab text-xl text-sls-dark-brown">
            {form.id ? "Edit priority" : "Add priority"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-sls-dark-brown/60 hover:text-sls-dark-brown"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-widest text-sls-dark-brown/60">
              Title
            </span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-md border border-sls-sand px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-widest text-sls-dark-brown/60">
              Description
            </span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-sls-sand px-3 py-2"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase tracking-widest text-sls-dark-brown/60">
                Status
              </span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Status })
                }
                className="w-full rounded-md border border-sls-sand px-3 py-2"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase tracking-widest text-sls-dark-brown/60">
                Target date
              </span>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="w-full rounded-md border border-sls-sand px-3 py-2"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs uppercase tracking-widest text-sls-dark-brown/60">
                Owner
              </span>
              <select
                value={form.ownerUserId}
                onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}
                className="w-full rounded-md border border-sls-sand px-3 py-2"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email ?? `User #${u.id}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!form.id && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-sls-dark-brown/60">
                  Tasks
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, tasks: [...form.tasks, { label: "" }] })
                  }
                  className="text-xs text-sls-gold hover:underline"
                >
                  + Add task
                </button>
              </div>
              <ul className="space-y-2">
                {form.tasks.map((t, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <input
                      value={t.label}
                      onChange={(e) => {
                        const next = [...form.tasks];
                        next[idx] = { label: e.target.value };
                        setForm({ ...form, tasks: next });
                      }}
                      placeholder={`Task ${idx + 1}`}
                      className="flex-1 rounded-md border border-sls-sand px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          tasks: form.tasks.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-sls-dark-brown/40 hover:text-red-600"
                      aria-label="Remove task"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
