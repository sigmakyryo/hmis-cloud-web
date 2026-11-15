"use client";

import { ChartColumn, Package, Syringe } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { ColumnChart, shortDate } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, ShareRow, TodoRow, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeImmunizations } from "@/features/occupational-health/lib/oh-home.types";

type SummaryQuery = { data?: OhHomeImmunizations; isLoading: boolean; isError: boolean; refetch: () => unknown };

function tone(percent: number) {
  return percent < 70 ? "bg-red-600" : percent < 90 ? "bg-amber-500" : "bg-brand-primary";
}

export function OhImmCoverageByVaccine({ summary }: { summary: SummaryQuery }) {
  const rows = summary.data?.coverage_by_vaccine ?? [];
  return (
    <ViewSection title="Coverage by vaccine" icon={Syringe} href={ROUTES.immunizationsCompliance} linkLabel="Compliance">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        {rows.length === 0 ? (
          <p className="text-[13.5px] text-dash-muted">No vaccine schedules are assigned yet.</p>
        ) : (
          <ul>
            {rows.slice(0, 6).map((row) => (
              <ShareRow key={row.code} name={row.name} percent={row.percent} note={`${row.up_to_date} of ${row.people}`} tone={tone(row.percent)} />
            ))}
          </ul>
        )}
      </QueryState>
    </ViewSection>
  );
}

export function OhImmDosesSection({ summary }: { summary: SummaryQuery }) {
  const weeks = summary.data?.doses_by_week ?? [];
  const total = weeks.reduce((sum, week) => sum + week.doses, 0);
  const thisWeek = weeks.at(-1)?.doses ?? 0;
  return (
    <ViewSection title="Doses given, last 8 weeks" icon={ChartColumn} countLabel="doses in 8 weeks" count={summary.data ? total : undefined}>
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        <p className="mb-3 text-[13.5px] text-dash-muted">
          <span className="font-semibold text-brand-navy tabular-nums">{thisWeek}</span> this week, about{" "}
          <span className="font-semibold text-brand-navy tabular-nums">{Math.round(total / Math.max(1, weeks.length))}</span> a week on average.
        </p>
        <ColumnChart
          columns={weeks.map((week) => ({ key: week.week_start, label: shortDate(week.week_start), value: week.doses, title: `Week of ${shortDate(week.week_start)}: ${week.doses} doses` }))}
          summary={`Doses given per week over the last 8 weeks, ${total} in all.`}
          tone="bg-sky-600"
          showValues
        />
      </QueryState>
    </ViewSection>
  );
}

export function OhImmStockSection({ summary }: { summary: SummaryQuery }) {
  const stock = summary.data?.stock;
  return (
    <ViewSection title="Vaccine stock" icon={Package} countLabel="usable lots" count={stock?.lots} href={ROUTES.immunizationsVaccines} linkLabel="Vaccines & lots">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        {stock ? (
          <>
            <ul>
              <TodoRow value={stock.recalled} label="Lots recalled" href={ROUTES.immunizationsVaccines} alert />
              <TodoRow value={stock.quarantined} label="Lots in quarantine" href={ROUTES.immunizationsVaccines} alert />
              <TodoRow value={stock.expiring_60d} label="Lots expiring" hint="60 days" href={ROUTES.immunizationsVaccines} />
              <TodoRow value={stock.low_stock} label="Lots running low" hint="10 doses or fewer" href={ROUTES.immunizationsVaccines} />
            </ul>
            {stock.expiring.length > 0 ? (
              <>
                <p className="mt-4 mb-1 text-[12.5px] font-medium text-dash-muted">Expiring first</p>
                <ul>
                  {stock.expiring.map((lot) => (
                    <li key={lot.uuid} data-testid="oh-home-expiring-lot" className="flex items-baseline gap-3 border-b border-dash-border/70 py-2 text-[13.5px] last:border-b-0">
                      <span className="min-w-0 flex-1 truncate text-brand-navy">{lot.vaccine || "Vaccine"}</span>
                      <span className="shrink-0 font-mono text-[12px] text-dash-muted">{lot.lot_number}</span>
                      <span className="w-16 shrink-0 text-right text-dash-muted tabular-nums">{lot.quantity_on_hand} left</span>
                      <span className="w-14 shrink-0 text-right font-medium text-amber-700 tabular-nums">{shortDate(lot.expiry_date)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : null}
      </QueryState>
    </ViewSection>
  );
}
