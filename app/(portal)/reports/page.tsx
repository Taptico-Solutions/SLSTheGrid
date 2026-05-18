import { PageHeader, EmptyState } from "@/components/SLSComponents";

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" subtitle="Coming soon to The Grid." />
      <EmptyState
        title="Not yet"
        description="This area is on the roadmap. Reach out to Nick at nick@taptico.com if you want to push it up the queue."
      />
    </>
  );
}
