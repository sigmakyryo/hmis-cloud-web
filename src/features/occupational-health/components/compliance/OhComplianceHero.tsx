"use client";

import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import type { OhComplianceInsights } from "@/features/occupational-health/services/oh-ext.service";
import { cn } from "@/lib/utils";

/** The share of checks done on time that the clinic aims for. */
export const COMPLIANCE_TARGET = 90;

export type OhCompliancePeriod = "6" | "12" | "24";

function tone(rate: number | null) {
  if (rate === null) return { bar: "bg-dash-border", text: "text-dash-muted" };
  if (rate >= COMPLIANCE_TARGET) return { bar: "bg-brand-primary", text: "text-brand-primary" };
  if (rate >= 75) return { bar: "bg-amber-400/75", text: "text-amber-700" };
  return { bar: "bg-red-500", text: "text-red-700" };
}

/**
 * Where the month axis starts. Rates usually sit between 75 and 100, so starting at 0 flattens every
 * difference that matters; the axis starts at the nearest 10 below the lowest month (never above 50) and says so.
 */
export function axisFloor(rates: number[]): number {
  if (rates.length === 0) return 0;
  return Math.max(0, Math.min(50, Math.floor((Math.min(...rates) - 5) / 10) * 10));
}

/** One column per month: its height is the share of that month's checks that were done, against the target line. */
function MonthStrip({ trend }: { trend: OhComplianceInsights["trend"] }) {
  const last = trend.length - 1;
  const floor = axisFloor(trend.flatMap((m) => (m.rate === null ? [] : [m.rate])));
  const height = (value: number) => ((Math.max(floor, Math.min(100, value)) - floor) / (100 - floor)) * 100;
  const target = height(COMPLIANCE_TARGET);

  return (
    <div>
      <div className="flex gap-2">
        <div aria-hidden className="relative h-36 w-9 shrink-0 text-right text-[10.5px] text-dash-muted tabular-nums">
          <span className="absolute top-0 right-0 -translate-y-1/2">100%</span>
          <span className="absolute right-0 translate-y-1/2 font-semibold text-brand-navy" style={{ bottom: `${target}%` }}>
            {COMPLIANCE_TARGET}%
          </span>
          <span className="absolute right-0 bottom-0 translate-y-1/2">{floor}%</span>
        </div>
        <div
          className="relative flex h-36 min-w-0 flex-1 items-end gap-1.5 border-b border-dash-border"
          role="img"
          aria-label={`Monthly compliance against a ${COMPLIANCE_TARGET}% target: ${trend.map((m) => `${m.label} ${m.rate === null ? "no checks due" : `${Math.round(m.rate)}%`}`).join(", ")}`}
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-brand-navy/40" style={{ bottom: `${target}%` }} />
          {trend.map((month, index) => {
            const rate = month.rate === null ? null : Math.max(0, Math.min(100, month.rate));
            const current = index === last;
            return (
              <div
                key={month.month}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                title={`${month.label}: ${month.completed} of ${month.due} done${month.open ? `, ${month.open} still open` : ""}${current ? " (month so far)" : ""}`}
              >
                <span className={cn("text-[10.5px] font-semibold tabular-nums", tone(rate).text)}>{rate === null ? "" : Math.round(rate)}</span>
                <div className={cn("w-full max-w-8 rounded-t-[3px]", tone(rate).bar, current && "opacity-50")} style={{ height: rate === null ? "2px" : `${Math.max(2, height(rate))}%` }} />
              </div>
            );
          })}
        </div>
      </div>
      <div aria-hidden className="mt-1.5 ml-11 flex gap-1.5">
        {trend.map((month, index) => (
          <span key={month.month} className="min-w-0 flex-1 truncate text-center text-[11px] text-dash-muted">
            {index === last ? `${month.label}*` : month.label}
          </span>
        ))}
      </div>
      <p className="mt-2 ml-11 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-dash-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-brand-navy/60" /> {COMPLIANCE_TARGET}% target
        </span>
        <span>* Month so far, with checks still open.</span>
        {floor > 0 ? <span>The scale starts at {floor}%.</span> : null}
      </p>
    </div>
  );
}

const STATUS = [
  { key: "completed", label: "Done", className: "bg-brand-primary" },
  { key: "due", label: "Due", className: "bg-amber-500" },
  { key: "overdue", label: "Overdue", className: "bg-red-600" },
  { key: "waived", label: "Waived", className: "bg-dash-border" },
] as const;

/** Where compliance stands: the rate, its trend month by month, and every check by status. */
export function OhComplianceHero({
  insights,
  period,
  onPeriodChange,
}: {
  insights: OhComplianceInsights;
  period: OhCompliancePeriod;
  onPeriodChange: (period: OhCompliancePeriod) => void;
}) {
  const rate = insights.compliance.rate_3m;
  const prev = insights.compliance.rate_prev_3m;
  const delta = rate !== null && prev !== null ? Math.round((rate - prev) * 10) / 10 : null;
  const totals = insights.totals;
  const all = totals.completed + totals.due + totals.overdue + totals.waived;

  return (
    <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div data-testid="oh-compliance-metric-rate">
        <p className="text-[13px] font-medium text-dash-muted">Compliance, last 3 months</p>
        <p className={cn("mt-1 text-[56px] leading-none font-semibold tracking-tight tabular-nums", rate === null ? "text-dash-muted" : "text-brand-navy")}>
          {rate === null ? "—" : Math.round(rate)}
          {rate !== null ? <span className="text-[28px] text-dash-muted">%</span> : null}
        </p>
        <p className="mt-3 text-[13.5px] leading-snug">
          {rate === null ? (
            <span className="text-dash-muted">Nothing fell due in the last 3 months.</span>
          ) : (
            <>
              <span className={cn("font-semibold", tone(rate).text)}>{rate >= COMPLIANCE_TARGET ? "On target." : `${Math.round(COMPLIANCE_TARGET - rate)} points under target.`}</span>{" "}
              {delta !== null ? (
                <span className="text-dash-muted">
                  <span className={cn("font-semibold tabular-nums", delta >= 0 ? "text-brand-primary" : "text-red-700")}>{delta >= 0 ? `+${delta}` : delta} pts</span> on the 3 months before.
                </span>
              ) : null}
            </>
          )}
        </p>
        {all > 0 ? (
          <div className="mt-6" data-testid="oh-compliance-status">
            <div role="img" aria-label={`All checks: ${STATUS.map((s) => `${totals[s.key]} ${s.label.toLowerCase()}`).join(", ")}`} className="flex h-2 gap-0.5 overflow-hidden rounded-full">
              {STATUS.filter((s) => totals[s.key] > 0).map((s) => (
                <span key={s.key} className={s.className} style={{ flexGrow: totals[s.key] }} />
              ))}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
              {STATUS.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span aria-hidden className={cn("size-2 rounded-full", s.className)} />
                  <dt className="text-dash-muted">{s.label}</dt>
                  <dd className="ml-auto font-semibold text-brand-navy tabular-nums">{totals[s.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
      <div data-testid="oh-compliance-trend" className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-brand-navy">Month by month</h2>
            <p className="mt-0.5 text-[13px] text-dash-muted">Share of each month&rsquo;s checks that were done.</p>
          </div>
          <OhSegmented
            label="Period"
            role="radiogroup"
            value={period}
            onChange={onPeriodChange}
            options={[
              { value: "6", label: "6 mo" },
              { value: "12", label: "12 mo" },
              { value: "24", label: "24 mo" },
            ]}
          />
        </div>
        {insights.trend.every((m) => m.due === 0) ? <p className="py-10 text-[13.5px] text-dash-muted">Nothing fell due in this period.</p> : <MonthStrip trend={insights.trend} />}
      </div>
    </div>
  );
}
