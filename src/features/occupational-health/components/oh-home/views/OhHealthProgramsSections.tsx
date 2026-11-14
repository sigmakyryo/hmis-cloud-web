"use client";

import { ChartColumn, ChartPie, Forward } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { ColumnChart, shortDate, shortMonth, StackedBar } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeHealthPrograms } from "@/features/occupational-health/lib/oh-home.types";
import { cn } from "@/lib/utils";

type SummaryQuery = { data?: OhHomeHealthPrograms; isLoading: boolean; isError: boolean; refetch: () => unknown };

export const HP_LABEL: Record<string, string> = { hearing: "Hearing", lung: "Lung function", vision: "Vision", ergonomics: "Ergonomics", fatigue: "Fatigue" };
export const HP_HREF: Record<string, string> = {
  hearing: ROUTES.healthProgramsHearing,
  lung: ROUTES.healthProgramsLung,
  vision: ROUTES.healthProgramsVision,
  ergonomics: ROUTES.healthProgramsErgonomics,
  fatigue: ROUTES.healthProgramsFatigue,
};

export function OhHpMonthlySection({ summary }: { summary: SummaryQuery }) {
  const months = summary.data?.by_month ?? [];
  const total = months.reduce((sum, month) => sum + month.total, 0);
  return (
    <ViewSection title="Tests per month" icon={ChartColumn} count={summary.data ? total : undefined} href={ROUTES.healthProgramsReports} linkLabel="Reports">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        <ColumnChart
          tone="bg-rose-500"
          showValues
          summary={`Screening tests per month over the last six months, ${total} in all.`}
          columns={months.map((month) => ({
            key: month.month,
            label: shortMonth(month.month),
            value: month.total,
            title: `${shortMonth(month.month)}: ${Object.keys(HP_LABEL).map((key) => `${HP_LABEL[key]} ${month[key as keyof typeof month]}`).join(", ")}`,
          }))}
        />
      </QueryState>
    </ViewSection>
  );
}

export function OhHpOutcomesSection({ summary }: { summary: SummaryQuery }) {
  const outcomes = summary.data?.outcomes_12m;
  const total = outcomes ? outcomes.fit + outcomes.restricted + outcomes.unfit + outcomes.pending : 0;
  return (
    <ViewSection title="Outcomes, last 12 months" icon={ChartPie} count={summary.data ? total : undefined}>
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={2}>
        {outcomes && total > 0 ? (
          <>
            <p className="mb-3 text-[13.5px] text-dash-muted">
              <span className="font-semibold text-brand-navy tabular-nums">{Math.round((outcomes.fit / total) * 100)}%</span> of results came back fit.
            </p>
            <StackedBar
              label="Outcomes"
              segments={[
                { key: "fit", label: "Fit", value: outcomes.fit, className: "bg-brand-primary" },
                { key: "restricted", label: "Restricted", value: outcomes.restricted, className: "bg-amber-500" },
                { key: "unfit", label: "Not fit", value: outcomes.unfit, className: "bg-red-600" },
                { key: "pending", label: "No outcome yet", value: outcomes.pending, className: "bg-dash-border" },
              ]}
            />
          </>
        ) : (
          <p className="text-[13.5px] text-dash-muted">No results in the last 12 months.</p>
        )}
      </QueryState>
    </ViewSection>
  );
}

export function OhHpReferralsSection({ summary }: { summary: SummaryQuery }) {
  const referrals = summary.data?.referrals;
  return (
    <ViewSection title="Referred on" icon={Forward} count={referrals?.count_60d}>
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        <p className="mb-1 text-[12.5px] text-dash-muted">Results referred for follow-up in the last 60 days</p>
        {!referrals || referrals.rows.length === 0 ? (
          <p className="text-[13.5px] text-dash-muted">No referrals in the last 60 days.</p>
        ) : (
          <ul>
            {referrals.rows.map((row) => (
              <li key={row.uuid} className="border-b border-dash-border/70 last:border-b-0">
                <Link href={HP_HREF[row.program] ?? ROUTES.healthProgramsDue} data-testid="oh-home-hp-referral" className="group flex items-center gap-3 py-2.5 focus-visible:outline-none">
                  <span className="min-w-0 flex-1 truncate text-[14px] text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{HP_LABEL[row.program] ?? row.program}</span>
                  {row.outcome ? (
                    <span className={cn("shrink-0 rounded-md px-1.5 py-px text-[11.5px] font-semibold capitalize", row.outcome === "unfit" ? "bg-red-50 text-red-700" : row.outcome === "restricted" ? "bg-amber-50 text-amber-800" : "bg-dash-canvas text-brand-slate")}>
                      {row.outcome === "unfit" ? "Not fit" : row.outcome}
                    </span>
                  ) : null}
                  <span className="w-14 shrink-0 text-right text-[12.5px] text-dash-muted tabular-nums">{shortDate(row.performed_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </ViewSection>
  );
}
