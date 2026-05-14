"use client";

import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/SLSComponents";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

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

const CATEGORY_ORDER = [
  "sow",
  "contract",
  "case_study",
  "story_bank",
  "submittal",
  "spec_sheet",
  "cut_sheet",
  "as_built",
  "brand_asset",
  "marketing_material",
  "photo",
  "other",
];

export default function DocumentsPage() {
  const list = trpc.documents.list.useQuery();
  const getSigned = trpc.documents.getSignedUrl.useMutation();
  const projects = trpc.projects.list.useQuery();
  const [opening, setOpening] = useState<number | null>(null);

  const docs = list.data ?? [];

  // Group by category.
  const grouped = docs.reduce<Record<string, typeof docs>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  const projectName = (id: number) =>
    projects.data?.find((p) => p.id === id)?.name ?? `Project ${id}`;

  const open = async (id: number) => {
    setOpening(id);
    try {
      const { url } = await getSigned.mutateAsync({ id });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert(
        "We could not generate a download link. The file may still be syncing to storage. Try again in a minute.",
      );
    } finally {
      setOpening(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Documents"
        subtitle="Every file you have access to across every project."
      />

      {list.isLoading && (
        <div className="text-sm text-sls-dark-brown/60">Loading documents...</div>
      )}

      {list.data && docs.length === 0 && (
        <EmptyState
          title="No documents yet"
          description="Upload a case study, brand asset, or submittal to get started."
        />
      )}

      <div className="space-y-6">
        {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((category) => (
          <Card key={category}>
            <CardTitle>{CATEGORY_LABEL[category] ?? category}</CardTitle>
            <CardContent className="mt-3 divide-y divide-sls-sand">
              {grouped[category]!.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText
                      size={18}
                      className="shrink-0 text-sls-dark-brown/60"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-sls-dark-brown">
                        {d.name}
                      </div>
                      <div className="text-xs text-sls-dark-brown/60">
                        {projectName(d.projectId)}
                        {" · "}
                        {d.fileType ?? "file"}
                        {d.fileSize
                          ? ` · ${Math.round(d.fileSize / 1024)} KB`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{CATEGORY_LABEL[d.category] ?? d.category}</Badge>
                    <Button
                      variant="ghost"
                      onClick={() => open(d.id)}
                      disabled={opening === d.id}
                    >
                      {opening === d.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      Open
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 text-xs uppercase tracking-widest text-sls-dark-brown/40">
        Need to upload? Open a project, click Upload Document inside that project.
      </div>
    </>
  );
}
