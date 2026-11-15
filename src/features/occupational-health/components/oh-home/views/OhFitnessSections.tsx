"use client";

import { Building2, CalendarClock, GraduationCap } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { shortDate, StackedBar } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, TodoRow, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeFitness } from "@/features/occupational-health/lib/oh-home.types";

type SummaryQuery = { data?: OhHomeFitness; isLoading: boolean; isError: boolean; refetch: () => unknown };

export function OhFitExpiringSection({ summary }: { summary: SummaryQuery }) {
  const expiring = summary.data?.expiring;
  return (
    <ViewSection title="Clearances expiring" icon={CalendarClock} countLabel="in the next 30 days" count={expiring?.count} href={ROUTES.fitnessBoard} linkLabel="Board">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        <p className="mb-1 text-[12.5px] text-dash-muted">Next 30 days, soonest first</p>
        {!expiring || expiring.rows.length === 0 ? (
          <p className="text-[13.5px] text-dash-muted">Nothing expires in the next 30 days.</p>
        ) : (
          <ul>
            {expiring.rows.map((row) => (
              <li key={row.customer_uuid} className="border-b border-dash-border/70 last:border-b-0">
                <Link href={ROUTES.occupationalHealthEmployee(row.customer_uuid)} data-testid="oh-home-fit-expiring" className="group flex items-baseline gap-3 py-2.5 focus-visible:outline-none">
                  <span className="min-w-0 flex-1 truncate text-[14px] text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{row.worker_label}</span>
                  <span className="hidden truncate text-[12.5px] text-dash-muted @xl:inline">{row.employer_name}</span>
                  <span className="w-14 shrink-0 text-right text-[12.5px] font-medium text-amber-700 tabular-nums">{shortDate(row.earliest_expiry)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </ViewSection>
  );
}

export function OhFitEmployerSection({ summary }: { summary: SummaryQuery }) {
  const rows = summary.data?.by_employer ?? [];
  return (
    <ViewSection title="By employer" icon={Building2} href={ROUTES.fitnessBoard} linkLabel="Board">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        {rows.length === 0 ? (
          <p className="text-[13.5px] text-dash-muted">No workers have a fitness status yet.</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li key={row.employer} data-testid="oh-home-fit-employer">
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="truncate text-brand-navy">{row.employer}</span>
                  <span className="shrink-0 text-[12.5px] text-dash-muted tabular-nums">
                    {Math.round((row.fit / Math.max(1, row.workers)) * 100)}% fit · {row.workers}
                  </span>
                </div>
                <StackedBar
                  label={row.employer}
                  legend={false}
                  height="h-1.5"
                  segments={[
                    { key: "fit", label: "Fit", value: row.fit, className: "bg-emerald-600" },
                    { key: "restricted", label: "Restricted", value: row.restricted, className: "bg-amber-500" },
                    { key: "not_fit", label: "Not fit", value: row.not_fit, className: "bg-red-600" },
                    { key: "unknown", label: "Not assessed", value: row.unknown, className: "bg-dash-border" },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </ViewSection>
  );
}

export function OhFitTrainingSection({ summary }: { summary: SummaryQuery }) {
  const training = summary.data?.training_expiring;
  return (
    <ViewSection title="Training expiring" icon={GraduationCap} countLabel="in the next 30 days" count={training?.count} href={ROUTES.fitnessTraining} linkLabel="Training">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        {!training || training.by_course.length === 0 ? (
          <p className="text-[13.5px] text-dash-muted">No training expires in the next 30 days.</p>
        ) : (
          <ul>
            {training.by_course.map((row) => (
              <TodoRow key={row.course} value={row.count} label={row.course} hint="30 days" href={ROUTES.fitnessTraining} />
            ))}
          </ul>
        )}
      </QueryState>
    </ViewSection>
  );
}
