"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeFitness } from "@/features/occupational-health/lib/oh-home.types";

type SummaryQuery = { data?: OhHomeFitness; isLoading: boolean; isError: boolean; refetch: () => unknown };

/** Training certificates running out in the next 30 days, course by course. */
export function OhFitTraining({ summary }: { summary: SummaryQuery }) {
  const training = summary.data?.training_expiring;
  const max = Math.max(1, ...(training?.by_course ?? []).map((row) => row.count));

  return (
    <ViewSection title="Training running out" icon={GraduationCap} count={training?.count} countLabel="in 30 days" href={ROUTES.fitnessTraining} linkLabel="Training" testId="oh-home-fit-training">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={3}>
        {!training || training.by_course.length === 0 ? (
          <p className="border-y border-dash-border/70 py-5 text-[13.5px] text-dash-muted">No training runs out in the next 30 days.</p>
        ) : (
          <ul className="border-t border-dash-border/70">
            {training.by_course.map((row) => (
              <li key={row.course} className="border-b border-dash-border/70 last:border-b-0">
                <Link href={ROUTES.fitnessTraining} data-testid="oh-home-fit-course" className="group grid grid-cols-[minmax(0,1fr)_6rem_2rem] items-center gap-3 py-2.5 focus-visible:outline-none">
                  <span className="truncate text-[13.5px] text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{row.course}</span>
                  <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-dash-canvas">
                    <span className="block h-full rounded-full bg-emerald-600" style={{ width: `${(row.count / max) * 100}%` }} />
                  </span>
                  <span className="text-right text-[13.5px] font-semibold text-brand-navy tabular-nums">{row.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </ViewSection>
  );
}
