"use client";

import Link from "next/link";
import { Siren } from "lucide-react";

import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  crashPaperworkOutstanding,
  formatMinutes,
  ncepodShortLabel,
} from "@/features/clinical-theatre/utils/theatre-advanced-display";
import {
  paperworkStep,
  type TheatreFlowStepId,
} from "@/features/clinical-theatre/utils/theatre-case-flow";
import { cn } from "@/lib/utils";

type TheatreCrashBannerProps = {
  theatreCase: TheatreCase;
  /** Href of the case-flow step where an outstanding record is completed. */
  stepHref: (step: TheatreFlowStepId) => string;
};

/** Band listing what a crash case still owes (retrospective paperwork). */
export function TheatreCrashBanner({ theatreCase, stepHref }: TheatreCrashBannerProps) {
  if (!theatreCase.is_crash) return null;
  const outstanding = crashPaperworkOutstanding(theatreCase);
  const minutes = theatreCase.paperwork?.decision_to_incision_minutes ?? null;
  return (
    <div
      role="status"
      data-testid="theatre-crash-banner"
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 px-3.5 py-2 text-sm",
        outstanding
          ? "border-rose-500 bg-rose-50/80 text-rose-950"
          : "border-emerald-500 bg-emerald-50/70 text-emerald-950",
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <Siren className="size-4" aria-hidden />
        Emergency crash case
      </span>
      <span className="text-[13px] opacity-90">
        {theatreCase.ncepod_category ? `${ncepodShortLabel(theatreCase.ncepod_category)} · ` : ""}
        Decision to incision: {formatMinutes(minutes)}
        {!outstanding ? " · All paperwork completed" : ""}
      </span>
      {outstanding ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium">Still owed:</span>
          <ul className="flex flex-wrap gap-1.5" data-testid="theatre-crash-outstanding">
            {theatreCase.paperwork.outstanding.map((item) => (
              <li key={item.key}>
                <Link
                  className="inline-flex rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-rose-900 ring-1 ring-rose-200 hover:bg-white"
                  href={stepHref(paperworkStep(item))}
                  scroll={false}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
