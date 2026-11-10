"use client";

import { cn } from "@/lib/utils";
import type { OhImmExposureClock } from "@/features/occupational-health/services/immunisation.service";
import { formatClock } from "./format-clock";

const DAY_MS = 86_400_000;

/** Whole days from today to an ISO date. Negative when the date has passed. */
export function daysFromToday(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const target = Date.parse(isoDate.slice(0, 10));
  if (Number.isNaN(target)) return null;
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - start) / DAY_MS);
}

function relativeDays(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${Math.abs(days)} days ago`;
}

/** Date with a relative hint; red once passed, amber inside the warning window. */
export function ImmDateCell({
  date,
  warnWithinDays = 14,
  pastIsBad = true,
}: {
  date: string | null | undefined;
  warnWithinDays?: number;
  pastIsBad?: boolean;
}) {
  const days = daysFromToday(date);
  if (!date || days == null) return <span className="text-dash-muted">—</span>;
  const tone =
    days < 0 && pastIsBad ? "text-red-700" : days <= warnWithinDays && days >= 0 ? "text-amber-700" : "text-dash-muted";
  return (
    <span className="whitespace-nowrap">
      <span className="text-brand-slate">{date.slice(0, 10)}</span>
      <span className={cn("block text-[12px]", tone)}>{relativeDays(days)}</span>
    </span>
  );
}

/** One segment per required dose, filled for doses given. */
export function ImmDoseProgress({ received, required }: { received: number; required: number | null }) {
  if (!required || required <= 0) {
    return <span className="tabular-nums">{received} given</span>;
  }
  const segments = Math.min(required, 8);
  const filled = Math.min(received, required);
  const complete = filled >= required;
  return (
    <span className="inline-flex items-center gap-2" aria-label={`${received} of ${required} doses`}>
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: segments }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 w-3.5 rounded-full",
              index < Math.round((filled / required) * segments)
                ? complete
                  ? "bg-emerald-500"
                  : "bg-brand-primary"
                : "bg-dash-border",
            )}
          />
        ))}
      </span>
      <span className="text-[12px] tabular-nums text-dash-muted">
        {received}/{required}
      </span>
    </span>
  );
}

/** Horizontal meter for stock on hand or coverage. */
export function ImmMeter({
  value,
  max,
  label,
  tone = "primary",
}: {
  value: number;
  max: number;
  label: string;
  tone?: "primary" | "danger" | "warning" | "success";
}) {
  const percent = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  const bar = {
    primary: "bg-brand-primary",
    danger: "bg-red-500",
    warning: "bg-amber-500",
    success: "bg-emerald-500",
  }[tone];
  return (
    <span className="inline-flex min-w-[7rem] items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-dash-border/70" aria-hidden>
        <span className={cn("block h-full rounded-full", bar)} style={{ width: `${percent}%` }} />
      </span>
      <span className="text-[12px] tabular-nums text-brand-slate">{label}</span>
    </span>
  );
}

/**
 * PEP / HBIG window as a draining bar: full at exposure, empty at the hard maximum.
 * Amber once the target deadline has passed, red after the maximum.
 */
export function ImmClockMeter({ clock, exposedAt }: { clock: OhImmExposureClock; exposedAt: string }) {
  const start = Date.parse(exposedAt);
  const deadline = Date.parse(clock.deadline_at);
  const max = Date.parse(clock.max_at);
  const remaining = clock.seconds_remaining ?? null;
  const done = clock.status === "done" || clock.status === "given" || clock.status === "complete";
  const windowMs = max - start;
  const nowMs = Number.isNaN(max) || remaining == null ? null : max - remaining * 1000;
  const left = nowMs == null || windowMs <= 0 ? 0 : Math.max(0, Math.min(1, (max - nowMs) / windowMs));
  const pastTarget = nowMs != null && !Number.isNaN(deadline) && nowMs > deadline;
  const overdue = clock.overdue || (remaining != null && remaining < 0);
  const tone = done ? "bg-emerald-500" : overdue ? "bg-red-500" : pastTarget ? "bg-amber-500" : "bg-brand-primary";
  return (
    <span className="flex min-w-[9rem] flex-col gap-0.5">
      <span className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className="font-medium text-brand-navy">{clock.label}</span>
        <span className={cn("tabular-nums", overdue ? "text-red-700" : pastTarget ? "text-amber-700" : "text-dash-muted")}>
          {done ? "Given" : formatClock(remaining ?? undefined)}
        </span>
      </span>
      <span className="h-1 w-full overflow-hidden rounded-full bg-dash-border/70" aria-hidden>
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${done ? 100 : Math.round(left * 100)}%` }} />
      </span>
    </span>
  );
}

/** Square score chip coloured by risk band (score = likelihood × severity). */
export function ImmScoreChip({ score }: { score: number }) {
  const tone =
    score >= 15 ? "bg-red-500 text-white" : score >= 8 ? "bg-amber-400 text-amber-950" : "bg-emerald-100 text-emerald-800";
  return (
    <span className={cn("inline-flex size-7 items-center justify-center rounded-md text-[12px] font-semibold tabular-nums", tone)}>
      {score}
    </span>
  );
}

/** Initials avatar used where only an employee reference is available. */
export function ImmAvatar({ text }: { text: string }) {
  const letters = text.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "—";
  return (
    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[11px] font-semibold text-brand-primary">
      {letters}
    </span>
  );
}

/** Monospace code pills (vaccine, control, or titre codes). Extra codes collapse into "+N". */
export function ImmCodeChips({ codes, max = 4 }: { codes: string[]; max?: number }) {
  if (codes.length === 0) return <span className="text-dash-muted">—</span>;
  return (
    <span className="flex max-w-[18rem] flex-wrap items-center gap-1">
      {codes.slice(0, max).map((code) => (
        <span key={code} className="rounded-md bg-brand-tint px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-primary">
          {code}
        </span>
      ))}
      {codes.length > max ? <span className="text-[11px] text-dash-muted">+{codes.length - max}</span> : null}
    </span>
  );
}
