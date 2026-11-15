"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import { OhFitBlockers } from "@/features/occupational-health/components/oh-home/views/OhFitBlockers";
import { OhFitTraining } from "@/features/occupational-health/components/oh-home/views/OhFitTraining";
import { OhFitOutlook } from "@/features/occupational-health/components/oh-home/views/OhFitOutlook";
import { OhFitRollCall } from "@/features/occupational-health/components/oh-home/views/OhFitRollCall";
import { ViewGrid } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import { useOhHomeSummary } from "@/features/occupational-health/components/oh-home/views/useOhHomeSummary";
import { fetchFitBoard } from "@/features/occupational-health/services/fitness.service";
import { cn } from "@/lib/utils";

const OFF_SHOWN = 6;

/** Fitness: who can work today, what keeps the rest off, and whose clearance runs out next. */
export function OhFitnessView() {
  const board = useQuery({ queryKey: ["oh-home", "fit-board"], queryFn: () => fetchFitBoard(), staleTime: 60_000 });
  const home = useOhHomeSummary("fitness");
  const off = (board.data?.results ?? [])
    .filter((row) => row.overall === "not_fit" || row.overall === "fit_with_restrictions")
    .sort((a, b) => Number(b.overall === "not_fit") - Number(a.overall === "not_fit"));

  return (
    <div className="space-y-10" data-testid="oh-home-view-fitness">
      <OhFitRollCall
        board={board.data}
        employers={home.data?.by_employer ?? []}
        isLoading={board.isLoading}
        isError={board.isError}
        onRetry={() => void board.refetch()}
      />
      <ViewGrid>
        <OhFitBlockers summary={home} />
        <ViewSection title="Not fit or restricted" icon={TriangleAlert} count={board.isSuccess ? off.length : undefined} countLabel="workers" href={ROUTES.fitnessBoard} linkLabel="See all">
          <QueryState isLoading={board.isLoading} isError={board.isError} onRetry={() => void board.refetch()} rows={4}>
            {off.length === 0 ? (
              <p className="border-y border-dash-border/70 py-5 text-[13.5px] text-dash-muted">Everyone assessed is fit for full duty.</p>
            ) : (
              <ul className="border-t border-dash-border/70">
                {off.slice(0, OFF_SHOWN).map((row) => (
                  <li key={row.customer_uuid} className="border-b border-dash-border/70 last:border-b-0">
                    <Link href={ROUTES.occupationalHealthEmployee(row.customer_uuid)} data-testid="oh-home-fit-worker" className="group flex items-start gap-3 py-2.5 focus-visible:outline-none">
                      <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", row.overall === "not_fit" ? "bg-red-600" : "bg-amber-500")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{row.worker_label}</span>
                        <span className="block truncate text-[12.5px] text-dash-muted">{row.reason ?? (row.overall === "not_fit" ? "Not fit" : "Restricted")}</span>
                      </span>
                      <span className="shrink-0 text-[12px] text-dash-muted">{row.employer_name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </ViewSection>
      </ViewGrid>
      <ViewGrid>
        <OhFitOutlook summary={home} />
        <OhFitTraining summary={home} />
      </ViewGrid>
    </div>
  );
}
