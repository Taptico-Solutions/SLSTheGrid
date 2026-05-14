"use client";

import Link from "next/link";
import { PageHeader, StatCard, EmptyState } from "@/components/SLSComponents";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  CheckSquare,
  CalendarClock,
  Bell,
  FileUp,
  MessageSquare,
  ListChecks,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const me = trpc.auth.me.useQuery();
  const stats = trpc.projects.getStats.useQuery();
  const notifications = trpc.notifications.list.useQuery();
  const milestones = trpc.milestones.list.useQuery();
  const documents = trpc.documents.list.useQuery();
  const activity = trpc.activity.list.useQuery();

  const unread = notifications.data?.filter((n) => !n.isRead).length ?? 0;
  const openMilestones = (milestones.data ?? []).filter(
    (m) => m.status === "in_progress" || m.status === "pending",
  );
  const currentMilestone =
    (milestones.data ?? []).find((m) => m.status === "in_progress") ??
    openMilestones[0];

  const recentDocs = (documents.data ?? []).slice(0, 5);

  const greeting = (() => {
    const first = me.data?.name?.split(" ")[0];
    return first ? `Welcome back, ${first}.` : "Welcome back.";
  })();

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={greeting}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Projects"
          value={stats.data?.active ?? "—"}
          icon={<FolderKanban size={18} />}
        />
        <StatCard
          label="Open Milestones"
          value={openMilestones.length}
          icon={<CheckSquare size={18} />}
        />
        <StatCard
          label="Next Due"
          value={formatDate(currentMilestone?.dueDate)}
          icon={<CalendarClock size={18} />}
        />
        <StatCard
          label="Unread Notifications"
          value={unread}
          icon={<Bell size={18} />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>This Week</CardTitle>
          <CardContent className="mt-3">
            {currentMilestone ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sls-dark-brown">
                      {currentMilestone.title}
                    </div>
                    <div className="text-xs text-sls-dark-brown/60">
                      Due {formatDate(currentMilestone.dueDate)}
                    </div>
                  </div>
                  <Badge status={currentMilestone.status}>
                    {currentMilestone.status.replace("_", " ")}
                  </Badge>
                </div>
                {currentMilestone.description && (
                  <p className="mt-3 text-sm text-sls-dark-brown/80">
                    {currentMilestone.description}
                  </p>
                )}
              </div>
            ) : (
              <EmptyState
                title="No active milestones"
                description="Once a milestone is in flight you will see it here."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardTitle>Quick Links</CardTitle>
          <CardContent className="mt-3 grid grid-cols-1 gap-2">
            <Button asChild variant="ghost">
              <Link href="/projects">
                <FolderKanban size={14} /> Projects
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/documents">
                <FileUp size={14} /> Documents
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/messages">
                <MessageSquare size={14} /> Messages
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/timeline">
                <ListChecks size={14} /> Timeline
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Notifications</CardTitle>
          <CardContent className="mt-3 divide-y divide-sls-sand">
            {!notifications.data ||
              (notifications.data.length === 0 && (
                <EmptyState title="All caught up" description="Nothing waiting on you." />
              ))}
            {notifications.data?.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className={`py-2 text-sm ${n.isRead ? "text-sls-dark-brown/70" : "text-sls-dark-brown"}`}
              >
                <div className="font-medium">{n.title}</div>
                {n.body && (
                  <div className="text-xs text-sls-dark-brown/60">{n.body}</div>
                )}
              </div>
            ))}
            {(notifications.data?.length ?? 0) > 5 && (
              <Link
                href="/notifications"
                className="block py-2 text-xs uppercase tracking-widest text-sls-gold"
              >
                See all
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardTitle>Recent Documents</CardTitle>
          <CardContent className="mt-3 divide-y divide-sls-sand">
            {recentDocs.length === 0 && (
              <EmptyState
                title="No documents yet"
                description="Upload a case study or contract to populate this list."
              />
            )}
            {recentDocs.map((d) => (
              <div key={d.id} className="py-2 text-sm">
                <div className="font-medium text-sls-dark-brown">{d.name}</div>
                <div className="text-xs text-sls-dark-brown/60">
                  {d.category.replace("_", " ")} ·{" "}
                  {formatDate(d.createdAt)}
                </div>
              </div>
            ))}
            {(documents.data?.length ?? 0) > 5 && (
              <Link
                href="/documents"
                className="block py-2 text-xs uppercase tracking-widest text-sls-gold"
              >
                See all
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle>Recent Activity</CardTitle>
        <CardContent className="mt-3">
          {activity.data && activity.data.length > 0 ? (
            <ul className="divide-y divide-sls-sand text-sm">
              {activity.data.slice(0, 10).map((a) => (
                <li key={a.id} className="py-2">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-sls-dark-brown/60">
                    {" · "}
                    {a.entityType ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No activity yet"
              description="As your team creates projects, posts messages, and uploads files, the feed fills in here."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
