import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

import type { OhKpiDelta, OhKpiTone } from "@/features/occupational-health/components/dashboard/OhKpiCard";
import { cn } from "@/lib/utils";

const TONE_DOT: Record<OhKpiTone, string | null> = {
  default: null,
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

function FlatDelta({ delta }: { delta: OhKpiDelta }) {
  if (delta.value === null || !Number.isFinite(delta.value)) return null;
  const rounded = Math.round(delta.value * 10) / 10;
  const flat = rounded === 0;
  const up = rounded > 0;
  const good = flat ? null : (up && delta.goodWhen === "up") || (!up && delta.goodWhen === "down");
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const text = `${up ? "+" : ""}${rounded}${delta.suffix ?? ""}`;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[12px]">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-semibold tabular-nums",
          good === null && "text-brand-slate",
          good === true && "text-emerald-700",
          good === false && "text-red-700",
        )}
        aria-label={`${text}${delta.label ? ` ${delta.label}` : ""}`}
      >
        <Icon className="size-3.5" aria-hidden />
        {text}
      </span>
      {delta.label ? <span className="truncate text-dash-muted">{delta.label}</span> : null}
    </span>
  );
}

type OhKpiStatProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: OhKpiDelta;
  tone?: OhKpiTone;
  isLoading?: boolean;
  /** Makes the figure a filter toggle. */
  onClick?: () => void;
  active?: boolean;
  "data-testid"?: string;
};

/** One figure in an OhKpiStrip: small label, big number, delta or hint. No box. */
export function OhKpiStat({ label, value, hint, delta, tone = "default", isLoading = false, onClick, active = false, "data-testid": testId }: OhKpiStatProps) {
  const dot = TONE_DOT[tone];
  const body = (
    <>
      <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]", active ? "text-brand-primary" : "text-dash-muted")}>
        {dot ? <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} /> : null}
        <span className="truncate">{label}</span>
      </span>
      {isLoading ? (
        <span className="mt-2 block h-8 w-16 animate-pulse rounded bg-dash-canvas" aria-hidden />
      ) : (
        <span
          className={cn(
            "mt-1 block text-[30px] font-semibold leading-none tracking-tight tabular-nums",
            tone === "danger" ? "text-red-700" : "text-brand-navy",
            onClick && "transition-colors group-hover:text-brand-primary",
          )}
        >
          {value}
        </span>
      )}
      <span className="mt-2 flex min-h-[18px] items-center gap-2 text-[12px] text-dash-muted">
        {delta && !isLoading ? <FlatDelta delta={delta} /> : null}
        {hint ? <span className="truncate">{hint}</span> : null}
      </span>
      {onClick ? (
        <span
          aria-hidden
          className={cn("absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-colors md:inset-x-5 md:group-first:left-0", active ? "bg-brand-primary" : "bg-transparent group-hover:bg-dash-border")}
        />
      ) : null}
    </>
  );
  const className = cn(
    "group relative flex min-w-0 flex-col py-4 text-left md:flex-1 md:px-5 md:first:pl-0 md:last:pr-0",
    onClick && "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
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

/**
 * Flat KPI strip: one line with thin vertical dividers on desktop; a borderless
 * two-column grid on phones. Sits on a single hairline.
 */
export function OhKpiStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="group"
      aria-label="Summary"
      className={cn(
        "grid grid-cols-2 gap-x-6 border-b border-dash-border/70 md:flex md:gap-0 md:divide-x md:divide-dash-border/70",
        className,
      )}
    >
      {children}
    </div>
  );
}
