"use client";

import { PrioritiesPanel } from "./PrioritiesPanel";

export function PrioritiesTab({ projectId }: { projectId: number }) {
  return <PrioritiesPanel projectId={projectId} />;
}
