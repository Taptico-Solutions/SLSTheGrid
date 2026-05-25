import { ReactNode } from "react";

// ─── Page Header ──────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: "#e8e3d8", background: "#ffffff" }}>
      <div>
        <h1 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "22px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7a6e62", marginTop: "4px" }}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 ml-4">{actions}</div>}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
type StatusType = "on_track" | "at_risk" | "delayed" | "complete" | "on_budget" | "over_budget" |
  "active" | "intake" | "pending_approval" | "ordered" | "delivered" | "archived" |
  "draft" | "submitted" | "approved" | "rejected" | "needs_revision" | "under_review" | "resubmitted" |
  "specified" | "shipped" | "installed" | "pending" | "in_production" | string;

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  on_track: { label: "On Track", bg: "#dcfce7", color: "#166534" },
  at_risk: { label: "At Risk", bg: "#fef9c3", color: "#854d0e" },
  delayed: { label: "Delayed", bg: "#fee2e2", color: "#991b1b" },
  complete: { label: "Complete", bg: "#dbeafe", color: "#1e40af" },
  on_budget: { label: "On Budget", bg: "#dcfce7", color: "#166534" },
  over_budget: { label: "Over Budget", bg: "#fee2e2", color: "#991b1b" },
  active: { label: "Active", bg: "#dbeafe", color: "#1e40af" },
  intake: { label: "Intake", bg: "#f3f4f6", color: "#374151" },
  pending_approval: { label: "Pending Approval", bg: "#fef9c3", color: "#854d0e" },
  ordered: { label: "Ordered", bg: "#ede9fe", color: "#5b21b6" },
  delivered: { label: "Delivered", bg: "#dcfce7", color: "#166534" },
  archived: { label: "Archived", bg: "#f3f4f6", color: "#6b7280" },
  draft: { label: "Draft", bg: "#f3f4f6", color: "#374151" },
  submitted: { label: "Submitted", bg: "#dbeafe", color: "#1e40af" },
  approved: { label: "Approved", bg: "#dcfce7", color: "#166534" },
  rejected: { label: "Rejected", bg: "#fee2e2", color: "#991b1b" },
  needs_revision: { label: "Needs Revision", bg: "#fef9c3", color: "#854d0e" },
  under_review: { label: "Under Review", bg: "#ede9fe", color: "#5b21b6" },
  resubmitted: { label: "Resubmitted", bg: "#dbeafe", color: "#1e40af" },
  specified: { label: "Specified", bg: "#f3f4f6", color: "#374151" },
  shipped: { label: "Shipped", bg: "#ede9fe", color: "#5b21b6" },
  installed: { label: "Installed", bg: "#dcfce7", color: "#166534" },
  pending: { label: "Pending", bg: "#f3f4f6", color: "#374151" },
  in_production: { label: "In Production", bg: "#fef9c3", color: "#854d0e" },
};

export function StatusBadge({ status }: { status: StatusType }) {
  const config = STATUS_CONFIG[status] ?? { label: status, bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      background: config.bg,
      color: config.color,
      fontFamily: "Inter, sans-serif",
      fontSize: "11px",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      padding: "2px 8px",
      borderRadius: "4px",
      whiteSpace: "nowrap",
    }}>
      {config.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  subtitle?: string;
}
export function StatCard({ label, value, icon, color = "#d29c3c", subtitle }: StatCardProps) {
  return (
    <div className="sls-card p-5 flex items-start gap-4">
      {icon && (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, color: "#7a6e62", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </div>
        <div style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "26px", color: "#1b110b", lineHeight: 1.2, marginTop: "2px" }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: "12px", color: "#a09080", marginTop: "2px" }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center sls-watermark-bg" style={{ background: "#fafaf8", borderRadius: "6px", border: "1px dashed #e8e3d8" }}>
      {icon && <div className="mb-4 opacity-30">{icon}</div>}
      <h3 style={{ fontFamily: "Roboto Slab, serif", fontWeight: 600, fontSize: "16px", color: "#1b110b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#7a6e62", marginTop: "8px", maxWidth: "320px" }}>{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────
export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px" style={{ background: "#e8e3d8" }} />
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "10px", fontWeight: 600, color: "#a09080", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "#e8e3d8" }} />
    </div>
  );
}

// ─── Gold Button ──────────────────────────────────────────────────────────────
interface GoldButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "outline" | "filled";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
}
export function GoldButton({ children, onClick, variant = "outline", size = "md", disabled, type = "button" }: GoldButtonProps) {
  const base = "transition-all duration-200 rounded-md font-medium uppercase tracking-wider cursor-pointer";
  const sizeClass = size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2";
  const style = variant === "filled"
    ? { background: "#d29c3c", border: "1.5px solid #d29c3c", color: "#ffffff", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" }
    : { background: "transparent", border: "1.5px solid #1b110b", color: "#1b110b", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em" };

  return (
    <button
      type={type}
      className={`${base} ${sizeClass}`}
      style={style}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = "#d29c3c";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#d29c3c";
          (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          if (variant === "filled") {
            (e.currentTarget as HTMLButtonElement).style.background = "#d29c3c";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#d29c3c";
            (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
          } else {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#1b110b";
            (e.currentTarget as HTMLButtonElement).style.color = "#1b110b";
          }
        }
      }}
    >
      {children}
    </button>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#e8e3d8", borderTopColor: "#d29c3c" }} />
    </div>
  );
}
