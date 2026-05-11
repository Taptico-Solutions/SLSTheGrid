"use client";

import { PageHeader } from "@/components/SLSComponents";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

/** Spec §8.16 — Admin (admin / sls_admin only). */
export default function AdminPage() {
  const me = trpc.auth.me.useQuery();
  const seedStatus = trpc.seed.status.useQuery();
  const loadSeed = trpc.seed.load.useMutation();
  const clearSeed = trpc.seed.clear.useMutation();
  const utils = trpc.useUtils();

  if (!me.data) return null;
  if (me.data.role !== "admin" && me.data.role !== "sls_admin") {
    return <div className="text-sm text-red-600">Forbidden.</div>;
  }

  return (
    <>
      <PageHeader title="Admin" subtitle="System administration." />

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
        <CardContent className="mt-4 text-sm text-sls-dark-brown/60">
          Coming next — see spec §8.16. Use the &quot;users&quot; tRPC router for now.
        </CardContent>
      </Card>
    </>
  );
}
