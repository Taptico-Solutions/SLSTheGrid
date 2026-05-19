"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/SLSComponents";
import { trpc } from "@/lib/trpc/client";
import { Download, ExternalLink, FileText, Loader2, Upload } from "lucide-react";
import { formatDate } from "./shared";
import { useState } from "react";

const CATEGORY_LABEL: Record<string, string> = {
  case_study: "Case Studies",
  story_bank: "Story Bank",
  sow: "Statement of Work",
  contract: "Contracts",
  brand_asset: "Brand Assets",
  marketing_material: "Marketing Materials",
  submittal: "Submittals",
  spec_sheet: "Spec Sheets",
  cut_sheet: "Cut Sheets",
  as_built: "As-Builts",
  photo: "Photos",
  other: "Other",
};

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsTab({ projectId }: { projectId: number }) {
  const list = trpc.documents.list.useQuery({ projectId });
  const getSigned = trpc.documents.getSignedUrl.useMutation();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  async function download(id: number) {
    setDownloadingId(id);
    try {
      const { url } = await getSigned.mutateAsync({ id });
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  }

  type Doc = NonNullable<typeof list.data>[number];
  const grouped: Record<string, Doc[]> = {};
  for (const d of list.data ?? []) {
    if (!grouped[d.category]) grouped[d.category] = [];
    grouped[d.category]!.push(d);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Link href="/documents">
          <Button size="sm" variant="ghost">
            <Upload className="h-4 w-4" />
            Bulk upload
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {list.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-sls-dark-brown/60">Loading…</CardContent>
        </Card>
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState
          title="No documents yet"
          description="Drop files in the Documents page to attach them to this project."
        />
      ) : (
        Object.entries(grouped).map(([category, docs]) => (
          <Card key={category}>
            <CardContent className="p-0">
              <div className="border-b border-sls-sand px-4 py-2 text-xs font-semibold uppercase tracking-widest text-sls-dark-brown/70">
                {CATEGORY_LABEL[category] ?? category}
                <span className="ml-2 font-normal text-sls-dark-brown/50">({docs.length})</span>
              </div>
              <ul className="divide-y divide-sls-sand">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-sls-dark-brown/50" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-sls-dark-brown">
                          {d.name}
                        </div>
                        <div className="text-xs text-sls-dark-brown/60">
                          {formatFileSize(d.fileSize)} · {formatDate(d.createdAt)}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => download(d.id)}
                      disabled={downloadingId === d.id}
                    >
                      {downloadingId === d.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
