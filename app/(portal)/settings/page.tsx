"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/SLSComponents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

/** Spec §8.15 — Settings. */
export default function SettingsPage() {
  const me = trpc.auth.me.useQuery();
  const update = trpc.users.updateProfile.useMutation();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    name: "",
    company: "",
    title: "",
    phone: "",
  });

  useEffect(() => {
    if (me.data) {
      setForm({
        name: me.data.name ?? "",
        company: me.data.company ?? "",
        title: me.data.title ?? "",
        phone: me.data.phone ?? "",
      });
    }
  }, [me.data]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync(form);
    await utils.auth.me.invalidate();
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile." />
      <Card className="max-w-2xl">
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {(
              [
                ["name", "Display name"],
                ["company", "Company"],
                ["title", "Job title"],
                ["phone", "Phone"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="block">
                <span className="text-xs uppercase tracking-widest text-sls-dark-brown/60">
                  {label}
                </span>
                <input
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="mt-1 w-full rounded-md border border-sls-sand px-3 py-2 text-sm focus:border-sls-gold focus:outline-none"
                />
              </label>
            ))}
            <div className="text-xs text-sls-dark-brown/60">
              Email: {me.data?.email ?? "—"} (from SSO, read-only)
              <br />
              Role: {me.data?.role}
            </div>
            <Button disabled={update.isPending}>Save</Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
