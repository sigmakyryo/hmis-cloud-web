"use client";

import { Grid3x3, Siren } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import { SeverityBadge } from "@/features/exposure-management/components/ExposureBadges";
import { ExposureHeatmap } from "@/features/exposure-management/components/ExposureHeatmap";
import {
  exposureKeys,
  fetchExposureDashboard,
} from "@/features/exposure-management/services/exposure.service";
import {
  OhExpBiologicalSection,
  OhExpControlsSection,
  OhExpResultsSection,
  OhExpSamplingSection,
} from "@/features/occupational-health/components/oh-home/views/OhExposureSections";
import { ViewGrid } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { useOhHomeSummary } from "@/features/occupational-health/components/oh-home/views/useOhHomeSummary";
import {
  QueryState,
  ViewSection,
} from "@/features/occupational-health/components/oh-home/views/OhViewParts";

const EVENTS_SHOWN = 5;

/** Exposure management: open overexposure events, then where each group stands against each agent. */
export function OhExposureView() {
  const dashboard = useQuery({
    queryKey: exposureKeys.dashboard,
    queryFn: fetchExposureDashboard,
    staleTime: 60_000,
  });
  const home = useOhHomeSummary("exposure-management");
  const data = dashboard.data;
  const open = (data?.events ?? []).filter(
    (event) => event.status !== "closed",
  );

  return (
    <div className="space-y-10" data-testid="oh-home-view-exposure-management">
      <ViewSection
        title="Open events" icon={Siren} countLabel="open now"
        count={dashboard.isSuccess ? open.length : undefined}
        href={ROUTES.exposureManagementEvents}
        linkLabel="All events"
      >
        <QueryState
          isLoading={dashboard.isLoading}
          isError={dashboard.isError}
          onRetry={() => void dashboard.refetch()}
          rows={2}
        >
          {open.length === 0 ? (
            <p className="rounded-xl border border-dashed border-dash-border px-4 py-6 text-[13.5px] text-dash-muted">
              No open overexposure events.
            </p>
          ) : (
            <ul>
              {open.slice(0, EVENTS_SHOWN).map((event) => (
                <li
                  key={event.uuid}
                  className="border-b border-dash-border/70 last:border-b-0"
                >
                  <Link
                    href={`${ROUTES.exposureManagementEvents}?event=${event.uuid}`}
                    data-testid="oh-home-exposure-event"
                    className="group flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 focus-visible:outline-none"
                  >
                    <span className="w-28 shrink-0">
                      <SeverityBadge severity={event.severity} />
                    </span>
                    <span className="text-[14px] font-medium text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">
                      {event.agent_name ?? "Exposure event"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-dash-muted">
                      {event.group_name ?? event.summary}
                    </span>
                    {event.overdue ? (
                      <span className="shrink-0 text-[12.5px] font-medium text-red-700">
                        Overdue
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </ViewSection>
      <ViewSection
        title="Exposure by group" icon={Grid3x3}
        href={ROUTES.exposureManagement}
        linkLabel="Overview"
      >
        <QueryState
          isLoading={dashboard.isLoading}
          isError={dashboard.isError}
          onRetry={() => void dashboard.refetch()}
          rows={3}
        >
          {data && data.groups.length > 0 && data.agents.length > 0 ? (
            <div className="overflow-x-auto [&>div]:border-b-0 [&>div]:px-0 [&>div]:py-0">
              <ExposureHeatmap dashboard={data} />
            </div>
          ) : (
            <p className="text-[13.5px] text-dash-muted">
              No exposure groups or agents are set up yet.
            </p>
          )}
        </QueryState>
      </ViewSection>
      <ViewGrid>
        <OhExpResultsSection summary={home} />
        <OhExpControlsSection summary={home} />
      </ViewGrid>
      <ViewGrid>
        <OhExpSamplingSection dashboard={data} />
        <OhExpBiologicalSection dashboard={data} />
      </ViewGrid>
    </div>
  );
}
