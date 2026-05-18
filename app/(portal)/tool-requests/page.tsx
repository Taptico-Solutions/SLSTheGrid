"use client";

import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2, Download, Paperclip } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  reviewing: "Reviewing",
  approved: "Approved",
  declined: "Declined",
  in_progress: "In progress",
  shipped: "Shipped",
};

const TYPE_SUGGESTIONS = [
  "Email assistant",
  "Bid analyzer",
  "Lead scorer",
  "Brand voice writer",
  "Document summarizer",
  "Meeting recap generator",
  "Spec sheet parser",
  "Other (describe below)",
];

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ToolRequestsPage() {
  const me = trpc.auth.me.useQuery();
  const list = trpc.toolRequests.list.useQuery();
  const utils = trpc.useUtils();
  const create = trpc.toolRequests.create.useMutation({
    onSuccess: async () => {
      await utils.toolRequests.list.invalidate();
    },
  });
  const getSigned = trpc.toolRequests.getSignedUrl.useMutation();

  const isInternal =
    me.data?.role === "admin" ||
    me.data?.role === "sls_admin" ||
    me.data?.role === "sls_rep" ||
    me.data?.role === "sls_pm";

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    requesterName: "",
    toolType: "",
    description: "",
    file: null as File | null,
  });

  useEffect(() => {
    if (me.data && !form.requesterName) {
      setForm((f) => ({ ...f, requesterName: me.data?.name ?? me.data?.email ?? "" }));
    }
  }, [me.data, form.requesterName]);

  const resetForm = () =>
    setForm({
      requesterName: me.data?.name ?? me.data?.email ?? "",
      toolType: "",
      description: "",
      file: null,
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.requesterName.trim() || !form.toolType.trim() || !form.description.trim()) return;

    try {
      const documentation = form.file
        ? {
            name: form.file.name,
            fileData: await readFileAsBase64(form.file),
            fileType: form.file.type || "application/octet-stream",
            fileSize: form.file.size,
          }
        : undefined;

      await create.mutateAsync({
        requesterName: form.requesterName.trim(),
        toolType: form.toolType.trim(),
        description: form.description.trim(),
        documentation,
      });
      setModalOpen(false);
      resetForm();
    } catch {
      // error surfaces in create.error
    }
  };

  const [opening, setOpening] = useState<number | null>(null);
  const openAttachment = async (id: number) => {
    setOpening(id);
    try {
      const { url } = await getSigned.mutateAsync({ id });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
    } finally {
      setOpening(null);
    }
  };

  const items = list.data ?? [];

  return (
    <>
      <PageHeader
        title="Request a Tool"
        subtitle={
          isInternal
            ? "Submitted by you and by every other user. Update status as you triage."
            : "Tell us what to build. Anything from a one-button email helper to a full AI agent."
        }
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={14} /> New Request
          </Button>
        }
      />

      {list.isLoading && (
        <div className="text-sm text-sls-dark-brown/60">Loading...</div>
      )}

      {list.data && items.length === 0 && (
        <EmptyState
          title="No requests yet"
          description="Click New Request to ask Taptico to build you something."
        />
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <Card key={r.id}>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sls-dark-brown">{r.toolType}</div>
                  <div className="text-xs text-sls-dark-brown/60">
                    From {r.requesterName} · {formatDate(r.createdAt)}
                  </div>
                </div>
                <Badge>{STATUS_LABEL[r.status] ?? r.status}</Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-sls-dark-brown/80">
                {r.description}
              </p>
              {r.documentationFileKey && (
                <div className="mt-3">
                  <Button
                    variant="ghost"
                    onClick={() => openAttachment(r.id)}
                    disabled={opening === r.id}
                  >
                    {opening === r.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Paperclip size={14} />
                    )}
                    Open documentation
                    <Download size={12} className="ml-1 opacity-60" />
                  </Button>
                </div>
              )}
              {r.adminNotes && (
                <div className="mt-3 rounded border border-sls-sand bg-sls-gold-pale/30 p-3 text-xs text-sls-dark-brown">
                  <div className="mb-1 uppercase tracking-widest text-sls-dark-brown/60">
                    Notes from Taptico
                  </div>
                  {r.adminNotes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !create.isPending) {
              setModalOpen(false);
            }
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-sls-sand bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-sls-sand px-5 py-4">
              <h2 className="font-slab text-xl uppercase text-sls-dark-brown">
                New Tool Request
              </h2>
              <button
                onClick={() => !create.isPending && setModalOpen(false)}
                disabled={create.isPending}
                className="text-sls-dark-brown/60 hover:text-sls-dark-brown disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submit} className="overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                <label className="block text-sm">
                  <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                    Your name<span className="text-red-600"> *</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={form.requesterName}
                    onChange={(e) => setForm((f) => ({ ...f, requesterName: e.target.value }))}
                    className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                  />
                </label>

                <label className="block text-sm">
                  <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                    Type of tool<span className="text-red-600"> *</span>
                  </div>
                  <input
                    type="text"
                    required
                    list="tool-type-suggestions"
                    value={form.toolType}
                    onChange={(e) => setForm((f) => ({ ...f, toolType: e.target.value }))}
                    className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                    placeholder="e.g. Email assistant, Bid analyzer, Lead scorer..."
                  />
                  <datalist id="tool-type-suggestions">
                    {TYPE_SUGGESTIONS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </label>

                <label className="block text-sm">
                  <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                    What should it do?<span className="text-red-600"> *</span>
                  </div>
                  <textarea
                    required
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={5}
                    className="w-full resize-y rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                    placeholder="Describe the job to be done. Who uses it? What input goes in? What output do you want out? Plain English is fine."
                  />
                </label>

                <label className="block text-sm">
                  <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                    Documentation (optional)
                  </div>
                  <div className="text-xs text-sls-dark-brown/60">
                    Attach a PDF, Word doc, screenshot, or sample data file. 50 MB max.
                  </div>
                  <input
                    type="file"
                    onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
                    className="mt-2 block w-full text-sm text-sls-dark-brown file:mr-3 file:rounded-md file:border-0 file:bg-sls-gold-pale file:px-3 file:py-1.5 file:text-sm file:text-sls-dark-brown hover:file:bg-sls-gold-pale/70"
                  />
                  {form.file && (
                    <div className="mt-1 text-xs text-sls-dark-brown/60">
                      Attached: {form.file.name} ({Math.round(form.file.size / 1024)} KB)
                    </div>
                  )}
                </label>

                {create.error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {create.error.message}
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-sls-sand pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={create.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !form.requesterName.trim() ||
                    !form.toolType.trim() ||
                    !form.description.trim() ||
                    create.isPending
                  }
                >
                  {create.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Sending
                    </>
                  ) : (
                    "Submit request"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
