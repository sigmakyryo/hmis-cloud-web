"use client";

import { ChartColumn, HardHat } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { ColumnChart, shortDate } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeClinic } from "@/features/occupational-health/lib/oh-home.types";
import { cn } from "@/lib/utils";

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "narrow" });

const SEVERITY_DOT: Record<string, string> = {
  minor: "bg-brand-primary",
  moderate: "bg-amber-500",
  serious: "bg-red-600",
  severe: "bg-red-600",
  fatal: "bg-red-800",
};

type SummaryQuery = { data?: OhHomeClinic; isLoading: boolean; isError: boolean; refetch: () => unknown };

export function OhClinicVisitsSection({ summary }: { summary: SummaryQuery }) {
  const days = summary.data?.visits_by_day ?? [];
  const total = days.reduce((sum, day) => sum + day.visits, 0);
  const cancelled = days.reduce((sum, day) => sum + day.cancelled, 0);
  const columns = days.map((day) => ({
    key: day.date,
    label: WEEKDAY.format(new Date(`${day.date}T00:00:00`)),
    value: day.visits,
    title: `${shortDate(day.date)}: ${day.visits} visits${day.cancelled ? `, ${day.cancelled} cancelled` : ""}`,
  }));

  return (
    <ViewSection title="Visits, last 14 days" icon={ChartColumn} count={summary.data ? total : undefined} href={ROUTES.occupationalHealth} linkLabel="Queue">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        <p className="mb-3 text-[13.5px] text-dash-muted">
          About <span className="font-semibold text-brand-navy tabular-nums">{Math.round(total / 14)}</span> a day
          {cancelled > 0 ? `, and ${cancelled} cancelled in the fortnight` : ""}.
        </p>
        <ColumnChart columns={columns} summary={`Visits per day over the last 14 days, ${total} in all.`} tone="bg-brand-primary" showValues />
      </QueryState>
    </ViewSection>
  );
}

export function OhClinicInjuriesSection({ summary }: { summary: SummaryQuery }) {
  const iod = summary.data?.iod;

  return (
    <ViewSection title="Injuries on duty" icon={HardHat} count={iod?.open} href={ROUTES.occupationalHealthInjuries} linkLabel="All injuries">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        {iod ? (
          <>
            <p className="mb-2 text-[13.5px] text-dash-muted">
              <span className="font-semibold text-brand-navy tabular-nums">{iod.opened_30d}</span> reported and{" "}
              <span className="font-semibold text-brand-navy tabular-nums">{iod.closed_30d}</span> closed in 30 days.
              {iod.lost_days_open > 0 ? ` ${iod.lost_days_open} days lost on open cases.` : ""}
            </p>
            {iod.recent.length === 0 ? (
              <p className="rounded-xl border border-dashed border-dash-border px-4 py-5 text-[13.5px] text-dash-muted">No open injury cases.</p>
            ) : (
              <ul>
                {iod.recent.map((item) => (
                  <li key={item.uuid} className="border-b border-dash-border/70 last:border-b-0">
                    <Link href={ROUTES.occupationalHealthRecord("iod", item.uuid)} data-testid="oh-home-iod-case" className="group flex items-center gap-3 py-2.5 focus-visible:outline-none">
                      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", SEVERITY_DOT[item.severity] ?? "bg-dash-border")} />
                      <span className="min-w-0 flex-1 truncate text-[14px] text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">
                        {[item.body_part, item.mechanism].filter(Boolean).join(" · ") || "Injury case"}
                      </span>
                      {item.severity ? <span className="shrink-0 text-[12.5px] text-dash-muted capitalize">{item.severity}</span> : null}
                      <span className="w-14 shrink-0 text-right text-[12.5px] text-dash-muted tabular-nums">{shortDate(item.onset_date)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </QueryState>
    </ViewSection>
  );
}
