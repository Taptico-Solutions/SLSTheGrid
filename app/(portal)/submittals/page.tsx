import { PageHeader, ComingSoon } from "@/components/SLSComponents";

export default function SubmittalsPage() {
  return (
    <>
      <PageHeader title="Submittals" subtitle="Spec, cut, and shop-drawing review log." />
      <ComingSoon
        feature="Submittals"
        description="Submittal tracking with approval routing and a per-project log. You can already attach submittal PDFs in Documents today."
      />
    </>
  );
}
