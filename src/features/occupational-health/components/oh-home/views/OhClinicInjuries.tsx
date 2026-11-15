"use client";

import Link from "next/link";
import { HardHat } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { shortDate } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeClinic } from "@/features/occupational-health/lib/oh-home.types";
import { cn } from "@/lib/utils";

type SummaryQuery = { data?: OhHomeClinic; isLoading: boolean; isError: boolean; refetch: () => unknown };

const SEVERITY: Record<string, string> = {
  minor: "bg-brand-tint text-brand-primary",
  moderate: "bg-amber-50 text-amber-800",
  serious: "bg-red-50 text-red-700",
  severe: "bg-red-50 text-red-700",
  fatal: "bg-red-700 text-white",
};

/** "under_investigation" → "Under investigation". */
function sentence(value: string): string {
  const text = value.replaceAll("_", " ").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "";
}

/** Days the case has been open, counting the day of injury as day 1. */
function daysOpen(onset: string | null): number | null {
  if (!onset) return null;
  const start = new Date(`${onset.slice(0, 10)}T00:00:00`).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(1, Math.floor((Date.now() - start) / 86_400_000) + 1);
}

function Figure({ value, label, alert = false }: { value: number; label: string; alert?: boolean }) {
  return (
    <span className="text-[13px] text-dash-muted">
      <span className={cn("mr-1 text-[15px] font-semibold tabular-nums", alert && value > 0 ? "text-red-700" : "text-brand-navy")}>{value}</span>
      {label}
    </span>
  );
}

/** Open injury cases: what happened, how bad, and how long each has been open. */
export function OhClinicInjuries({ summary }: { summary: SummaryQuery }) {
  const iod = summary.data?.iod;

  return (
    <ViewSection title="Injuries on duty" icon={HardHat} countLabel="open cases" count={iod?.open} href={ROUTES.occupationalHealthInjuries} linkLabel="All injuries">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        {iod ? (
          <>
            <p className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
              <Figure value={iod.lost_days_open} label="days lost" alert />
              <Figure value={iod.opened_30d} label="reported" />
              <Figure value={iod.closed_30d} label="closed" />
              <span className="text-[12.5px] text-dash-muted/80">in 30 days</span>
            </p>
            {iod.recent.length === 0 ? (
              <p className="border-y border-dash-border/70 py-5 text-[13.5px] text-dash-muted">No open injury cases.</p>
            ) : (
              <ul className="border-t border-dash-border/70">
                {iod.recent.map((item) => {
                  const days = daysOpen(item.onset_date);
                  return (
                    <li key={item.uuid} className="border-b border-dash-border/70 last:border-b-0">
                      <Link
                        href={ROUTES.occupationalHealthRecord("iod", item.uuid)}
                        data-testid="oh-home-iod-case"
                        className="group grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 focus-visible:outline-none"
                      >
                        <span className={cn("justify-self-start rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold", SEVERITY[item.severity] ?? "bg-dash-canvas text-brand-slate")}>
                          {sentence(item.severity) || "Unrated"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{item.body_part || sentence(item.mechanism) || "Details not recorded"}</span>
                          <span className="block truncate text-[12.5px] text-dash-muted">
                            {[item.body_part ? item.mechanism : "", `reported ${shortDate(item.onset_date)}`].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-[13px] font-semibold text-brand-navy tabular-nums">{days ? `Day ${days}` : "—"}</span>
                          <span className="block text-[12px] text-dash-muted">{sentence(item.status)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </QueryState>
    </ViewSection>
  );
}
