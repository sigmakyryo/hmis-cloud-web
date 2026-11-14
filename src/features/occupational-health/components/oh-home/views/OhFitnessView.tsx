"use client";

import { BadgeCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import {
  OhFitEmployerSection,
  OhFitExpiringSection,
  OhFitTrainingSection,
} from "@/features/occupational-health/components/oh-home/views/OhFitnessSections";
import { ViewGrid } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { useOhHomeSummary } from "@/features/occupational-health/components/oh-home/views/useOhHomeSummary";
import {
  QueryState,
  ViewSection,
} from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import {
  fetchFitBoard,
  type FitOverall,
} from "@/features/occupational-health/services/fitness.service";
import { cn } from "@/lib/utils";

const SEGMENTS: Array<{ key: FitOverall; label: string; className: string }> = [
  { key: "fit", label: "Fit", className: "bg-brand-primary" },
  {
    key: "fit_with_restrictions",
    label: "Restricted",
    className: "bg-amber-500",
  },
  { key: "not_fit", label: "Not fit", className: "bg-red-600" },
  { key: "unknown", label: "Not assessed", className: "bg-dash-border" },
];
const ATTENTION_SHOWN = 6;

/** Fitness: how the workforce splits today, then the people behind the amber and red. */
export function OhFitnessView() {
  const board = useQuery({
    queryKey: ["oh-home", "fit-board"],
    queryFn: () => fetchFitBoard(),
    staleTime: 60_000,
  });
  const home = useOhHomeSummary("fitness");
  const counts = board.data?.counts;
  const total = counts
    ? SEGMENTS.reduce((sum, segment) => sum + (counts[segment.key] ?? 0), 0)
    : 0;
  const attention = (board.data?.results ?? [])
    .filter(
      (row) =>
        row.overall === "not_fit" || row.overall === "fit_with_restrictions",
    )
    .sort(
      (a, b) =>
        Number(b.overall === "not_fit") - Number(a.overall === "not_fit"),
    );

  return (
    <div className="space-y-10" data-testid="oh-home-view-fitness">
      <ViewSection
        title="Fit for work today" icon={BadgeCheck}
        href={ROUTES.fitnessBoard}
        linkLabel="Fitness board"
      >
        <QueryState
          isLoading={board.isLoading}
          isError={board.isError}
          onRetry={() => void board.refetch()}
          rows={2}
        >
          {counts && total > 0 ? (
            <>
              <p className="text-[13.5px] text-dash-muted">
                <span className="font-semibold text-brand-navy tabular-nums">
                  {counts.fit ?? 0}
                </span>{" "}
                of {total} workers are fit for work
                {counts.due_soon
                  ? `, and ${counts.due_soon} have a clearance expiring soon`
                  : ""}
                .
              </p>
              <div
                role="img"
                aria-label={`Fitness: ${SEGMENTS.map((segment) => `${counts[segment.key] ?? 0} ${segment.label.toLowerCase()}`).join(", ")}`}
                className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full"
              >
                {SEGMENTS.filter(
                  (segment) => (counts[segment.key] ?? 0) > 0,
                ).map((segment) => (
                  <span
                    key={segment.key}
                    className={segment.className}
                    style={{ flexGrow: counts[segment.key] }}
                  />
                ))}
              </div>
              <p
                aria-hidden
                className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-dash-muted"
              >
                {SEGMENTS.map((segment) => (
                  <span
                    key={segment.key}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      className={cn("size-2 rounded-full", segment.className)}
                    />
                    {segment.label}{" "}
                    <span className="font-semibold text-brand-navy tabular-nums">
                      {counts[segment.key] ?? 0}
                    </span>
                  </span>
                ))}
              </p>
            </>
          ) : (
            <p className="text-[13.5px] text-dash-muted">
              No workers have a fitness status yet.
            </p>
          )}
        </QueryState>
      </ViewSection>
      <ViewGrid>
        {attention.length > 0 ? (
          <ViewSection
            title="Not fit or restricted" icon={TriangleAlert}
            count={attention.length}
            href={ROUTES.fitnessBoard}
            linkLabel="See all"
          >
            <ul>
              {attention.slice(0, ATTENTION_SHOWN).map((row) => (
                <li
                  key={row.customer_uuid}
                  className="border-b border-dash-border/70 last:border-b-0"
                >
                  <Link
                    href={ROUTES.occupationalHealthEmployee(row.customer_uuid)}
                    data-testid="oh-home-fit-worker"
                    className="group grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 py-2.5 focus-visible:outline-none @xl:grid-cols-[auto_minmax(0,11rem)_minmax(0,1fr)_auto]"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-2 translate-y-[-1px] rounded-full",
                        row.overall === "not_fit"
                          ? "bg-red-600"
                          : "bg-amber-500",
                      )}
                    />
                    <span className="truncate text-[14px] font-medium text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">
                      {row.worker_label}
                    </span>
                    <span className="col-start-2 truncate text-[13px] text-dash-muted @xl:col-start-auto">
                      {row.reason ??
                        (row.overall === "not_fit" ? "Not fit" : "Restricted")}
                    </span>
                    <span className="hidden text-right text-[12.5px] text-dash-muted @xl:block">
                      {row.employer_name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </ViewSection>
        ) : null}
        <OhFitExpiringSection summary={home} />
      </ViewGrid>
      <ViewGrid>
        <OhFitEmployerSection summary={home} />
        <OhFitTrainingSection summary={home} />
      </ViewGrid>
    </div>
  );
}
