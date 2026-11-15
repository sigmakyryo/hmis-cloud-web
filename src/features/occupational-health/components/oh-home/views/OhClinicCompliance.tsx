"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeClinic } from "@/features/occupational-health/lib/oh-home.types";
import type { OhComplianceDashboard } from "@/features/occupational-health/types";
import { cn } from "@/lib/utils";

type Item = { value: number; label: string; alert?: boolean };
type Lane = { key: string; heading: string; track: string; items: Item[] };

function RunwayItem({ item }: { item: Item }) {
  const muted = item.value === 0;
  return (
    <Link href={ROUTES.occupationalHealthCompliance} data-testid="oh-home-runway-item" className="group flex items-baseline gap-1 py-1 focus-visible:outline-none">
      <span className={cn("w-10 shrink-0 text-[22px] leading-7 font-semibold tracking-tight tabular-nums", muted ? "text-dash-muted/70" : item.alert ? "text-red-700" : "text-brand-navy")}>
        {item.value}
      </span>
      <span className={cn("text-[13.5px] group-hover:text-brand-primary group-focus-visible:underline", muted ? "text-dash-muted" : "text-brand-slate")}>{item.label}</span>
    </Link>
  );
}

/**
 * Compliance as a runway: what has slipped behind, what is due today, and what lands in the next 30 days.
 * Checks and certificates sit in the same lane so the picture reads left to right as time.
 */
export function OhClinicCompliance({
  counts,
  certificates,
  isLoading,
  isError,
  onRetry,
}: {
  counts?: OhComplianceDashboard | null;
  certificates?: OhHomeClinic["certificates"];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const lanes: Lane[] = counts
    ? [
        {
          key: "behind",
          heading: "Behind",
          track: "bg-red-600",
          items: [
            { value: counts.overdue, label: "checks overdue", alert: true },
            ...(certificates ? [{ value: certificates.expired_30d, label: "certificates lapsed", alert: true }] : []),
          ],
        },
        { key: "now", heading: "Due now", track: "bg-amber-500", items: [{ value: counts.due, label: "checks due" }] },
        {
          key: "next",
          heading: "Next 30 days",
          track: "bg-brand-primary/35",
          items: [
            { value: counts.due_within_30_days ?? 0, label: "checks coming due" },
            ...(certificates ? [{ value: certificates.expiring_30d, label: "certificates expiring" }] : []),
          ],
        },
      ]
    : [];
  const tracked = counts ? counts.completed + counts.due + counts.overdue : 0;
  const share = tracked > 0 && counts ? Math.round((counts.completed / tracked) * 100) : null;

  return (
    <ViewSection title="Compliance" icon={ShieldCheck} count={share ?? undefined} countLabel="% of checks up to date" href={ROUTES.occupationalHealthCompliance} linkLabel="Compliance" testId="oh-home-compliance">
      <QueryState isLoading={isLoading} isError={isError || (!isLoading && !counts)} onRetry={onRetry} rows={3}>
        {counts ? (
          <>
            <div className="grid gap-y-6 @xl:grid-cols-3 @xl:gap-x-1">
              {lanes.map((lane) => (
                <div key={lane.key} data-testid={`oh-home-runway-${lane.key}`} className="min-w-0">
                  <p className="mb-2 flex items-center gap-2 text-[12.5px] font-medium text-dash-muted">
                    {lane.heading}
                    {lane.key === "now" ? <span className="rounded bg-brand-navy px-1.5 text-[10.5px] font-semibold tracking-wide text-white">TODAY</span> : null}
                  </p>
                  <div aria-hidden className={cn("relative mb-3 h-1.5 rounded-full", lane.track)}>
                    {lane.key === "now" ? <span className="absolute top-1/2 -left-1 size-3 -translate-y-1/2 rounded-full border-2 border-white bg-brand-navy" /> : null}
                  </div>
                  <div className="@xl:pr-6">
                    {lane.items.map((item) => (
                      <RunwayItem key={item.label} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-dash-border/70 pt-3 text-[13px] text-dash-muted">
              <span className="font-semibold text-brand-navy tabular-nums">{counts.completed}</span> of {tracked} checks up to date
              {counts.fitness_validity_alerts ? ` · ${counts.fitness_validity_alerts} fitness alerts` : ""}
            </p>
          </>
        ) : null}
      </QueryState>
    </ViewSection>
  );
}
