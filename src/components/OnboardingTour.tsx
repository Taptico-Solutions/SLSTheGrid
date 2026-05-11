"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";

const STEPS = [
  { title: "Welcome to The GRID", body: "On Time. On Budget. Beautiful. — your project command center." },
  { title: "Dashboard", body: "Quick stats and recent activity across your projects." },
  { title: "Projects", body: "Filter, search, and open any project from one place." },
  { title: "Documents", body: "Drag, drop, and organize submittals, specs, and contracts." },
  { title: "Submittals", body: "Track approvals — drafts → submitted → approved/rejected." },
  { title: "Budget", body: "Original budget, change orders, and current totals at a glance." },
  { title: "Timeline", body: "All milestones across all projects, sorted by due date." },
  { title: "Messages", body: "Project-scoped threads keep coordination out of email." },
  { title: "Team", body: "Directory of everyone with access — internal or client." },
  { title: "Ask The GRID", body: "The gold sparkle, bottom-left. Ask anything." },
];

/** Spec §9.1 — fires 1.2 s after mount when onboardingCompleted is false. */
export function OnboardingTour() {
  const { data: me } = trpc.auth.me.useQuery();
  const complete = trpc.onboarding.complete.useMutation();
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!me || me.onboardingCompleted) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [me]);

  const finish = async () => {
    setOpen(false);
    await complete.mutateAsync();
    await utils.auth.me.invalidate();
  };

  if (!open) return null;
  const s = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-md border border-sls-sand bg-white p-6 shadow-xl">
        <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-sls-gold">
          Step {step + 1} / {STEPS.length}
        </div>
        <h2 className="font-slab text-xl uppercase text-sls-dark-brown">{s.title}</h2>
        <p className="mt-3 text-sm text-sls-dark-brown/80">{s.body}</p>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={finish} className="text-xs text-sls-dark-brown/60 hover:underline">
            Skip Tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((i) => i - 1)}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((i) => i + 1)}>Next</Button>
            ) : (
              <Button onClick={finish}>Done</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
