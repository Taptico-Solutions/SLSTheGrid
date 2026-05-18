"use client";

import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

export default function TeamPage() {
  const me = trpc.auth.me.useQuery();
  const users = trpc.users.list.useQuery(undefined, {
    // Only admins can call this; gracefully no-op for others.
    enabled: !!me.data && (me.data.role === "admin" || me.data.role === "sls_admin"),
  });

  const projects = trpc.projects.list.useQuery();

  if (me.data && me.data.role !== "admin" && me.data.role !== "sls_admin") {
    return (
      <>
        <PageHeader title="Team" subtitle="Directory of everyone with access." />
        <EmptyState
          title="Admin view only for now"
          description="The full directory is admin-only during the trial. Ask your super admin to add someone, or message them in the project room."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Directory of everyone with access to The Grid."
      />

      {users.isLoading && (
        <div className="text-sm text-sls-dark-brown/60">Loading...</div>
      )}

      <Card>
        <CardTitle>Members</CardTitle>
        <CardContent className="mt-3 divide-y divide-sls-sand">
          {users.data?.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="font-medium text-sls-dark-brown">
                  {u.name ?? u.email ?? "Unnamed user"}
                </div>
                <div className="text-xs text-sls-dark-brown/60">
                  {u.email ?? "no email yet"} · {u.company ?? "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{u.role.replace("_", " ")}</Badge>
                {u.isActive ? null : (
                  <span className="text-xs text-sls-dark-brown/50">inactive</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-4 text-xs uppercase tracking-widest text-sls-dark-brown/50">
        Projects in scope: {projects.data?.length ?? 0}
      </div>
    </>
  );
}
