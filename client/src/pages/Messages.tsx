import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, EmptyState, GoldButton, LoadingSpinner } from "@/components/SLSComponents";
import { MessageSquare, Building2 } from "lucide-react";
import { Link } from "wouter";

export default function Messages() {
  const { user } = useAuth();
  const { data: projects, isLoading } = trpc.projects.list.useQuery({});
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [msgContent, setMsgContent] = useState("");

  const { data: msgs, refetch: refetchMsgs } = trpc.messages.listByProject.useQuery(
    { projectId: selectedProject ?? 0 },
    { enabled: !!selectedProject }
  );
  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => { refetchMsgs(); setMsgContent(""); },
  });

  const selectedProj = (projects ?? []).find(p => p.id === selectedProject);

  return (
    <div className="page-enter">
      <PageHeader title="Messages" subtitle="Project communications and team discussions" />
      <div className="flex h-[calc(100vh-120px)]">
        {/* Project list sidebar */}
        <div className="w-64 border-r flex-shrink-0 overflow-y-auto" style={{ borderColor: "#e8e3d8", background: "#fafaf8" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#e8e3d8" }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#a09080", textTransform: "uppercase", letterSpacing: "0.1em" }}>Projects</span>
          </div>
          {isLoading ? <LoadingSpinner /> : (projects ?? []).length === 0 ? (
            <div className="p-4 text-center" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a09080" }}>No projects yet</div>
          ) : (
            <div>
              {(projects ?? []).map(p => (
                <button key={p.id} onClick={() => setSelectedProject(p.id)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors ${selectedProject === p.id ? "bg-[#f5e9cc]" : "hover:bg-white"}`}
                  style={{ borderColor: "#f0ebe0" }}>
                  <div className="flex items-center gap-2">
                    <Building2 size={13} style={{ color: selectedProject === p.id ? "#d29c3c" : "#a09080", flexShrink: 0 }} />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: selectedProject === p.id ? 600 : 400, color: selectedProject === p.id ? "#1b110b" : "#262b2e" }} className="truncate">{p.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedProject ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={<MessageSquare size={48} />} title="Select a Project" description="Choose a project from the left to view its messages." />
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: "#e8e3d8", background: "#ffffff" }}>
                <Building2 size={16} style={{ color: "#d29c3c" }} />
                <span style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{selectedProj?.name}</span>
                <Link href={`/projects/${selectedProject}`}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#d29c3c", marginLeft: "auto", cursor: "pointer" }}>View Project →</span>
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ background: "#fafaf8" }}>
                {(msgs ?? []).length === 0 ? (
                  <EmptyState icon={<MessageSquare size={40} />} title="No Messages" description="Start the conversation with your project team." />
                ) : (
                  (msgs ?? []).map(m => (
                    <div key={m.id} className={`flex gap-3 ${m.authorId === user?.id ? "flex-row-reverse" : ""}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "#d29c3c" }}>
                        {String(m.authorId)[0]}
                      </div>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-lg ${m.authorId === user?.id ? "bg-[#1b110b] text-white" : "bg-white border"}`} style={{ borderColor: m.authorId === user?.id ? "transparent" : "#e8e3d8" }}>
                        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: m.authorId === user?.id ? "#ffffff" : "#1b110b" }}>{m.content}</p>
                        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: m.authorId === user?.id ? "#c8bfb0" : "#a09080", marginTop: "3px" }}>
                          {new Date(m.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-5 py-3 border-t flex gap-2" style={{ borderColor: "#e8e3d8", background: "#ffffff" }}>
                <input value={msgContent} onChange={e => setMsgContent(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && msgContent.trim()) { sendMessage.mutate({ projectId: selectedProject, content: msgContent }); } }}
                  placeholder="Type a message and press Enter..."
                  className="flex-1 px-3 py-2 rounded-md text-sm"
                  style={{ border: "1px solid #e8e3d8", fontFamily: "Inter, sans-serif", outline: "none" }} />
                <GoldButton variant="filled" size="sm" onClick={() => { if (msgContent.trim()) sendMessage.mutate({ projectId: selectedProject, content: msgContent }); }}>Send</GoldButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
