"use client";

import { Ban, FlaskConical, GraduationCap, HeartPulse, ShieldHalf, Stethoscope, Syringe, type LucideIcon } from "lucide-react";
import { createElement } from "react";

import { ROUTES } from "@/constants/routes";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeFitness } from "@/features/occupational-health/lib/oh-home.types";
import { cn } from "@/lib/utils";

type SummaryQuery = { data?: OhHomeFitness; isLoading: boolean; isError: boolean; refetch: () => unknown };

const SOURCE: Record<string, { label: string; icon: LucideIcon }> = {
  medical: { label: "Medical", icon: Stethoscope },
  immunisation: { label: "Immunisation", icon: Syringe },
  drug_alcohol: { label: "Drug & alcohol", icon: FlaskConical },
  fit_test: { label: "Mask fit test", icon: ShieldHalf },
  training: { label: "Training", icon: GraduationCap },
  programme: { label: "Health programmes", icon: HeartPulse },
};

/** What keeps people from full duty, by where the reason comes from. Red is not fit, amber is restricted. */
export function OhFitBlockers({ summary }: { summary: SummaryQuery }) {
  const rows = summary.data?.blockers_by_source ?? [];
  const max = Math.max(1, ...rows.map((row) => row.workers));
  const anyone = rows.some((row) => row.workers > 0);

  return (
    <ViewSection title="What keeps people off" icon={Ban} href={ROUTES.fitnessBoard} linkLabel="Board" testId="oh-home-fit-blockers">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        {!anyone ? (
          <p className="border-y border-dash-border/70 py-5 text-[13.5px] text-dash-muted">Nobody is held back from full duty.</p>
        ) : (
          <ul className="border-t border-dash-border/70 pt-2">
            {rows.map((row) => {
              const meta = SOURCE[row.source] ?? { label: row.source, icon: Ban };
              return (
                <li key={row.source} data-testid="oh-home-fit-blocker" className={cn("grid grid-cols-[1.25rem_minmax(0,8rem)_minmax(2.5rem,1fr)_auto] items-center gap-x-3 py-2", row.workers === 0 && "opacity-50")}>
                  {createElement(meta.icon, { className: "size-4 text-emerald-700", "aria-hidden": true })}
                  <span className="truncate text-[13.5px] text-brand-navy">{meta.label}</span>
                  <span aria-hidden className="flex h-2 overflow-hidden rounded-full bg-dash-canvas">
                    <span className="bg-red-600" style={{ width: `${(row.not_fit / max) * 100}%` }} />
                    <span className="bg-amber-500" style={{ width: `${(row.restricted / max) * 100}%` }} />
                  </span>
                  <span className="w-[9rem] text-right text-[12.5px] whitespace-nowrap text-dash-muted tabular-nums">
                    {row.workers === 0 ? (
                      "none"
                    ) : (
                      <>
                        {row.not_fit > 0 ? <span className="font-semibold text-red-700">{row.not_fit} not fit</span> : null}
                        {row.not_fit > 0 && row.restricted > 0 ? " · " : null}
                        {row.restricted > 0 ? <span className="font-semibold text-amber-700">{row.restricted} restricted</span> : null}
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </ViewSection>
  );
}
