"use client";

import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

export default function ManufacturersPage() {
  const list = trpc.manufacturers.list.useQuery();

  return (
    <>
      <PageHeader
        title="Manufacturers"
        subtitle="Vendor directory. Internal-only view during the trial."
      />

      {list.isLoading && (
        <div className="text-sm text-sls-dark-brown/60">Loading...</div>
      )}

      {list.data && list.data.length === 0 && (
        <EmptyState
          title="No manufacturers yet"
          description="Add a manufacturer to start tagging products against it."
        />
      )}

      <Card>
        <CardTitle>Vendors</CardTitle>
        <CardContent className="mt-3 divide-y divide-sls-sand">
          {list.data?.map((m) => (
            <div key={m.id} className="py-2 text-sm">
              <div className="font-medium text-sls-dark-brown">{m.name}</div>
              <div className="text-xs text-sls-dark-brown/60">
                {m.website ?? "—"}
                {m.contactName ? ` · ${m.contactName}` : ""}
              </div>
              {m.notes && (
                <div className="mt-1 text-xs text-sls-dark-brown/70">{m.notes}</div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
