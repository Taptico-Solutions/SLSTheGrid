"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

/** Spec §8.3 — Projects list. */
export default function ProjectsPage() {
  const { data, isLoading } = trpc.projects.list.useQuery();
  const utils = trpc.useUtils();
  const createProject = trpc.projects.create.useMutation({
    onSuccess: async () => {
      await utils.projects.list.invalidate();
    },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    clientCompany: "",
    clientContact: "",
    location: "",
    targetCompletionDate: "",
    originalBudget: "",
  });

  const reset = () =>
    setForm({
      name: "",
      description: "",
      clientCompany: "",
      clientContact: "",
      location: "",
      targetCompletionDate: "",
      originalBudget: "",
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await createProject.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        clientCompany: form.clientCompany.trim() || undefined,
        clientContact: form.clientContact.trim() || undefined,
        location: form.location.trim() || undefined,
        targetCompletionDate: form.targetCompletionDate
          ? new Date(form.targetCompletionDate)
          : undefined,
        originalBudget: form.originalBudget
          ? Number(form.originalBudget)
          : undefined,
      });
      setModalOpen(false);
      reset();
    } catch {
      // mutation surfaces error via createProject.error below
    }
  };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Every project you have access to."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={14} /> New Project
          </Button>
        }
      />

      {isLoading && (
        <div className="text-sm text-sls-dark-brown/60">Loading...</div>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="No projects yet"
          description="Click New Project up top to add one."
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card className="transition hover:border-sls-gold">
              <div className="flex items-start justify-between">
                <h3 className="font-slab text-base uppercase text-sls-dark-brown">
                  {p.name}
                </h3>
                <Badge status={p.status}>{p.status}</Badge>
              </div>
              <CardContent className="mt-3 space-y-1 text-sm">
                <div>{p.clientCompany ?? "—"}</div>
                <div className="text-xs text-sls-dark-brown/60">
                  Phase: {p.phase} · Target:{" "}
                  {p.targetCompletionDate?.toString().slice(0, 10) ?? "—"}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !createProject.isPending)
              setModalOpen(false);
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-sls-sand bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-sls-sand px-5 py-4">
              <h2 className="font-slab text-xl uppercase text-sls-dark-brown">
                New Project
              </h2>
              <button
                onClick={() => !createProject.isPending && setModalOpen(false)}
                className="text-sls-dark-brown/60 hover:text-sls-dark-brown disabled:opacity-50"
                disabled={createProject.isPending}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submit} className="overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                <label className="block text-sm">
                  <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                    Name<span className="text-red-600"> *</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                    placeholder="Brave Stadium, Acme HQ Renovation, etc."
                  />
                </label>

                <label className="block text-sm">
                  <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                    Description (optional)
                  </div>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    rows={2}
                    className="w-full resize-none rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                    placeholder="Short description of scope and context."
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                      Client company
                    </div>
                    <input
                      type="text"
                      value={form.clientCompany}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          clientCompany: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                    />
                  </label>

                  <label className="block text-sm">
                    <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                      Client contact
                    </div>
                    <input
                      type="text"
                      value={form.clientContact}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          clientContact: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                    Location
                  </div>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                    placeholder="Atlanta, GA"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                      Target completion
                    </div>
                    <input
                      type="date"
                      value={form.targetCompletionDate}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          targetCompletionDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                    />
                  </label>

                  <label className="block text-sm">
                    <div className="mb-1 text-xs uppercase tracking-widest text-sls-dark-brown/60">
                      Original budget
                    </div>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={form.originalBudget}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          originalBudget: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-sls-sand px-3 py-2 focus:border-sls-gold focus:outline-none"
                      placeholder="$"
                    />
                  </label>
                </div>

                {createProject.error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {createProject.error.message}
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-sls-sand pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={createProject.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!form.name.trim() || createProject.isPending}
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Creating
                    </>
                  ) : (
                    "Create project"
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
