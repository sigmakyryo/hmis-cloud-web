import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PAGE_STAT_LABEL_CLASS } from "@/features/app-shell/components/page-layout";
import { cn } from "@/lib/utils";

export type OhKpiTone = "default" | "success" | "warning" | "danger";

export type OhKpiDelta = {
  /** Change versus the comparison period; null hides the chip. */
  value: number | null;
  /** Shown after the number, e.g. "pts" or "%". */
  suffix?: string;
  /** Which direction is an improvement. */
  goodWhen: "up" | "down";
  /** e.g. "vs previous 30 days". */
  label?: string;
};

const TONE_ICON: Record<OhKpiTone, string> = {
  default: "bg-brand-tint text-brand-primary",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
};

function DeltaChip({ delta }: { delta: OhKpiDelta }) {
  if (delta.value === null || !Number.isFinite(delta.value)) {
    return null;
  }
  const rounded = Math.round(delta.value * 10) / 10;
  const flat = rounded === 0;
  const up = rounded > 0;
  const good = flat ? null : (up && delta.goodWhen === "up") || (!up && delta.goodWhen === "down");
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const text = `${up ? "+" : ""}${rounded}${delta.suffix ?? ""}`;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-dash-muted">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
          good === null && "bg-dash-canvas text-brand-slate",
          good === true && "bg-emerald-50 text-emerald-700",
          good === false && "bg-red-50 text-red-700",
        )}
        aria-label={`${text}${delta.label ? ` ${delta.label}` : ""}`}
      >
        <Icon className="size-3" aria-hidden />
        {text}
      </span>
      {delta.label ? <span className="truncate">{delta.label}</span> : null}
    </span>
  );
}

type OhKpiCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: OhKpiDelta;
  tone?: OhKpiTone;
  icon?: LucideIcon;
  isLoading?: boolean;
  onClick?: () => void;
  active?: boolean;
  "data-testid"?: string;
};

/** Summary number with an optional trend delta. Clickable when it doubles as a filter. */
export function OhKpiCard({
  label,
  value,
  hint,
  delta,
  tone = "default",
  icon: Icon,
  isLoading = false,
  onClick,
  active = false,
  "data-testid": testId,
}: OhKpiCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={PAGE_STAT_LABEL_CLASS}>{label}</span>
        {Icon ? (
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", TONE_ICON[tone])}>
            <Icon className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      {isLoading ? (
        <span className="mt-2 block h-7 w-16 animate-pulse rounded-md bg-dash-canvas" aria-hidden />
      ) : (
        <span
          className={cn(
            "mt-1 block text-2xl font-semibold tracking-tight tabular-nums text-brand-navy",
            tone === "danger" && "text-red-700",
          )}
        >
          {value}
        </span>
      )}
      <span className="mt-1.5 flex min-h-[18px] flex-wrap items-center gap-x-2 gap-y-1">
        {delta && !isLoading ? <DeltaChip delta={delta} /> : null}
        {hint ? <span className="text-[12px] text-dash-muted">{hint}</span> : null}
      </span>
    </>
  );

  const className = cn(
    "flex min-w-0 flex-col rounded-xl border border-dash-border bg-white p-4 text-left",
    onClick && "transition-colors hover:border-brand-primary/40 hover:bg-brand-tint/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
    active && "border-brand-primary/60 bg-brand-tint/40",
  );

  return onClick ? (
    <button type="button" className={className} onClick={onClick} aria-pressed={active} data-testid={testId}>
      {body}
    </button>
  ) : (
    <div className={className} data-testid={testId}>
      {body}
    </div>
  );
}

export function OhKpiGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5", className)} role="group" aria-label="Summary">
      {children}
    </div>
  );
}
