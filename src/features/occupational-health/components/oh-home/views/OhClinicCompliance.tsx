"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeClinic } from "@/features/occupational-health/lib/oh-home.types";
import type { OhComplianceDashboard } from "@/features/occupational-health/types";
import { cn } from "@/lib/utils";

type Item = { value: number; label: string };
type Lane = { key: string; heading: string; rule: string; tone: string; items: Item[] };

/**
 * Compliance in three short lanes read top to bottom as time: behind, due today, next 30 days.
 * A lane only takes its colour when something is in it, and with nothing tracked it says so plainly.
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
          rule: "border-red-600",
          tone: "text-red-700",
          items: [{ value: counts.overdue, label: "checks overdue" }, ...(certificates ? [{ value: certificates.expired_30d, label: "certificates lapsed" }] : [])],
        },
        { key: "now", heading: "Due today", rule: "border-amber-500", tone: "text-amber-700", items: [{ value: counts.due, label: "checks due" }] },
        {
          key: "next",
          heading: "Next 30 days",
          rule: "border-brand-primary",
          tone: "text-brand-navy",
          items: [
            { value: counts.due_within_30_days ?? 0, label: "checks coming due" },
            ...(certificates ? [{ value: certificates.expiring_30d, label: "certificates expiring" }] : []),
          ],
        },
      ]
    : [];
  const tracked = counts ? counts.completed + counts.due + counts.overdue : 0;
  const nothingAhead = lanes.every((lane) => lane.items.every((item) => item.value === 0));
  const share = tracked > 0 && counts ? Math.round((counts.completed / tracked) * 100) : undefined;

  return (
    <ViewSection title="Compliance" icon={ShieldCheck} href={ROUTES.occupationalHealthCompliance} linkLabel="Compliance" testId="oh-home-compliance">
      <QueryState isLoading={isLoading} isError={isError || (!isLoading && !counts)} onRetry={onRetry} rows={3}>
        {counts && tracked === 0 && nothingAhead ? (
          <p className="border-y border-dash-border/70 py-5 text-[13.5px] text-dash-muted" data-testid="oh-home-compliance-empty">
            No checks are scheduled yet. They appear here once employees have exam rules for their job or hazards.
          </p>
        ) : counts ? (
          <>
            <ul className="border-t border-dash-border/70">
              {lanes.map((lane) => {
                const active = lane.items.some((item) => item.value > 0);
                return (
                  <li key={lane.key} data-testid={`oh-home-runway-${lane.key}`} className="border-b border-dash-border/70">
                    <Link
                      href={ROUTES.occupationalHealthCompliance}
                      data-testid="oh-home-runway-item"
                      className={cn("group flex items-start gap-4 border-l-[3px] py-3 pl-3 focus-visible:outline-none", active ? lane.rule : "border-dash-border")}
                    >
                      <span className="w-24 shrink-0 pt-0.5 text-[12.5px] font-medium text-dash-muted">{lane.heading}</span>
                      <span className="min-w-0 flex-1 space-y-0.5">
                        {lane.items.map((item) => (
                          <span key={item.label} className="flex items-baseline gap-2 text-[13.5px] text-brand-slate group-hover:text-brand-primary">
                            <span className={cn("w-7 shrink-0 text-right text-[15px] font-semibold tabular-nums", item.value > 0 ? lane.tone : "text-dash-muted/60")}>{item.value}</span>
                            <span className={item.value > 0 ? "" : "text-dash-muted"}>{item.label}</span>
                          </span>
                        ))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {tracked > 0 ? (
              <p className="mt-2.5 text-[12.5px] text-dash-muted">
                <span className="font-semibold text-brand-navy tabular-nums">{counts.completed}</span> of {tracked} checks up to date ({share}%)
                {counts.fitness_validity_alerts ? ` · ${counts.fitness_validity_alerts} fitness alerts` : ""}
              </p>
            ) : null}
          </>
        ) : null}
      </QueryState>
    </ViewSection>
  );
}
