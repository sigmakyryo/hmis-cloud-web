import type { TheatreCaseStatus } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  THEATRE_STAGES,
  theatreStageForStatus,
} from "@/features/clinical-theatre/utils/theatre-workflow";
import { cn } from "@/lib/utils";

/** Slim Scheduled → Pre-op → In theatre → Recovery → Done progress bar. */
export function TheatreCaseStepper({ status }: { status: TheatreCaseStatus }) {
  const current = theatreStageForStatus(status);
  const currentIndex = THEATRE_STAGES.findIndex((stage) => stage.id === current);
  const stopped = status === "cancelled" || status === "postponed";

  return (
    <ol
      className="grid w-full grid-cols-5 gap-1.5 text-[11px]"
      aria-label="Theatre case progress"
      data-testid="theatre-case-stepper"
    >
      {THEATRE_STAGES.map((stage, index) => {
        const done = index < currentIndex || (current === "done" && index === currentIndex);
        const active = index === currentIndex && !done;
        return (
          <li
            key={stage.id}
            className="min-w-0"
            aria-current={active ? "step" : undefined}
            data-state={done ? "done" : active ? "active" : "todo"}
          >
            <span
              aria-hidden
              className={cn(
                "block h-1 rounded-full",
                done && "bg-emerald-500",
                active && (stopped ? "bg-amber-400" : "bg-brand-primary"),
                !done && !active && "bg-dash-border/80",
              )}
            />
            <span
              className={cn(
                "mt-1 block truncate font-medium",
                done && "text-emerald-700",
                active && (stopped ? "text-amber-700" : "text-brand-navy"),
                !done && !active && "text-brand-muted",
              )}
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
