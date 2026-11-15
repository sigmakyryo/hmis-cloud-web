"use client";

import { useQuery } from "@tanstack/react-query";

import { exposureKeys, fetchExposureDashboard } from "@/features/exposure-management/services/exposure.service";
import {
  useOhComplianceDashboard,
  useOhEncounters,
} from "@/features/occupational-health/hooks/use-occupational-health";
import { cn } from "@/lib/utils";

/** Where every tracked check stands, as one proportional bar. */
export function OhHomeComplianceBar() {
  const { data } = useOhComplianceDashboard();
  if (!data) {
    return null;
  }
  const total = data.overdue + data.due + data.completed;
  if (total === 0) {
    return null;
  }
  const segments = [
    { key: "overdue", label: "overdue", count: data.overdue, className: "bg-red-600" },
    { key: "due", label: "due", count: data.due, className: "bg-amber-500" },
    { key: "completed", label: "up to date", count: data.completed, className: "bg-brand-primary" },
  ].filter((segment) => segment.count > 0);
  const summary = segments.map((segment) => `${segment.count} ${segment.label}`).join(", ");

  return (
    <div data-testid="oh-home-compliance-bar" className="">
      <div role="img" aria-label={`Compliance: ${summary}`} className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        {segments.map((segment) => (
          <span key={segment.key} className={segment.className} style={{ flexGrow: segment.count }} />
        ))}
      </div>
      <p aria-hidden className="mt-2 flex flex-wrap gap-x-5 text-[12px] text-dash-muted">
        {segments.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", segment.className)} />
            <span className="tabular-nums">{segment.count}</span> {segment.label}
          </span>
        ))}
      </p>
    </div>
  );
}

function CountBadge({ count, label }: { count: number | undefined; label: string }) {
  if (!count) {
    return null;
  }
  return (
    <span
      className="shrink-0 rounded-md bg-dash-canvas px-1.5 py-px text-[11.5px] font-semibold text-brand-slate tabular-nums"
      aria-label={`${count} ${label}`}
    >
      {count}
    </span>
  );
}

export function OhHomeQueueBadge() {
  return <CountBadge count={useOhEncounters().data?.length} label="in the queue" />;
}

export function OhHomeExposureBadge() {
  const dashboard = useQuery({ queryKey: exposureKeys.dashboard, queryFn: fetchExposureDashboard, staleTime: 60_000 });
  return <CountBadge count={dashboard.data?.kpis.open_events} label="open exposure events" />;
}
