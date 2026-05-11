"use client";

import Link from "next/link";
import { PageHeader, StatCard, EmptyState } from "@/components/SLSComponents";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  CheckSquare,
  CalendarClock,
  Bell,
  Plus,
  FileUp,
  ListChecks,
  DollarSign,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

/** Spec §8.2 — Dashboard. */
export default function DashboardPage() {
  const stats = trpc.projects.getStats.useQuery();
  const notifications = trpc.notifications.list.useQuery();
  const activity = trpc.activity.list.useQuery();

  const unread = notifications.data?.filter((n) => !n.isRead).length ?? 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Command center for project health, submittals, and notifications."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Projects" value={stats.data?.active ?? "—"} icon={<FolderKanban size={18} />} />
        <StatCard label="Pending Submittals" value={"—"} icon={<CheckSquare size={18} />} />
        <StatCard label="Overdue Milestones" value={"—"} icon={<CalendarClock size={18} />} />
        <StatCard label="Unread Notifications" value={unread} icon={<Bell size={18} />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Recent Activity</CardTitle>
          <CardContent className="mt-4">
            {activity.data && activity.data.length > 0 ? (
              <ul className="divide-y divide-sls-sand text-sm">
                {activity.data.slice(0, 10).map((a) => (
                  <li key={a.id} className="py-2">
                    <span className="font-medium">{a.action}</span>
                    <span className="text-sls-dark-brown/60"> · {a.entityType ?? "—"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No activity yet"
                description="Once your team starts creating projects and posting messages, recent activity will appear here."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardTitle>Quick Links</CardTitle>
          <CardContent className="mt-4 grid grid-cols-1 gap-2">
            <Button asChild variant="ghost"><Link href="/projects"><Plus size={14} /> New Project</Link></Button>
            <Button asChild variant="ghost"><Link href="/documents"><FileUp size={14} /> Upload Document</Link></Button>
            <Button asChild variant="ghost"><Link href="/submittals"><ListChecks size={14} /> View Submittals</Link></Button>
            <Button asChild variant="ghost"><Link href="/budget"><DollarSign size={14} /> View Budget</Link></Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
