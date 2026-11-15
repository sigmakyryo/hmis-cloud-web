"use client";

import Link from "next/link";
import { Hourglass } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { ColumnChart, shortDate } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeFitness } from "@/features/occupational-health/lib/oh-home.types";

type SummaryQuery = { data?: OhHomeFitness; isLoading: boolean; isError: boolean; refetch: () => unknown };

/** Looking ahead: clearances running out in each of the next eight weeks, and the first names on the list. */
export function OhFitOutlook({ summary }: { summary: SummaryQuery }) {
  const weeks = summary.data?.expiring_by_week ?? [];
  const total = weeks.reduce((sum, week) => sum + week.count, 0);
  const soonest = summary.data?.expiring.rows ?? [];

  return (
    <ViewSection title="Clearances running out" icon={Hourglass} count={summary.data ? total : undefined} countLabel="in 8 weeks" href={ROUTES.fitnessBoard} linkLabel="Board" testId="oh-home-fit-outlook">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        <div className="border-t border-dash-border/70 pt-3">
          {total === 0 ? (
            <p className="py-2 text-[13.5px] text-dash-muted">No clearance runs out in the next eight weeks.</p>
          ) : (
            <ColumnChart
              tone="bg-amber-500"
              showValues
              summary={`Clearances running out per week over the next eight weeks, ${total} in all.`}
              columns={weeks.map((week, index) => ({
                key: week.week_start,
                label: index === 0 ? "This wk" : shortDate(week.week_start),
                value: week.count,
                title: `Week from ${shortDate(week.week_start)}: ${week.count} clearances run out`,
              }))}
            />
          )}
          {soonest.length > 0 ? (
            <ul className="mt-4">
              {soonest.slice(0, 4).map((row) => (
                <li key={row.customer_uuid} className="border-b border-dash-border/70 last:border-b-0">
                  <Link href={ROUTES.occupationalHealthEmployee(row.customer_uuid)} data-testid="oh-home-fit-expiring" className="group flex items-baseline gap-3 py-2 focus-visible:outline-none">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{row.worker_label}</span>
                    <span className="hidden truncate text-[12px] text-dash-muted @md:inline">{row.employer_name}</span>
                    <span className="w-14 shrink-0 text-right text-[12.5px] font-medium text-amber-700 tabular-nums">{shortDate(row.earliest_expiry)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </QueryState>
    </ViewSection>
  );
}
