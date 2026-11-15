"use client";

import { CalendarDays, ListFilter, TestTubes } from "lucide-react";
import Link from "next/link";

import { REASON_LABEL, TEST_STATUS_LABEL } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { ROUTES } from "@/constants/routes";
import { shortDate } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { FigureStrip, QueryState, ShareRow, StripCell, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeDrugAlcohol } from "@/features/occupational-health/lib/oh-home.types";
import { cn } from "@/lib/utils";

type SummaryQuery = { data?: OhHomeDrugAlcohol; isLoading: boolean; isError: boolean; refetch: () => unknown };

const reasonLabel = (reason: string) => REASON_LABEL[reason] ?? reason.replaceAll("_", " ");

export function OhDaMonthSection({ summary }: { summary: SummaryQuery }) {
  const month = summary.data?.month;
  return (
    <ViewSection title="This month" icon={CalendarDays} href={ROUTES.drugAlcoholReports} linkLabel="Reports">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={2}>
        {month ? (
          <>
            <p className="mb-3 text-[13.5px] text-dash-muted">
              {month.positivity_rate === null
                ? "No results verified yet this month."
                : `${month.positivity_rate}% of verified results were positive.`}
            </p>
            <FigureStrip>
              <StripCell label="Tests" value={month.tests} href={ROUTES.drugAlcoholTests} />
              <StripCell label="Verified" value={month.verified} href={ROUTES.drugAlcoholTests} />
              <StripCell label="Positive" value={month.positive} href={ROUTES.drugAlcoholTests} hint={month.positive > 0 ? "Check fitness" : undefined} alert={month.positive > 0} />
              <StripCell label="Refusals" value={month.refusals} href={ROUTES.drugAlcoholTests} alert={month.refusals > 0} hint={month.refusals > 0 ? "Treated as positive" : undefined} />
            </FigureStrip>
          </>
        ) : null}
      </QueryState>
    </ViewSection>
  );
}

export function OhDaReasonSection({ summary }: { summary: SummaryQuery }) {
  const rows = summary.data?.by_reason ?? [];
  const max = Math.max(1, ...rows.map((row) => row.tests));
  return (
    <ViewSection title="Why people were tested" icon={ListFilter} count={summary.data ? rows.reduce((sum, row) => sum + row.tests, 0) : undefined}>
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        <p className="mb-1 text-[12.5px] text-dash-muted">Last 90 days</p>
        {rows.length === 0 ? (
          <p className="text-[13.5px] text-dash-muted">No tests in the last 90 days.</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <ShareRow
                key={row.reason}
                name={reasonLabel(row.reason)}
                percent={(row.tests / max) * 100}
                valueLabel={String(row.tests)}
                note={row.positive > 0 ? `${row.positive} positive` : "none positive"}
                alertNote={row.positive > 0}
                tone="bg-violet-500"
              />
            ))}
          </ul>
        )}
      </QueryState>
    </ViewSection>
  );
}

function resultChip(status: string, result: string | null) {
  if (result === "positive") return { label: "Positive", className: "bg-red-50 text-red-700" };
  if (result === "negative") return { label: "Negative", className: "bg-brand-tint text-brand-primary" };
  return { label: TEST_STATUS_LABEL[status] ?? status.replaceAll("_", " "), className: "bg-dash-canvas text-brand-slate" };
}

export function OhDaRecentSection({ summary }: { summary: SummaryQuery }) {
  const rows = summary.data?.recent ?? [];
  return (
    <ViewSection title="Latest tests" icon={TestTubes} href={ROUTES.drugAlcoholTests} linkLabel="All tests">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        {rows.length === 0 ? (
          <p className="text-[13.5px] text-dash-muted">No tests yet.</p>
        ) : (
          <ul>
            {rows.map((row) => {
              const chip = resultChip(row.status, row.final_result);
              return (
                <li key={row.uuid} className="border-b border-dash-border/70 last:border-b-0">
                  <Link href={ROUTES.drugAlcoholTests} data-testid="oh-home-da-test" className="group flex items-center gap-3 py-2.5 focus-visible:outline-none">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-[11.5px] font-semibold text-violet-800">
                      {row.customer_initials || "—"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{reasonLabel(row.reason)}</span>
                      {row.employer_name ? <span className="block truncate text-[12.5px] text-dash-muted">{row.employer_name}</span> : null}
                    </span>
                    <span className={cn("shrink-0 rounded-md px-1.5 py-px text-[11.5px] font-semibold", chip.className)}>{chip.label}</span>
                    <span className="w-12 shrink-0 text-right text-[12.5px] text-dash-muted tabular-nums">{shortDate(row.created_at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </ViewSection>
  );
}
