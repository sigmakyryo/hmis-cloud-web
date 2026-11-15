"use client";

import { UsersRound } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeFitness } from "@/features/occupational-health/lib/oh-home.types";
import type { FitBoard } from "@/features/occupational-health/services/fitness.service";
import { cn } from "@/lib/utils";

const STATES = [
  { key: "fit", label: "Fit", dot: "bg-emerald-600" },
  { key: "restricted", label: "Restricted", dot: "bg-amber-500" },
  { key: "not_fit", label: "Not fit", dot: "bg-red-600" },
  { key: "unknown", label: "Not assessed", dot: "bg-dash-border" },
] as const;
/** Most dots a single employer row draws before one dot stands for several workers. */
const MAX_DOTS = 140;

type Employer = OhHomeFitness["by_employer"][number];

function Dots({ employer, perDot }: { employer: Employer; perDot: number }) {
  const dots = STATES.flatMap((state) => Array.from({ length: Math.ceil(employer[state.key] / perDot) }, (_, i) => ({ key: `${state.key}-${i}`, dot: state.dot })));
  return (
    <div
      role="img"
      aria-label={`${employer.employer}: ${STATES.map((state) => `${employer[state.key]} ${state.label.toLowerCase()}`).join(", ")}`}
      className="flex flex-wrap gap-[3px]"
    >
      {dots.map((item) => (
        <span key={item.key} className={cn("size-2 rounded-full", item.dot)} />
      ))}
    </div>
  );
}

/** Roll call: every worker as a dot, grouped by employer, coloured by whether they can work today. */
export function OhFitRollCall({
  board,
  employers,
  isLoading,
  isError,
  onRetry,
}: {
  board?: FitBoard;
  employers: Employer[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const counts = board?.counts;
  const total = counts ? (counts.fit ?? 0) + (counts.fit_with_restrictions ?? 0) + (counts.not_fit ?? 0) + (counts.unknown ?? 0) : 0;
  const perDot = Math.max(1, Math.ceil(Math.max(0, ...employers.map((row) => row.workers)) / MAX_DOTS));

  return (
    <ViewSection title="Roll call" icon={UsersRound} href={ROUTES.fitnessBoard} linkLabel="Fitness board" testId="oh-home-fit-rollcall">
      <QueryState isLoading={isLoading} isError={isError} onRetry={onRetry} rows={4}>
        {counts && total > 0 ? (
          <div className="border-t border-dash-border/70 pt-4">
            <p className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <span className="text-[13.5px] text-dash-muted">
                <span className="mr-1 text-[28px] leading-none font-semibold tracking-tight text-brand-navy tabular-nums">{counts.fit ?? 0}</span>
                of {total} can work without limits today
              </span>
              {counts.due_soon ? <span className="text-[13px] font-medium text-amber-700">{counts.due_soon} clearances expire soon</span> : null}
            </p>
            <p aria-hidden className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-dash-muted">
              {STATES.map((state) => (
                <span key={state.key} className="inline-flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", state.dot)} />
                  {state.label}{" "}
                  <span className="font-semibold text-brand-navy tabular-nums">
                    {state.key === "restricted" ? counts.fit_with_restrictions ?? 0 : counts[state.key] ?? 0}
                  </span>
                </span>
              ))}
              {perDot > 1 ? <span>· one dot is {perDot} workers</span> : null}
            </p>
            {employers.length > 0 ? (
              <ul className="mt-5 space-y-4">
                {employers.map((employer) => (
                  <li key={employer.employer} data-testid="oh-home-fit-employer" className="grid gap-x-6 gap-y-2 @2xl:grid-cols-[11rem_minmax(0,1fr)]">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] text-brand-navy">{employer.employer}</span>
                      <span className="block text-[12px] text-dash-muted tabular-nums">
                        {Math.round((employer.fit / Math.max(1, employer.workers)) * 100)}% fit · {employer.workers}
                      </span>
                    </span>
                    <Dots employer={employer} perDot={perDot} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="border-y border-dash-border/70 py-5 text-[13.5px] text-dash-muted">No workers have a fitness status yet.</p>
        )}
      </QueryState>
    </ViewSection>
  );
}
