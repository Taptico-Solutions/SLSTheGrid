import { PageHeader, ComingSoon } from "@/components/SLSComponents";

export default function BudgetPage() {
  return (
    <>
      <PageHeader title="Budget" subtitle="Project-level budgets, change orders, and rollups." />
      <ComingSoon
        feature="Budget"
        description="Per-project budget lines, change orders, and a portfolio rollup. On deck after Documents and Submittals."
      />
    </>
  );
}
