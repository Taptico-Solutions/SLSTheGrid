"use client";

import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

/** Spec §8.12 — Notifications. */
export default function NotificationsPage() {
  const list = trpc.notifications.list.useQuery();
  const markAllRead = trpc.notifications.markAllRead.useMutation();
  const utils = trpc.useUtils();

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Your personal notification feed."
        action={
          <Button
            variant="ghost"
            onClick={async () => {
              await markAllRead.mutateAsync();
              await utils.notifications.list.invalidate();
            }}
          >
            Mark all read
          </Button>
        }
      />

      {list.data && list.data.length === 0 && (
        <EmptyState title="All caught up" description="You have no notifications." />
      )}

      <div className="space-y-3">
        {list.data?.map((n) => (
          <Card key={n.id} className={n.isRead ? "" : "border-sls-gold"}>
            <CardContent>
              <div className="font-medium">{n.title}</div>
              {n.body && <div className="mt-1 text-sm text-sls-dark-brown/70">{n.body}</div>}
              <div className="mt-2 text-xs uppercase tracking-widest text-sls-dark-brown/50">
                {n.type}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
