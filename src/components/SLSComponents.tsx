import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Spec §11.3 — shared shell pieces used on every page. */

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div>
        <h1 className="sls-page-title">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-sls-dark-brown/70">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="sls-card flex items-center gap-4 p-5">
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sls-gold-pale text-sls-gold">
          {icon}
        </div>
      )}
      <div>
        <div className="font-slab text-2xl text-sls-dark-brown">{value}</div>
        <div className="text-xs uppercase tracking-wide text-sls-dark-brown/60">
          {label}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sls-card flex flex-col items-center justify-center px-6 py-12 text-center">
      <h3 className="font-slab text-lg text-sls-dark-brown">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-sls-dark-brown/70">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ComingSoon({
  feature,
  description,
}: {
  feature: string;
  description?: string;
}) {
  return (
    <div className="sls-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="rounded-full border border-sls-gold/40 bg-sls-gold-pale px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sls-gold">
        Coming Soon
      </span>
      <h3 className="font-slab text-2xl uppercase text-sls-dark-brown">{feature}</h3>
      <p className="max-w-md text-sm text-sls-dark-brown/70">
        {description ??
          "This area is on the roadmap. Ping Nick at nick@taptico.com to push it up the queue."}
      </p>
    </div>
  );
}
