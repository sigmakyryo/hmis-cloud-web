"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { CustomerSummaryStats as CustomerSummaryStatsData } from "@/features/customers/utils/customer-stats";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/utils/format-compact-number";

type CustomerSummaryStatsProps = {
  stats: CustomerSummaryStatsData | null;
  isLoading?: boolean;
  /** Noun for the total, such as Clients or Employees. */
  countLabel?: string;
};

function sharePercent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function SummaryFigure({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span
        className={cn(
          "text-[15px] font-semibold tabular-nums leading-none",
          accent ? "text-brand-primary" : "text-brand-navy",
        )}
      >
        {value}
      </span>
      <span className="text-[13px] text-dash-muted">{label}</span>
    </p>
  );
}

function GenderMix({
  male,
  female,
  other,
}: {
  male: number;
  female: number;
  other: number;
}) {
  const total = male + female + other;
  if (total <= 0) {
    return null;
  }

  return (
    <div className="flex min-w-[14rem] flex-1 items-center gap-2.5 sm:ml-auto sm:max-w-sm">
      <span className="shrink-0 text-[12px] tabular-nums text-dash-muted">
        Male {sharePercent(male, total)}%
      </span>
      <div
        className="flex h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-dash-canvas"
        aria-hidden="true"
      >
        <span className="h-full bg-brand-primary" style={{ flexGrow: male }} />
        <span className="h-full bg-brand-navy/20" style={{ flexGrow: female }} />
        {other > 0 ? (
          <span className="h-full bg-dash-border" style={{ flexGrow: other }} />
        ) : null}
      </div>
      <span className="shrink-0 text-[12px] tabular-nums text-dash-muted">
        Female {sharePercent(female, total)}%
      </span>
    </div>
  );
}

export function CustomerSummaryStatsCards({
  stats,
  isLoading = false,
  countLabel = "Clients",
}: CustomerSummaryStatsProps) {
  if (isLoading) {
    return (
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-dash-border px-4 py-3 md:px-6"
        data-testid="customer-summary-stats"
        aria-busy="true"
      >
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-1.5 w-36 sm:ml-auto" />
      </div>
    );
  }

  const totalClients = stats?.totalClients ?? 0;
  const newThisMonth = stats?.newThisMonth ?? 0;
  const monthValue =
    newThisMonth > 0
      ? `+${formatCompactNumber(newThisMonth)}`
      : formatCompactNumber(newThisMonth);

  return (
    <div
      className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-dash-border px-4 py-2.5 md:px-6"
      data-testid="customer-summary-stats"
      role="group"
      aria-label="Client summary"
    >
      <SummaryFigure
        value={formatCompactNumber(totalClients)}
        label={countLabel.toLowerCase()}
      />
      <SummaryFigure value={monthValue} label="this month" accent />
      <SummaryFigure
        value={stats ? `${stats.averageAge} yrs` : "—"}
        label="average age"
      />
      <GenderMix
        male={stats?.maleCount ?? 0}
        female={stats?.femaleCount ?? 0}
        other={stats?.otherCount ?? 0}
      />
    </div>
  );
}

/** @deprecated Use {@link CustomerSummaryStatsCards} */
export const CustomerSummaryStats = CustomerSummaryStatsCards;
