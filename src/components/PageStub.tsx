import { PageHeader, EmptyState } from "@/components/SLSComponents";

/** Shared placeholder for pages not yet built out. */
export function PageStub({
  title,
  subtitle,
  spec,
}: {
  title: string;
  subtitle?: string;
  spec: string;
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState
        title="Coming next"
        description={`This screen is scaffolded but not yet implemented. See engineering spec §${spec}.`}
      />
    </>
  );
}
