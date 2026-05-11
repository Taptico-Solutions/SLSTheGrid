import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "approved" | "pending" | "progress" | "rejected" | "review";

const toneClass: Record<Tone, string> = {
  approved: "sls-badge-approved",
  pending: "sls-badge-pending",
  progress: "sls-badge-progress",
  rejected: "sls-badge-rejected",
  review: "sls-badge-review",
};

/** Maps any status string to a visual tone (spec §11.3). */
export function toneFor(status?: string | null): Tone {
  switch (status) {
    case "approved":
    case "completed":
    case "active":
      return "approved";
    case "rejected":
    case "delayed":
    case "cancelled":
      return "rejected";
    case "in_progress":
    case "submitted":
    case "resubmitted":
      return "progress";
    case "under_review":
    case "needs_revision":
    case "pending_approval":
      return "review";
    default:
      return "pending";
  }
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  status?: string | null;
}

export function Badge({ tone, status, className, ...props }: BadgeProps) {
  const t = tone ?? toneFor(status);
  return <span className={cn("sls-badge", toneClass[t], className)} {...props} />;
}
