"use client";

import type { OhWorklistFilters } from "@/features/occupational-health/components/surveillance/OhSurveillanceWorklist";
import type { OhDueWindow } from "@/features/occupational-health/services/oh-ext.service";
import { cn } from "@/lib/utils";

type Segment = {
  key: "overdue" | "due30" | "next90" | "later";
  label: string;
  value: number;
  sub?: string;
  bar: string;
  text: string;
  /** The filter this segment applies, or null when the worklist has no matching filter. */
  filter: Partial<OhWorklistFilters> | null;
};

/** Counts per window, from the service when it has answered, otherwise from the worklist itself. */
export type OhRunwayCounts = Record<OhDueWindow, number>;

/**
 * Open checks laid out along time, from late to later. Each part is as wide as its share and,
 * where the worklist has a matching filter, picks it.
 */
export function OhDueRunway({
  counts,
  filters,
  onFilter,
  onShowAll,
  stats,
}: {
  counts: OhRunwayCounts;
  filters: OhWorklistFilters;
  onFilter: (patch: Partial<OhWorklistFilters>) => void;
  onShowAll: () => void;
  stats: React.ReactNode;
}) {
  const segments: Segment[] = [
    {
      key: "overdue",
      label: "Overdue",
      value: counts.overdue_30_plus + counts.overdue,
      sub: counts.overdue_30_plus > 0 ? `${counts.overdue_30_plus} over 30 days` : undefined,
      bar: "bg-red-600",
      text: "text-red-700",
      filter: { status: "overdue" },
    },
    { key: "due30", label: "Next 30 days", value: counts.next_7 + counts.next_30, sub: counts.next_7 > 0 ? `${counts.next_7} this week` : undefined, bar: "bg-amber-500", text: "text-amber-700", filter: { due: "next_30" } },
    { key: "next90", label: "31 to 90 days", value: counts.next_90, bar: "bg-brand-primary/60", text: "text-brand-navy", filter: { due: "next_90" } },
    { key: "later", label: "Later", value: counts.later, bar: "bg-dash-border", text: "text-brand-navy", filter: null },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const noFilter = filters.status === "all" && filters.due === "any" && !filters.exam && !filters.hazard && !filters.site && !filters.search;
  const isActive = (s: Segment) =>
    s.filter !== null && Object.entries(s.filter).every(([k, v]) => filters[k as keyof OhWorklistFilters] === v) && (s.key === "overdue" ? filters.due === "any" : filters.status === "all");

  return (
    <section aria-label="When open checks fall due" className="border-b border-dash-border/70 py-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <button
          type="button"
          onClick={onShowAll}
          aria-pressed={noFilter}
          data-testid="oh-kpi-open"
          className="group flex items-baseline gap-2 focus-visible:outline-none"
        >
          <span className="text-[28px] leading-none font-semibold tracking-tight text-brand-navy tabular-nums">{total}</span>
          <span className="text-[14px] text-brand-slate group-hover:text-brand-primary group-focus-visible:underline">open checks</span>
        </button>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-dash-muted">{stats}</div>
      </div>
      {total === 0 ? (
        <p className="text-[13.5px] text-dash-muted">Nothing is due. Every check is done or waived.</p>
      ) : (
        <div className="flex items-start gap-1" role="group" aria-label="Filter the worklist by when checks fall due">
          {segments
            .filter((s) => s.value > 0 || s.key === "overdue" || s.key === "due30")
            .map((s) => {
              const active = isActive(s);
              const content = (
                <>
                  <span aria-hidden className={cn("block h-2 rounded-full transition-opacity", s.bar, !active && !noFilter && s.filter && "opacity-40")} />
                  <span className={cn("mt-2.5 block text-[22px] leading-none font-semibold tabular-nums", s.value > 0 ? s.text : "text-dash-muted/60")}>{s.value}</span>
                  <span className={cn("mt-1 block text-[12.5px]", active ? "font-semibold text-brand-navy" : "text-brand-slate")}>{s.label}</span>
                  {s.sub ? <span className="block text-[12px] text-dash-muted">{s.sub}</span> : null}
                </>
              );
              const style = { flexGrow: Math.max(s.value, total * 0.08) };
              return s.filter ? (
                <button
                  key={s.key}
                  type="button"
                  data-testid={s.key === "overdue" ? "oh-kpi-overdue" : s.key === "due30" ? "oh-kpi-due30" : `oh-kpi-${s.key}`}
                  aria-pressed={active}
                  onClick={() => onFilter(s.filter ?? {})}
                  className="group flex min-w-0 basis-0 flex-col self-start text-left focus-visible:outline-none [&:focus-visible>span:nth-child(3)]:underline"
                  style={style}
                >
                  {content}
                </button>
              ) : (
                <div key={s.key} className="min-w-0 basis-0" style={style} data-testid={`oh-kpi-${s.key}`}>
                  {content}
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}
