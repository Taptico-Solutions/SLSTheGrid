import { PageHeader, ComingSoon } from "@/components/SLSComponents";

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" subtitle="Portfolio rollups, status reports, and exports." />
      <ComingSoon
        feature="Reports"
        description="Cross-project status reports, exportable summaries, and AI-drafted executive briefs."
      />
    </>
  );
}
