"use client";

import { useState } from "react";
import { PageHeader } from "@/components/SLSComponents";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const ROLE_OPTIONS = [
  { value: "sls_admin", label: "SLS Admin (full access)" },
  { value: "sls_pm", label: "SLS PM" },
  { value: "sls_rep", label: "SLS Rep" },
  { value: "client_architect", label: "Client - Architect" },
  { value: "client_gc", label: "Client - GC" },
  { value: "user", label: "User (no project unless added)" },
  { value: "admin", label: "Taptico Admin" },
] as const;

export default function AdminPage() {
  const me = trpc.auth.me.useQuery();
  const projects = trpc.projects.list.useQuery();
  const seedStatus = trpc.seed.status.useQuery();
  const loadSeed = trpc.seed.load.useMutation();
  const clearSeed = trpc.seed.clear.useMutation();
  const invite = trpc.admin.invite.useMutation();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]["value"]>("sls_admin");
  const [projectIds, setProjectIds] = useState<number[]>([]);
  const [sent, setSent] = useState<string | null>(null);

  if (!me.data) return null;
  if (me.data.role !== "admin" && me.data.role !== "sls_admin") {
    return <div className="text-sm text-red-600">Forbidden.</div>;
  }

  const toggleProject = (id: number) => {
    setProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSent(null);
    if (!email) return;
    await invite.mutateAsync({
      email,
      name: name || undefined,
      role,
      projectIds: projectIds.length ? projectIds : undefined,
    });
    setSent(email);
    setEmail("");
    setName("");
    setProjectIds([]);
    await utils.users.list.invalidate();
  };

  return (
    <>
      <PageHeader title="Admin" subtitle="Invite users, run seed data, manage access." />

      <Card className="mb-6">
        <CardTitle>Invite User</CardTitle>
        <CardContent className="mt-4">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                Email
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                placeholder="cshore@southernlightingsource.com"
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                Name (optional)
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                placeholder="Cape Shore"
              />
            </label>

            <label className="text-sm sm:col-span-2">
              <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                Role
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-sm sm:col-span-2">
              <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                Add to projects (optional)
              </div>
              <div className="flex flex-wrap gap-2">
                {projects.data?.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProject(p.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      projectIds.includes(p.id)
                        ? "border-sls-gold bg-sls-gold-pale text-sls-dark-brown"
                        : "border-sls-sand text-sls-dark-brown/70 hover:bg-sls-sand/40"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={!email || invite.isPending}>
                {invite.isPending ? "Sending..." : "Send invite"}
              </Button>
              {sent && (
                <span className="text-sm text-sls-dark-brown/70">
                  Invite sent to <span className="font-medium">{sent}</span>.
                </span>
              )}
              {invite.error && (
                <span className="text-sm text-red-600">{invite.error.message}</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardTitle>Demo Data</CardTitle>
        <CardContent className="mt-4 flex items-center gap-4">
          <div className="text-sm">
            Demo projects in DB:{" "}
            <span className="font-semibold">{seedStatus.data?.demoProjects ?? "—"}</span>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              onClick={async () => {
                if (!confirm("Load demo dataset?")) return;
                await loadSeed.mutateAsync();
                await utils.seed.status.invalidate();
              }}
            >
              Load Demo Data
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirm("Clear ALL records tagged [DEMO]?")) return;
                await clearSeed.mutateAsync();
                await utils.seed.status.invalidate();
              }}
            >
              Clear Demo Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardTitle>User Management</CardTitle>
        <CardContent className="mt-4 text-sm text-sls-dark-brown/70">
          Use the form above to invite users. To change a role on an existing user,
          call the <code>users.updateRole</code> tRPC mutation. A full management UI is
          on the roadmap.
        </CardContent>
      </Card>
    </>
  );
}
