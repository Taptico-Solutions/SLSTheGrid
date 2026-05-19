"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/SLSComponents";
import { trpc } from "@/lib/trpc/client";
import { Plus, Loader2, Trash2 } from "lucide-react";

const INTERNAL_ROLES = ["sls_admin", "sls_rep", "sls_pm", "admin"];

export function TeamTab({
  projectId,
  currentUserRole,
}: {
  projectId: number;
  currentUserRole: string;
}) {
  const isInternal = INTERNAL_ROLES.includes(currentUserRole);

  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState("");
  const [roleLabel, setRoleLabel] = useState("");

  const utils = trpc.useUtils();
  const list = trpc.team.list.useQuery({ projectId });
  // Only admins can call users.list. Non-admins use the manual user-id input.
  const allUsers = trpc.users.list.useQuery(undefined, { enabled: isInternal });

  const add = trpc.team.add.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate({ projectId });
      setShowForm(false);
      setUserId("");
      setRoleLabel("");
    },
  });
  const remove = trpc.team.remove.useMutation({
    onSuccess: () => utils.team.list.invalidate({ projectId }),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = Number(userId);
    if (!Number.isFinite(id) || id <= 0) return;
    add.mutate({
      projectId,
      userId: id,
      role: roleLabel.trim() || undefined,
    });
  }

  const existingIds = new Set(list.data?.map((t) => t.userId) ?? []);
  const candidates = (allUsers.data ?? []).filter((u) => !existingIds.has(u.id));

  return (
    <div className="space-y-4">
      {isInternal && (
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            {showForm ? "Cancel" : "Add member"}
          </Button>
        </div>
      )}

      {showForm && isInternal && (
        <Card>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="rounded-md border border-sls-sand px-3 py-2 text-sm sm:col-span-2"
                required
              >
                <option value="">Select a user…</option>
                {candidates.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email || `User #${u.id}`} ({u.role})
                  </option>
                ))}
              </select>
              <input
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                placeholder="Project role (optional)"
                className="rounded-md border border-sls-sand px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm" disabled={add.isPending} className="sm:col-span-3">
                {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </form>
            {add.error && (
              <p className="mt-2 text-xs text-red-600">{add.error.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-6 text-sm text-sls-dark-brown/60">Loading…</div>
          ) : !list.data || list.data.length === 0 ? (
            <EmptyState
              title="No team members yet"
              description={
                isInternal
                  ? "Add the first team member from your active users."
                  : "An admin can add team members to this project."
              }
            />
          ) : (
            <ul className="divide-y divide-sls-sand">
              {list.data.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="font-medium text-sls-dark-brown">
                      {t.userName ?? t.userEmail ?? `User #${t.userId}`}
                    </div>
                    <div className="text-xs text-sls-dark-brown/60">
                      {t.userCompany ? `${t.userCompany} · ` : ""}
                      {t.userRole ?? "user"}
                      {t.role ? ` · ${t.role}` : ""}
                    </div>
                  </div>
                  {isInternal && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove.mutate({ projectId, userId: t.userId })}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
