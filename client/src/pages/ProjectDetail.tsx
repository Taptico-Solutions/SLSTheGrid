import { useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageHeader, StatusBadge, GoldButton, LoadingSpinner, EmptyState } from "@/components/SLSComponents";
import { Building2, ChevronLeft, FileText, Package, Clock, DollarSign, Users, MessageSquare, ClipboardCheck, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatCurrency(val?: string | null) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d?: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = parseInt(params?.id ?? "0");
  const { user } = useAuth();
  const isInternal = ["sls_admin", "sls_rep", "sls_pm", "admin"].includes(user?.role ?? "");
  const canApprove = ["sls_admin", "sls_pm", "client_architect", "admin"].includes(user?.role ?? "");

  const { data: project, isLoading, refetch } = trpc.projects.getById.useQuery({ id: projectId });
  const { data: products, refetch: refetchProducts } = trpc.products.listByProject.useQuery({ projectId });
  const { data: milestones, refetch: refetchMilestones } = trpc.milestones.listByProject.useQuery({ projectId });
  const { data: budget, refetch: refetchBudget } = trpc.budget.listByProject.useQuery({ projectId });
  const { data: submittals, refetch: refetchSubmittals } = trpc.submittals.listByProject.useQuery({ projectId });
  const { data: team, refetch: refetchTeam } = trpc.team.listByProject.useQuery({ projectId });
  const { data: msgs, refetch: refetchMsgs } = trpc.messages.listByProject.useQuery({ projectId });

  const updateProject = trpc.projects.update.useMutation({ onSuccess: () => { refetch(); toast.success("Project updated"); } });
  const createProduct = trpc.products.create.useMutation({ onSuccess: () => { refetchProducts(); setShowAddProduct(false); toast.success("Product added"); } });
  const deleteProduct = trpc.products.delete.useMutation({ onSuccess: () => { refetchProducts(); toast.success("Removed"); } });
  const createMilestone = trpc.milestones.create.useMutation({ onSuccess: () => { refetchMilestones(); setShowAddMilestone(false); toast.success("Milestone added"); } });
  const updateMilestone = trpc.milestones.update.useMutation({ onSuccess: () => refetchMilestones() });
  const deleteMilestone = trpc.milestones.delete.useMutation({ onSuccess: () => refetchMilestones() });
  const createBudget = trpc.budget.create.useMutation({ onSuccess: () => { refetchBudget(); setShowAddBudget(false); toast.success("Budget item added"); } });
  const createSubmittal = trpc.submittals.create.useMutation({ onSuccess: () => { refetchSubmittals(); setShowAddSubmittal(false); toast.success("Submittal created"); } });
  const reviewSubmittal = trpc.submittals.review.useMutation({ onSuccess: () => { refetchSubmittals(); toast.success("Submittal reviewed"); } });
  const sendMessage = trpc.messages.send.useMutation({ onSuccess: () => { refetchMsgs(); setMsgContent(""); } });

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddSubmittal, setShowAddSubmittal] = useState(false);
  const [msgContent, setMsgContent] = useState("");
  const [productForm, setProductForm] = useState({ manufacturerName: "", modelNumber: "", description: "", category: "", quantity: 1, unitCost: "", notes: "" });
  const [milestoneForm, setMilestoneForm] = useState({ name: "", type: "custom" as const, targetDate: "", status: "pending" as const, notes: "" });
  const [budgetForm, setBudgetForm] = useState({ description: "", category: "", originalAmount: "", type: "original" as const, notes: "" });
  const [submittalForm, setSubmittalForm] = useState({ title: "", description: "" });

  const budgetTotal = (budget ?? []).reduce((s, i) => s + parseFloat(i.currentAmount ?? "0"), 0);
  const productTotal = (products ?? []).reduce((s, p) => s + parseFloat(p.totalCost ?? "0"), 0);

  if (isLoading) return <div className="p-8"><LoadingSpinner /></div>;
  if (!project) return (
    <div className="p-8">
      <EmptyState icon={<Building2 size={48} />} title="Project Not Found" description="This project may have been removed or you don't have access." action={<Link href="/projects"><GoldButton>Back to Projects</GoldButton></Link>} />
    </div>
  );

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: "#e8e3d8", background: "#ffffff" }}>
        <Link href="/projects">
          <div className="flex items-center gap-1 mb-3 cursor-pointer" style={{ color: "#d29c3c", fontFamily: "Inter, sans-serif", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <ChevronLeft size={14} /> Projects
          </div>
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "22px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
              {project.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <StatusBadge status={project.status} />
              <StatusBadge status={project.timelineStatus ?? "on_track"} />
              <StatusBadge status={project.budgetStatus ?? "on_budget"} />
              {project.region && <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080", textTransform: "uppercase", letterSpacing: "0.06em" }}>{project.region}</span>}
            </div>
          </div>
          {isInternal && (
            <Select value={project.status} onValueChange={v => updateProject.mutate({ id: projectId, status: v as any })}>
              <SelectTrigger className="w-[180px] text-xs" style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["intake","active","pending_approval","ordered","delivered","complete","archived"].map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g," ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {/* Key info row */}
        <div className="flex flex-wrap gap-6 mt-4">
          {[
            { label: "Location", value: [project.city, project.state].filter(Boolean).join(", ") || "—" },
            { label: "Building Type", value: project.buildingType || "—" },
            { label: "Budget", value: formatCurrency(project.currentBudget) },
            { label: "Target Delivery", value: formatDate(project.targetDeliveryAt) },
          ].map(item => (
            <div key={item.label}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#a09080", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#1b110b", fontWeight: 500 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="p-6">
        <Tabs defaultValue="products">
          <TabsList className="mb-4" style={{ background: "#f5f0e8", borderRadius: "6px" }}>
            {[
              { value: "products", label: "Products", icon: <Package size={13} /> },
              { value: "milestones", label: "Timeline", icon: <Clock size={13} /> },
              { value: "budget", label: "Budget", icon: <DollarSign size={13} /> },
              { value: "submittals", label: "Submittals", icon: <ClipboardCheck size={13} /> },
              { value: "messages", label: "Messages", icon: <MessageSquare size={13} /> },
              { value: "team", label: "Team", icon: <Users size={13} /> },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs uppercase tracking-wide" style={{ fontFamily: "Inter, sans-serif" }}>
                {tab.icon}{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="sls-card">
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
                <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Product Line Items ({products?.length ?? 0})
                </h3>
                {isInternal && <GoldButton size="sm" variant="filled" onClick={() => setShowAddProduct(true)}><Plus size={12} className="mr-1" />Add Product</GoldButton>}
              </div>
              {(products ?? []).length === 0 ? (
                <div className="p-6"><EmptyState icon={<Package size={40} />} title="No Products Yet" description="Add lighting products to this project." action={isInternal ? <GoldButton variant="filled" onClick={() => setShowAddProduct(true)}>Add First Product</GoldButton> : undefined} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "#f9f6f0" }}>
                        {["Manufacturer", "Model #", "Description", "Category", "Qty", "Unit Cost", "Total", "Status", ""].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e8e3d8" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(products ?? []).map(p => (
                        <tr key={p.id} className="border-b" style={{ borderColor: "#f0ebe0" }}>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#1b110b" }}>{p.manufacturerName ?? "—"}</td>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{p.modelNumber ?? "—"}</td>
                          <td className="px-4 py-3 max-w-[180px]" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}><div className="truncate">{p.description ?? "—"}</div></td>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>{p.category ?? "—"}</td>
                          <td className="px-4 py-3 text-center" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{p.quantity}</td>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{formatCurrency(p.unitCost)}</td>
                          <td className="px-4 py-3 font-medium" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#1b110b" }}>{formatCurrency(p.totalCost)}</td>
                          <td className="px-4 py-3"><StatusBadge status={p.status ?? "specified"} /></td>
                          <td className="px-4 py-3">
                            {isInternal && <button onClick={() => deleteProduct.mutate({ id: p.id })} className="p-1 rounded hover:bg-red-50 transition-colors"><Trash2 size={13} style={{ color: "#ef4444" }} /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#f9f6f0" }}>
                        <td colSpan={6} className="px-4 py-3 text-right" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase" }}>Total</td>
                        <td className="px-4 py-3" style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#d29c3c" }}>{formatCurrency(String(productTotal))}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones">
            <div className="sls-card">
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
                <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Project Timeline
                </h3>
                {isInternal && <GoldButton size="sm" variant="filled" onClick={() => setShowAddMilestone(true)}><Plus size={12} className="mr-1" />Add Milestone</GoldButton>}
              </div>
              {(milestones ?? []).length === 0 ? (
                <div className="p-6"><EmptyState icon={<Clock size={40} />} title="No Milestones" description="Add milestones to track project progress." action={isInternal ? <GoldButton variant="filled" onClick={() => setShowAddMilestone(true)}>Add First Milestone</GoldButton> : undefined} /></div>
              ) : (
                <div className="p-5 space-y-3">
                  {(milestones ?? []).map((m, idx) => (
                    <div key={m.id} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.status === "complete" ? "bg-green-100" : m.status === "at_risk" ? "bg-yellow-100" : m.status === "delayed" ? "bg-red-100" : "bg-[#f5e9cc]"}`}>
                          {m.status === "complete" ? <Check size={14} style={{ color: "#16a34a" }} /> : <Clock size={14} style={{ color: "#d29c3c" }} />}
                        </div>
                        {idx < (milestones ?? []).length - 1 && <div className="w-0.5 h-8 mt-1" style={{ background: "#e8e3d8" }} />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "13px", color: "#1b110b" }}>{m.name}</span>
                          <StatusBadge status={m.status ?? "pending"} />
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>Target: {formatDate(m.targetDate)}</span>
                          {m.actualDate && <span style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#16a34a" }}>Completed: {formatDate(m.actualDate)}</span>}
                        </div>
                        {m.notes && <p style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62", marginTop: "4px" }}>{m.notes}</p>}
                      </div>
                      {isInternal && (
                        <div className="flex gap-1 flex-shrink-0">
                          {m.status !== "complete" && (
                            <button onClick={() => updateMilestone.mutate({ id: m.id, status: "complete", actualDate: new Date() })} className="p-1.5 rounded hover:bg-green-50 transition-colors" title="Mark complete">
                              <Check size={13} style={{ color: "#16a34a" }} />
                            </button>
                          )}
                          <button onClick={() => deleteMilestone.mutate({ id: m.id })} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                            <Trash2 size={13} style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget">
            <div className="sls-card">
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
                <div>
                  <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Budget Tracker</h3>
                  <div className="flex gap-4 mt-1">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}>Budget: <strong style={{ color: "#1b110b" }}>{formatCurrency(project.originalBudget)}</strong></span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}>Committed: <strong style={{ color: budgetTotal > parseFloat(project.originalBudget ?? "0") ? "#ef4444" : "#16a34a" }}>{formatCurrency(String(budgetTotal))}</strong></span>
                  </div>
                </div>
                {isInternal && <GoldButton size="sm" variant="filled" onClick={() => setShowAddBudget(true)}><Plus size={12} className="mr-1" />Add Item</GoldButton>}
              </div>
              {(budget ?? []).length === 0 ? (
                <div className="p-6"><EmptyState icon={<DollarSign size={40} />} title="No Budget Items" description="Add budget line items to track costs." action={isInternal ? <GoldButton variant="filled" onClick={() => setShowAddBudget(true)}>Add Budget Item</GoldButton> : undefined} /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "#f9f6f0" }}>
                        {["Description", "Category", "Type", "Original", "Current", "Notes"].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left" style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e8e3d8" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(budget ?? []).map(item => (
                        <tr key={item.id} className="border-b" style={{ borderColor: "#f0ebe0" }}>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#1b110b", fontWeight: 500 }}>{item.description}</td>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>{item.category ?? "—"}</td>
                          <td className="px-4 py-3"><StatusBadge status={item.type ?? "original"} /></td>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#262b2e" }}>{formatCurrency(item.originalAmount)}</td>
                          <td className="px-4 py-3 font-medium" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#1b110b" }}>{formatCurrency(item.currentAmount)}</td>
                          <td className="px-4 py-3" style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>{item.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#f9f6f0" }}>
                        <td colSpan={4} className="px-4 py-3 text-right" style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase" }}>Total Committed</td>
                        <td className="px-4 py-3" style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#d29c3c" }}>{formatCurrency(String(budgetTotal))}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Submittals Tab */}
          <TabsContent value="submittals">
            <div className="sls-card">
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
                <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Submittals</h3>
                {isInternal && <GoldButton size="sm" variant="filled" onClick={() => setShowAddSubmittal(true)}><Plus size={12} className="mr-1" />New Submittal</GoldButton>}
              </div>
              {(submittals ?? []).length === 0 ? (
                <div className="p-6"><EmptyState icon={<ClipboardCheck size={40} />} title="No Submittals" description="Create submittals for architect/engineer review." action={isInternal ? <GoldButton variant="filled" onClick={() => setShowAddSubmittal(true)}>Create Submittal</GoldButton> : undefined} /></div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#f0ebe0" }}>
                  {(submittals ?? []).map(s => (
                    <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                      <ClipboardCheck size={16} style={{ color: "#d29c3c", flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "13px", color: "#1b110b" }}>{s.title}</div>
                        {s.description && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}>{s.description}</div>}
                        {s.comments && <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#a09080", marginTop: "2px" }}>Review note: {s.comments}</div>}
                      </div>
                      <StatusBadge status={s.status ?? "draft"} />
                      {canApprove && s.status === "submitted" && (
                        <div className="flex gap-1">
                          <button onClick={() => reviewSubmittal.mutate({ id: s.id, status: "approved" })} className="p-1.5 rounded bg-green-50 hover:bg-green-100 transition-colors" title="Approve">
                            <Check size={13} style={{ color: "#16a34a" }} />
                          </button>
                          <button onClick={() => reviewSubmittal.mutate({ id: s.id, status: "rejected" })} className="p-1.5 rounded bg-red-50 hover:bg-red-100 transition-colors" title="Reject">
                            <X size={13} style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <div className="sls-card flex flex-col" style={{ minHeight: "400px" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
                <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Project Messages</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ maxHeight: "400px" }}>
                {(msgs ?? []).length === 0 ? (
                  <EmptyState icon={<MessageSquare size={40} />} title="No Messages" description="Start the conversation with your project team." />
                ) : (
                  (msgs ?? []).map(m => (
                    <div key={m.id} className={`flex gap-3 ${m.authorId === user?.id ? "flex-row-reverse" : ""}`}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "#d29c3c" }}>
                        {String(m.authorId)[0]}
                      </div>
                      <div className={`max-w-[70%] px-3 py-2 rounded-lg ${m.authorId === user?.id ? "bg-[#1b110b] text-white" : "bg-[#f5f0e8]"}`}>
                        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: m.authorId === user?.id ? "#ffffff" : "#1b110b" }}>{m.content}</p>
                        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", color: m.authorId === user?.id ? "#c8bfb0" : "#a09080", marginTop: "2px" }}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-5 py-3 border-t flex gap-2" style={{ borderColor: "#e8e3d8" }}>
                <input
                  value={msgContent}
                  onChange={e => setMsgContent(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && msgContent.trim()) { sendMessage.mutate({ projectId, content: msgContent }); } }}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded-md text-sm"
                  style={{ border: "1px solid #e8e3d8", fontFamily: "Inter, sans-serif", outline: "none" }}
                />
                <GoldButton variant="filled" size="sm" onClick={() => { if (msgContent.trim()) sendMessage.mutate({ projectId, content: msgContent }); }}>Send</GoldButton>
              </div>
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <div className="sls-card">
              <div className="px-5 py-4 border-b" style={{ borderColor: "#e8e3d8" }}>
                <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "14px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Project Team</h3>
              </div>
              {(team ?? []).length === 0 ? (
                <div className="p-6"><EmptyState icon={<Users size={40} />} title="No Team Members" description="Team members will appear here once added." /></div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#f0ebe0" }}>
                  {(team ?? []).map(t => (
                    <div key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{ background: "#d29c3c" }}>
                        {t.user?.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "13px", color: "#1b110b" }}>{t.user?.name ?? "Unknown"}</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#7a6e62" }}>{t.user?.email ?? ""} {t.role ? `· ${t.role}` : ""}</div>
                      </div>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#d29c3c", background: "#f5e9cc", padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {t.user?.role?.replace(/_/g, " ") ?? "Member"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: "Roboto Slab, serif", textTransform: "uppercase", letterSpacing: "0.04em", color: "#1b110b" }}>Add Product</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Manufacturer</Label><Input value={productForm.manufacturerName} onChange={e => setProductForm(f => ({ ...f, manufacturerName: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
              <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Model #</Label><Input value={productForm.modelNumber} onChange={e => setProductForm(f => ({ ...f, modelNumber: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            </div>
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Description</Label><Input value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Category</Label><Input value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
              <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Qty</Label><Input type="number" value={productForm.quantity} onChange={e => setProductForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
              <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Unit Cost ($)</Label><Input type="number" value={productForm.unitCost} onChange={e => setProductForm(f => ({ ...f, unitCost: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GoldButton onClick={() => setShowAddProduct(false)}>Cancel</GoldButton>
              <GoldButton variant="filled" onClick={() => createProduct.mutate({ projectId, ...productForm })} disabled={createProduct.isPending}>Add Product</GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Milestone Dialog */}
      <Dialog open={showAddMilestone} onOpenChange={setShowAddMilestone}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{ fontFamily: "Roboto Slab, serif", textTransform: "uppercase", letterSpacing: "0.04em", color: "#1b110b" }}>Add Milestone</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Name *</Label><Input value={milestoneForm.name} onChange={e => setMilestoneForm(f => ({ ...f, name: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Target Date</Label><Input type="date" value={milestoneForm.targetDate} onChange={e => setMilestoneForm(f => ({ ...f, targetDate: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Notes</Label><Input value={milestoneForm.notes} onChange={e => setMilestoneForm(f => ({ ...f, notes: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <GoldButton onClick={() => setShowAddMilestone(false)}>Cancel</GoldButton>
              <GoldButton variant="filled" onClick={() => createMilestone.mutate({ projectId, ...milestoneForm, targetDate: milestoneForm.targetDate ? new Date(milestoneForm.targetDate) : undefined })} disabled={createMilestone.isPending}>Add Milestone</GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Budget Dialog */}
      <Dialog open={showAddBudget} onOpenChange={setShowAddBudget}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{ fontFamily: "Roboto Slab, serif", textTransform: "uppercase", letterSpacing: "0.04em", color: "#1b110b" }}>Add Budget Item</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Description *</Label><Input value={budgetForm.description} onChange={e => setBudgetForm(f => ({ ...f, description: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Category</Label><Input value={budgetForm.category} onChange={e => setBudgetForm(f => ({ ...f, category: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
              <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Amount ($) *</Label><Input type="number" value={budgetForm.originalAmount} onChange={e => setBudgetForm(f => ({ ...f, originalAmount: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GoldButton onClick={() => setShowAddBudget(false)}>Cancel</GoldButton>
              <GoldButton variant="filled" onClick={() => createBudget.mutate({ projectId, ...budgetForm })} disabled={createBudget.isPending}>Add Item</GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Submittal Dialog */}
      <Dialog open={showAddSubmittal} onOpenChange={setShowAddSubmittal}>
        <DialogContent>
          <DialogHeader><DialogTitle style={{ fontFamily: "Roboto Slab, serif", textTransform: "uppercase", letterSpacing: "0.04em", color: "#1b110b" }}>New Submittal</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Title *</Label><Input value={submittalForm.title} onChange={e => setSubmittalForm(f => ({ ...f, title: e.target.value }))} style={{ borderColor: "#e8e3d8", fontFamily: "Inter, sans-serif" }} /></div>
            <div><Label style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6e62" }}>Description</Label><textarea value={submittalForm.description} onChange={e => setSubmittalForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-md text-sm resize-none" style={{ border: "1px solid #e8e3d8", fontFamily: "Inter, sans-serif", outline: "none" }} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <GoldButton onClick={() => setShowAddSubmittal(false)}>Cancel</GoldButton>
              <GoldButton variant="filled" onClick={() => createSubmittal.mutate({ projectId, ...submittalForm })} disabled={createSubmittal.isPending}>Create Submittal</GoldButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
