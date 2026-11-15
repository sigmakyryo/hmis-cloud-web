"use client";

import { ChartColumn } from "lucide-react";

import { ColumnChart, shortDate } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeImmunizations } from "@/features/occupational-health/lib/oh-home.types";

type SummaryQuery = { data?: OhHomeImmunizations; isLoading: boolean; isError: boolean; refetch: () => unknown };

/** Doses given each week for the last eight weeks. */
export function OhImmDoses({ summary }: { summary: SummaryQuery }) {
  const weeks = summary.data?.doses_by_week ?? [];
  const total = weeks.reduce((sum, week) => sum + week.doses, 0);
  const thisWeek = weeks.at(-1)?.doses ?? 0;

  return (
    <ViewSection title="Doses given" icon={ChartColumn} count={summary.data ? total : undefined} countLabel="in 8 weeks">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        <div className="border-t border-dash-border/70 pt-3">
          <p className="mb-3 text-[13px] text-dash-muted">
            <span className="font-semibold text-brand-navy tabular-nums">{thisWeek}</span> this week, about{" "}
            <span className="font-semibold text-brand-navy tabular-nums">{Math.round(total / Math.max(1, weeks.length))}</span> a week.
          </p>
          <ColumnChart
            columns={weeks.map((week) => ({ key: week.week_start, label: shortDate(week.week_start), value: week.doses, title: `Week of ${shortDate(week.week_start)}: ${week.doses} doses` }))}
            summary={`Doses given per week over the last 8 weeks, ${total} in all.`}
            tone="bg-sky-600"
            showValues
          />
        </div>
      </QueryState>
    </ViewSection>
  );
}
