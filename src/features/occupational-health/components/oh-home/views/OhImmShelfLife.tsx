"use client";

import { Snowflake } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { shortDate } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeImmunizations } from "@/features/occupational-health/lib/oh-home.types";
import { cn } from "@/lib/utils";

type SummaryQuery = { data?: OhHomeImmunizations; isLoading: boolean; isError: boolean; refetch: () => unknown };

function barTone(daysLeft: number) {
  if (daysLeft <= 30) return "bg-red-500";
  if (daysLeft <= 60) return "bg-amber-500";
  return "bg-sky-500";
}

/**
 * Shelf life: one bar per lot from today to its expiry, so the lot to use first is the shortest bar.
 * Stock problems that block use (recalled, quarantined, running low) sit above it.
 */
export function OhImmShelfLife({ summary }: { summary: SummaryQuery }) {
  const stock = summary.data?.stock;
  const timeline = summary.data?.lots_timeline;
  const window = timeline?.window_days ?? 120;
  const alerts = stock
    ? [
        { label: "recalled", value: stock.recalled, tone: "bg-red-50 text-red-700" },
        { label: "in quarantine", value: stock.quarantined, tone: "bg-red-50 text-red-700" },
        { label: "running low", value: stock.low_stock, tone: "bg-amber-50 text-amber-800" },
      ].filter((alert) => alert.value > 0)
    : [];

  return (
    <ViewSection title="Shelf life" icon={Snowflake} count={stock?.lots} countLabel="usable lots" href={ROUTES.immunizationsVaccines} linkLabel="Vaccines & lots" testId="oh-home-imm-shelf">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        <div className="border-t border-dash-border/70 pt-3">
          {alerts.length > 0 ? (
            <p className="mb-3 flex flex-wrap gap-2">
              {alerts.map((alert) => (
                <span key={alert.label} className={cn("rounded-md px-2 py-0.5 text-[12px] font-semibold", alert.tone)}>
                  {alert.value} {alert.value === 1 ? "lot" : "lots"} {alert.label}
                </span>
              ))}
            </p>
          ) : null}
          {!timeline || timeline.lots.length === 0 ? (
            <p className="py-3 text-[13.5px] text-dash-muted">No usable lot expires in the next {window} days.</p>
          ) : (
            <>
              <div aria-hidden className="mb-1 grid grid-cols-[8rem_minmax(0,1fr)_4.5rem] gap-3 text-[11px] text-dash-muted">
                <span />
                <span className="flex justify-between">
                  <span>Today</span>
                  <span>{Math.round(window / 2)} days</span>
                  <span>{window} days</span>
                </span>
                <span />
              </div>
              <ul className="space-y-2.5">
                {timeline.lots.map((lot) => (
                  <li
                    key={lot.uuid}
                    data-testid="oh-home-imm-lot"
                    title={`${lot.vaccine} ${lot.lot_number}: expires ${shortDate(lot.expiry_date)}, ${lot.quantity_on_hand} doses left`}
                    className="grid grid-cols-[8rem_minmax(0,1fr)_4.5rem] items-center gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-brand-navy">{lot.vaccine || "Vaccine"}</span>
                      <span className="block truncate font-mono text-[11px] text-dash-muted">{lot.lot_number}</span>
                    </span>
                    <span aria-hidden className="relative h-2.5 rounded-full bg-dash-canvas">
                      <span
                        className={cn("absolute inset-y-0 left-0 rounded-full", barTone(lot.days_left))}
                        style={{ width: `${Math.max(3, Math.min(100, (lot.days_left / window) * 100))}%` }}
                      />
                    </span>
                    <span className="text-right">
                      <span className={cn("block text-[13px] font-semibold tabular-nums", lot.days_left <= 30 ? "text-red-700" : lot.days_left <= 60 ? "text-amber-700" : "text-brand-navy")}>
                        {lot.days_left} days
                      </span>
                      <span className="block text-[11.5px] text-dash-muted tabular-nums">{lot.quantity_on_hand} doses</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </QueryState>
    </ViewSection>
  );
}
