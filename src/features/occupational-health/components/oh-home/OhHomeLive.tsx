"use client";

import { useQuery } from "@tanstack/react-query";

import { exposureKeys, fetchExposureDashboard } from "@/features/exposure-management/services/exposure.service";
import { useOhEncounters } from "@/features/occupational-health/hooks/use-occupational-health";

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
