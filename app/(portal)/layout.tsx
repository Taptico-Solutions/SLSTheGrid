import { SLSLayout } from "@/components/SLSLayout";
import { AskTheGrid } from "@/components/AskTheGrid";
import { OnboardingTour } from "@/components/OnboardingTour";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SLSLayout>
      {children}
      <AskTheGrid />
      <OnboardingTour />
    </SLSLayout>
  );
}
