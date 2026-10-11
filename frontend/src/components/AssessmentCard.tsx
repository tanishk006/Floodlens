import { type ReactNode } from "react";

export type AssessmentStatusTone = "neutral" | "accent" | "warning" | "muted";

export interface AssessmentAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface AssessmentStatus {
  label: string;
  tone?: AssessmentStatusTone;
}

export interface AssessmentCardProps {
  /** 1. Title: clear name for the check */
  title: string;
  /** 2. Context: one short line explaining what is assessed */
  context: string;
  /** 3. Result: real measurement, state or finding (never 0 if unavailable) */
  result?: ReactNode;
  /** 4. Status: restrained label, only when meaningful */
  status?: AssessmentStatus;
  /** 5. Supporting info: units, source, timestamp or scientific explanation */
  supportingInfo?: ReactNode;
  /** 6. Action: optional button/link only if user can perform a meaningful action */
  action?: AssessmentAction;
  /** Compact card sizing for secondary checks or grid cells */
  compact?: boolean;
  /** Highlight border (e.g. for active selection) */
  selected?: boolean;
  /** Optional custom class */
  className?: string;
  /** Optional extra body content (e.g. mini chart, factor bars) */
  children?: ReactNode;
}

export default function AssessmentCard({
  title,
  context,
  result,
  status,
  supportingInfo,
  action,
  compact = false,
  selected = false,
  className = "",
  children,
}: AssessmentCardProps) {
  const statusColors: Record<AssessmentStatusTone, string> = {
    neutral: "bg-surface-secondary text-text-secondary border-border-subtle",
    accent: "bg-floral-white-950 text-accent-text border-floral-white-800",
    warning: "bg-spicy-paprika-950 text-spicy-paprika-200 border-spicy-paprika-700",
    muted: "bg-surface-primary text-text-muted border-border-subtle",
  };

  return (
    <article
      className={`rounded border transition-colors ${
        selected
          ? "border-accent bg-surface-primary"
          : "border-border-subtle bg-surface-primary/90 hover:border-border-strong"
      } ${compact ? "p-3" : "p-4"} ${className}`}
    >
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-text-primary tracking-tight leading-snug">
            {title}
          </h4>
          <p className="text-2xs text-text-muted leading-relaxed mt-0.5">
            {context}
          </p>
        </div>

        {status && (
          <span
            className={`flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              statusColors[status.tone ?? "neutral"]
            }`}
          >
            {status.label}
          </span>
        )}
      </div>

      {/* Result Section */}
      {result !== undefined && (
        <div className="mt-2.5">
          <div className="text-sm font-medium text-text-primary">
            {result}
          </div>
        </div>
      )}

      {/* Optional Child content (mini chart, breakdown bars) */}
      {children && <div className="mt-2.5">{children}</div>}

      {/* Footer: Supporting Info + Optional Action */}
      {(supportingInfo || action) && (
        <div className="mt-3 pt-2.5 border-t border-border-subtle/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {supportingInfo ? (
            <div className="text-2xs text-text-muted font-mono leading-relaxed min-w-0">
              {supportingInfo}
            </div>
          ) : (
            <div />
          )}

          {action && (
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.ariaLabel || action.label}
              className="self-start sm:self-auto text-2xs font-medium text-accent hover:text-accent-emphasis disabled:text-text-disabled disabled:hover:text-text-disabled transition-colors flex items-center gap-1 flex-shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
