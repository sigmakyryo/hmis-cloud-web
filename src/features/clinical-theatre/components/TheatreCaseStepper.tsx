"use client";

import { Check } from "lucide-react";

import type { TheatreCaseStatus } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  THEATRE_STAGES,
  theatreStageForStatus,
} from "@/features/clinical-theatre/utils/theatre-workflow";
import { cn } from "@/lib/utils";

/** Scheduled → Pre-op → In theatre → Recovery → Done. */
export function TheatreCaseStepper({ status }: { status: TheatreCaseStatus }) {
  const current = theatreStageForStatus(status);
  const currentIndex = THEATRE_STAGES.findIndex((stage) => stage.id === current);
  const stopped = status === "cancelled" || status === "postponed";

  return (
    <ol
      className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs"
      aria-label="Theatre case progress"
      data-testid="theatre-case-stepper"
    >
      {THEATRE_STAGES.map((stage, index) => {
        const done = index < currentIndex || (current === "done" && index === currentIndex);
        const active = index === currentIndex && !done;
        return (
          <li key={stage.id} className="flex items-center gap-1">
            <span
              aria-current={active ? "step" : undefined}
              data-state={done ? "done" : active ? "active" : "todo"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                done && "bg-emerald-50 text-emerald-700",
                active &&
                  (stopped
                    ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                    : "bg-brand-primary text-white"),
                !done && !active && "bg-slate-100 text-brand-muted",
              )}
            >
              {done ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
              {stage.label}
            </span>
            {index < THEATRE_STAGES.length - 1 ? (
              <span className="h-px w-3 bg-slate-200" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
