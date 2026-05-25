import { trpc } from "@/lib/trpc";
import { PageHeader, EmptyState, GoldButton, LoadingSpinner } from "@/components/SLSComponents";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

function timeAgo(date: Date | string) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notifications() {
  const { data: notifications, isLoading, refetch } = trpc.notifications.list.useQuery();
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: () => refetch() });
  const markAllRead = trpc.notifications.markAllRead.useMutation({ onSuccess: () => { refetch(); toast.success("All marked as read"); } });

  const unread = (notifications ?? []).filter(n => !n.isRead);
  const read = (notifications ?? []).filter(n => n.isRead);

  return (
    <div className="page-enter">
      <PageHeader title="Notifications" subtitle="Stay up to date on project activity and alerts"
        actions={unread.length > 0 ? (
          <GoldButton onClick={() => markAllRead.mutate()}>
            <CheckCheck size={14} className="mr-1.5 inline" />Mark All Read
          </GoldButton>
        ) : undefined} />
      <div className="p-6 space-y-4">
        {isLoading ? <LoadingSpinner /> : (notifications ?? []).length === 0 ? (
          <EmptyState icon={<Bell size={48} />} title="No Notifications" description="You're all caught up! Notifications will appear here as projects are updated." />
        ) : (
          <>
            {unread.length > 0 && (
              <div className="sls-card">
                <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "#e8e3d8", background: "#fef9c3" }}>
                  <Bell size={13} style={{ color: "#854d0e" }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#854d0e", textTransform: "uppercase", letterSpacing: "0.08em" }}>Unread ({unread.length})</span>
                </div>
                <div className="divide-y" style={{ borderColor: "#f0ebe0" }}>
                  {unread.map(n => (
                    <div key={n.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[#fdf8ef] transition-colors cursor-pointer" onClick={() => markRead.mutate({ id: n.id })}>
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#d29c3c" }} />
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "13px", color: "#1b110b" }}>{n.title}</div>
                        {n.body && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62", marginTop: "2px" }}>{n.body}</div>}
                      </div>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080", flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {read.length > 0 && (
              <div className="sls-card">
                <div className="px-5 py-3 border-b" style={{ borderColor: "#e8e3d8" }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em" }}>Earlier ({read.length})</span>
                </div>
                <div className="divide-y" style={{ borderColor: "#f0ebe0" }}>
                  {read.map(n => (
                    <div key={n.id} className="flex items-start gap-4 px-5 py-4" style={{ opacity: 0.7 }}>
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#e8e3d8" }} />
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: "13px", color: "#262b2e" }}>{n.title}</div>
                        {n.body && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62", marginTop: "2px" }}>{n.body}</div>}
                      </div>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080", flexShrink: 0 }}>{timeAgo(n.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
