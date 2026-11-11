import type { LucideIcon } from "lucide-react";

import type { FitItem, FitSource } from "@/features/occupational-health/services/fitness.service";
import { cn } from "@/lib/utils";
import { SOURCE_LABEL, label } from "./fit-format";
import { FIT_SOURCES, STATUS_TONE, TONE_STROKE, worstStatus } from "./fit-visual";

const SIZE = 112;
const STROKE = 9;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 7;
const SEGMENT = CIRCUMFERENCE / FIT_SOURCES.length;

/** Six arcs, one per source, coloured by that source's worst status; the verdict icon sits in the middle. */
export function FitReadinessRing({
  bySource,
  icon: Icon,
  iconClassName,
}: {
  bySource: Map<FitSource, FitItem[]>;
  icon: LucideIcon;
  iconClassName: string;
}) {
  const segments = FIT_SOURCES.map((source) => {
    const worst = worstStatus(bySource.get(source) ?? []);
    return { source, tone: worst ? STATUS_TONE[worst] : ("none" as const), worst };
  });
  const clear = segments.filter((segment) => segment.tone === "good").length;
  const description = segments
    .map((segment) => `${label(SOURCE_LABEL, segment.source)}: ${segment.worst ?? "not on file"}`)
    .join(", ");

  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={`${clear} of 6 checks clear. ${description}`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        {segments.map((segment, index) => (
          <circle
            key={segment.source}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className={cn("transition-[stroke] duration-500", TONE_STROKE[segment.tone])}
            strokeDasharray={`${SEGMENT - GAP} ${CIRCUMFERENCE}`}
            strokeDashoffset={-index * SEGMENT}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Icon className={cn("size-7", iconClassName)} strokeWidth={1.75} aria-hidden />
        <span className="mt-1 text-[12px] font-semibold tabular-nums text-brand-primary">
          {clear}
          <span className="font-normal text-dash-muted">/6 clear</span>
        </span>
      </div>
    </div>
  );
}
