"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/SLSComponents";
import { trpc } from "@/lib/trpc/client";
import { Plus, Loader2 } from "lucide-react";
import { formatCurrency } from "./shared";

export function ProductsTab({ projectId }: { projectId: number }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");

  const utils = trpc.useUtils();
  const list = trpc.products.list.useQuery({ projectId });
  const manufacturers = trpc.manufacturers.list.useQuery();
  const create = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate({ projectId });
      setShowForm(false);
      setName("");
      setModelNumber("");
      setQuantity("1");
      setUnitPrice("");
    },
  });

  const manufacturerById = new Map(
    manufacturers.data?.map((m) => [m.id, m.name] as const) ?? [],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const qty = Number(quantity) || 1;
    const price = unitPrice ? Number(unitPrice) : undefined;
    create.mutate({
      projectId,
      name: name.trim(),
      modelNumber: modelNumber.trim() || undefined,
      quantity: qty,
      unitPrice: price,
      totalPrice: price !== undefined ? price * qty : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add product"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product name"
                className="rounded-md border border-sls-sand px-3 py-2 text-sm sm:col-span-2"
                required
              />
              <input
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="Model #"
                className="rounded-md border border-sls-sand px-3 py-2 text-sm"
              />
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                min={1}
                placeholder="Qty"
                className="rounded-md border border-sls-sand px-3 py-2 text-sm"
              />
              <input
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                type="number"
                step="0.01"
                placeholder="Unit price"
                className="rounded-md border border-sls-sand px-3 py-2 text-sm sm:col-span-2"
              />
              <Button type="submit" size="sm" disabled={create.isPending} className="sm:col-span-2">
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
          {list.isLoading ? (
            <div className="p-6 text-sm text-sls-dark-brown/60">Loading…</div>
          ) : !list.data || list.data.length === 0 ? (
            <EmptyState
              title="No products specified"
              description="Add the first product or import from a submittal."
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-sls-sand text-left text-xs uppercase tracking-wide text-sls-dark-brown/60">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Manufacturer</th>
                  <th className="p-3">Model #</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Unit price</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sls-sand">
                {list.data.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-medium text-sls-dark-brown">{p.name}</td>
                    <td className="p-3 text-sls-dark-brown/70">
                      {p.manufacturerId ? manufacturerById.get(p.manufacturerId) ?? "—" : "—"}
                    </td>
                    <td className="p-3 text-sls-dark-brown/70">{p.modelNumber ?? "—"}</td>
                    <td className="p-3 text-right tabular-nums">{p.quantity}</td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(p.unitPrice)}</td>
                    <td className="p-3 text-right tabular-nums">{formatCurrency(p.totalPrice)}</td>
                    <td className="p-3">
                      <Badge status={p.status}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
