import { SLSLayout } from "@/components/SLSLayout";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  // Floating AI bot and OnboardingTour deferred until LLM env vars and tour
  // copy are aligned with the current feature set. Re-enable later.
  return <SLSLayout>{children}</SLSLayout>;
}
