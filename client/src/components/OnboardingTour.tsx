import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  CheckSquare,
  DollarSign,
  Calendar,
  MessageSquare,
  Users,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Sun,
} from "lucide-react";

const TOUR_STEPS = [
  {
    icon: Sun,
    iconColor: "#d29c3c",
    title: "Welcome to The GRID",
    subtitle: "by Southern Lighting Source",
    body: "The GRID is your single source of truth for every lighting project — from first spec to final install. No more email chains. No more missed submittals. Everything in one place.",
    highlight: "On Time. On Budget. Beautiful.",
    image: null,
  },
  {
    icon: LayoutDashboard,
    iconColor: "#d29c3c",
    title: "Dashboard",
    subtitle: "Your command center",
    body: "The Dashboard gives you an instant snapshot of all your projects — how many are active, whether you're on time, and whether you're on budget. Your alerts and quick actions live here too.",
    highlight: "Start every day here.",
    image: null,
  },
  {
    icon: FolderKanban,
    iconColor: "#4a90d9",
    title: "Projects",
    subtitle: "Everything about a job, in one place",
    body: "Each project has tabs for Products, Documents, Submittals, Budget, Timeline, Messages, and Team. Create a project, assign your team, and track every detail from spec to closeout.",
    highlight: "Projects → New Project to get started.",
    image: null,
  },
  {
    icon: FileText,
    iconColor: "#7c6f5e",
    title: "Document Vault",
    subtitle: "No more hunting through email",
    body: "Upload specs, drawings, cut sheets, photos, and contracts directly to a project or to the central vault. Every file is tagged, searchable, and always accessible.",
    highlight: "Drag and drop. Done.",
    image: null,
  },
  {
    icon: CheckSquare,
    iconColor: "#e8a838",
    title: "Submittals",
    subtitle: "Formal approvals, tracked end-to-end",
    body: "SLS creates submittal packages for client review. Architects and designers approve or reject directly in the portal. No PDFs in email. No lost approvals. Full audit trail.",
    highlight: "Draft → Submitted → Approved.",
    image: null,
  },
  {
    icon: DollarSign,
    iconColor: "#4caf7d",
    title: "Budget Tracker",
    subtitle: "Know your numbers, always",
    body: "Track budgeted vs. actual costs for every line item across every project. Spot variances early. Keep clients informed. No surprises at closeout.",
    highlight: "On Budget is not an accident.",
    image: null,
  },
  {
    icon: Calendar,
    iconColor: "#9c6fd4",
    title: "Timeline & Milestones",
    subtitle: "On time, every time",
    body: "Set milestones for each project phase. Track what's due, what's done, and what's delayed — across all your projects at once in the Timeline Overview.",
    highlight: "On Time is not luck.",
    image: null,
  },
  {
    icon: MessageSquare,
    iconColor: "#5ba4cf",
    title: "Messages",
    subtitle: "Project communication, in context",
    body: "Every project has its own message thread. Keep notes, updates, and client communication tied to the project — not buried in someone's inbox.",
    highlight: "Replace email chaos with clarity.",
    image: null,
  },
  {
    icon: Users,
    iconColor: "#d29c3c",
    title: "Team & Contacts",
    subtitle: "Everyone who touches the project",
    body: "Assign SLS reps, project managers, architects, GCs, and clients to each project. Everyone sees what they need to see — nothing more, nothing less.",
    highlight: "Role-based access keeps it clean.",
    image: null,
  },
  {
    icon: Sparkles,
    iconColor: "#d29c3c",
    title: "Ask The GRID",
    subtitle: "Your AI assistant is always on",
    body: "See that button in the bottom left? That's Ask The GRID — your built-in assistant. Ask it anything about the portal, your projects, or how to do something. It knows The GRID inside and out.",
    highlight: "You're ready. Let's build something beautiful.",
    image: null,
  },
];

export function OnboardingTour() {
  const { user, isAuthenticated } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const { data: onboardingStatus } = trpc.onboarding.status.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: Infinity,
  });

  const completeMutation = trpc.onboarding.complete.useMutation();

  useEffect(() => {
    if (onboardingStatus && !onboardingStatus.completed && !dismissed) {
      // Small delay so the portal loads first
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [onboardingStatus, dismissed]);

  const handleComplete = async () => {
    setShow(false);
    setDismissed(true);
    await completeMutation.mutateAsync();
  };

  const handleSkip = async () => {
    setShow(false);
    setDismissed(true);
    await completeMutation.mutateAsync();
  };

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const currentStep = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const Icon = currentStep.icon;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(27, 17, 11, 0.82)", backdropFilter: "blur(4px)" }}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#ffffff" }}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: "1px solid #e6dec2" }}>
                <div className="flex items-center gap-2">
                  <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "13px", color: "#d29c3c", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    The GRID
                  </div>
                  <span style={{ color: "#c8bfb0", fontSize: "12px" }}>·</span>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#7a6e62" }}>
                    Getting Started
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ color: "#7a6e62" }}
                  title="Skip tour"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Step progress dots */}
              <div className="flex items-center justify-center gap-1.5 pt-5 pb-2">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === step ? "20px" : "6px",
                      height: "6px",
                      background: i === step ? "#d29c3c" : i < step ? "#c8bfb0" : "#e6dec2",
                    }}
                  />
                ))}
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.22 }}
                  className="px-8 py-6"
                >
                  {/* Icon */}
                  <div
                    className="flex items-center justify-center w-14 h-14 rounded-xl mb-5"
                    style={{ background: `${currentStep.iconColor}15`, border: `1.5px solid ${currentStep.iconColor}30` }}
                  >
                    <Icon size={26} style={{ color: currentStep.iconColor }} />
                  </div>

                  {/* Title */}
                  <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 700, fontSize: "22px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.2 }}>
                    {currentStep.title}
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7a6e62", marginTop: "4px", marginBottom: "16px" }}>
                    {currentStep.subtitle}
                  </div>

                  {/* Body */}
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "15px", color: "#3a3028", lineHeight: 1.65 }}>
                    {currentStep.body}
                  </p>

                  {/* Highlight */}
                  <div
                    className="mt-5 px-4 py-3 rounded-lg"
                    style={{ background: "#f9f6ef", borderLeft: "3px solid #d29c3c" }}
                  >
                    <span style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "13px", color: "#1b110b", fontStyle: "italic" }}>
                      {currentStep.highlight}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <div className="flex items-center justify-between px-8 pb-7 pt-2">
                <button
                  onClick={handlePrev}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    color: step === 0 ? "#c8bfb0" : "#7a6e62",
                    background: "transparent",
                    border: "1.5px solid",
                    borderColor: step === 0 ? "#e6dec2" : "#c8bfb0",
                    cursor: step === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <ChevronLeft size={14} />
                  Back
                </button>

                <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a09080" }}>
                  {step + 1} of {TOUR_STEPS.length}
                </div>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    background: "#1b110b",
                    color: "#ffffff",
                    border: "1.5px solid #1b110b",
                    letterSpacing: "0.04em",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#d29c3c";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#d29c3c";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#1b110b";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b110b";
                  }}
                >
                  {isLast ? "Let's Go" : "Next"}
                  {!isLast && <ChevronRight size={14} />}
                  {isLast && <Sparkles size={14} />}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
