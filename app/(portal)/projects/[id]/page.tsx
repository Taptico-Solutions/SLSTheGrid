"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback } from "react";
import { PageHeader } from "@/components/SLSComponents";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import { OverviewTab } from "@/components/project-detail/OverviewTab";
import { ProductsTab } from "@/components/project-detail/ProductsTab";
import { TimelineTab } from "@/components/project-detail/TimelineTab";
import { BudgetTab } from "@/components/project-detail/BudgetTab";
import { SubmittalsTab } from "@/components/project-detail/SubmittalsTab";
import { DocumentsTab } from "@/components/project-detail/DocumentsTab";
import { MessagesTab } from "@/components/project-detail/MessagesTab";
import { TeamTab } from "@/components/project-detail/TeamTab";
import { ArrowLeft } from "lucide-react";

const TABS = [
  "overview",
  "products",
  "timeline",
  "budget",
  "submittals",
  "documents",
  "messages",
  "team",
] as const;
type TabKey = (typeof TABS)[number];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(params.id);

  const requestedTab = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey =
    requestedTab && (TABS as readonly string[]).includes(requestedTab)
      ? requestedTab
      : "overview";

  const project = trpc.projects.get.useQuery({ id });
  const me = trpc.auth.me.useQuery();

  const setTab = useCallback(
    (next: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("tab", next);
      router.replace(`/projects/${id}?${sp.toString()}`, { scroll: false });
    },
    [id, router, searchParams],
  );

  if (project.isLoading) {
    return <div className="text-sm text-sls-dark-brown/60">Loading…</div>;
  }
  if (project.error) {
    return <div className="text-sm text-red-600">{project.error.message}</div>;
  }
  if (!project.data) return null;

  const p = project.data;

  return (
    <>
      <Link
        href="/projects"
        className="mb-3 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-sls-dark-brown/60 hover:text-sls-gold"
      >
        <ArrowLeft className="h-3 w-3" />
        All projects
      </Link>

      <PageHeader
        title={p.name}
        subtitle={[p.clientCompany, p.location, `phase: ${p.phase}`]
          .filter(Boolean)
          .join(" · ")}
        action={<Badge status={p.status}>{p.status}</Badge>}
      />

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="submittals">Submittals</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab project={p} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab projectId={p.id} />
        </TabsContent>
        <TabsContent value="timeline">
          <TimelineTab projectId={p.id} />
        </TabsContent>
        <TabsContent value="budget">
          <BudgetTab projectId={p.id} />
        </TabsContent>
        <TabsContent value="submittals">
          <SubmittalsTab projectId={p.id} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab projectId={p.id} />
        </TabsContent>
        <TabsContent value="messages">
          <MessagesTab projectId={p.id} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab projectId={p.id} currentUserRole={me.data?.role ?? "user"} />
        </TabsContent>
      </Tabs>
    </>
  );
}
