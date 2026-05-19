"use client";

import { useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard, EmptyState } from "@/components/SLSComponents";
import { trpc } from "@/lib/trpc/client";
import { Plus, Loader2, DollarSign, TrendingUp, GitBranch } from "lucide-react";
import { formatCurrency, formatDate } from "./shared";

const ITEM_TYPES = ["original", "change_order", "credit", "allowance"] as const;

export function BudgetTab({ projectId }: { projectId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<(typeof ITEM_TYPES)[number]>("original");

  const utils = trpc.useUtils();
  const summary = trpc.budget.getSummary.useQuery({ projectId });
  const items = trpc.budget.list.useQuery({ projectId });
  const changeOrders = trpc.changeOrders.list.useQuery({ projectId });
  const create = trpc.budget.create.useMutation({
    onSuccess: () => {
      utils.budget.list.invalidate({ projectId });
      utils.budget.getSummary.invalidate({ projectId });
      setShowForm(false);
      setDescription("");
      setCategory("");
      setAmount("");
      setType("original");
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !amount) return;
    const a = Number(amount);
    if (!Number.isFinite(a) || a < 0) return;
    create.mutate({
      projectId,
      description: description.trim(),
      category: category.trim() || undefined,
      originalAmount: a,
      currentAmount: a,
      type,
    });
  }

  const variance =
    (summary.data?.currentTotal ?? 0) - (summary.data?.originalTotal ?? 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Original total"
          value={formatCurrency(summary.data?.originalTotal)}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Current total"
          value={formatCurrency(summary.data?.currentTotal)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Change orders"
          value={changeOrders.data?.length ?? "—"}
          icon={<GitBranch className="h-4 w-4" />}
        />
      </div>

      {summary.data && summary.data.originalTotal > 0 && (
        <Card>
          <CardContent className="text-sm">
            <span className="text-xs uppercase tracking-wide text-sls-dark-brown/60">
              Variance from original
            </span>
            <span
              className={
                "ml-3 font-slab " + (variance > 0 ? "text-red-700" : variance < 0 ? "text-emerald-700" : "")
              }
            >
              {variance >= 0 ? "+" : ""}
              {formatCurrency(variance)}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-slab text-sm uppercase tracking-widest text-sls-dark-brown">
          Line items
        </h3>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add line item"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="rounded-md border border-sls-sand px-3 py-2 text-sm sm:col-span-2"
                required
              />
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category"
                className="rounded-md border border-sls-sand px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.01"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                className="rounded-md border border-sls-sand px-3 py-2 text-sm"
                required
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value as (typeof ITEM_TYPES)[number])}
                className="rounded-md border border-sls-sand px-3 py-2 text-sm"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" disabled={create.isPending} className="sm:col-span-3">
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </form>
            {create.error && (
              <p className="mt-2 text-xs text-red-600">{create.error.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {items.isLoading ? (
            <div className="p-6 text-sm text-sls-dark-brown/60">Loading…</div>
          ) : !items.data || items.data.length === 0 ? (
            <EmptyState
              title="No budget items"
              description="Track every line — original, change orders, credits, and allowances."
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-sls-sand text-left text-xs uppercase tracking-wide text-sls-dark-brown/60">
                <tr>
                  <th className="p-3">Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Original</th>
                  <th className="p-3 text-right">Current</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sls-sand">
                {items.data.map((b) => (
                  <tr key={b.id}>
                    <td className="p-3 text-sls-dark-brown">{b.description}</td>
                    <td className="p-3 text-sls-dark-brown/70">{b.category ?? "—"}</td>
                    <td className="p-3 text-xs uppercase tracking-wide text-sls-dark-brown/60">
                      {b.type.replace("_", " ")}
                    </td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(b.originalAmount)}</td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(b.currentAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {changeOrders.data && changeOrders.data.length > 0 && (
        <Card>
          <CardTitle>Change orders</CardTitle>
          <CardContent className="mt-3 divide-y divide-sls-sand">
            {changeOrders.data.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-medium text-sls-dark-brown">
                    {c.number ? `#${c.number} · ` : ""}
                    {c.title}
                  </div>
                  {c.description && (
                    <div className="mt-0.5 text-xs text-sls-dark-brown/70">{c.description}</div>
                  )}
                  <div className="mt-1 text-xs text-sls-dark-brown/60">
                    Submitted {formatDate(c.createdAt)}
                    {c.approvedAt ? ` · approved ${formatDate(c.approvedAt)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{formatCurrency(c.costImpact)}</span>
                  <Badge status={c.status}>{c.status.replace("_", " ")}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
