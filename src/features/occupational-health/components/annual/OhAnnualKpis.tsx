import { ArrowDownRight, ArrowUpRight, BadgeCheck, BedDouble, CalendarX2, ClipboardCheck, FlaskConical, HardHat, Minus, Stethoscope, Users, type LucideIcon } from "lucide-react";

import { describeChange, type AnnualChange, type AnnualFigureKey } from "@/features/occupational-health/components/annual/annual-changes";
import { toNumber } from "@/features/occupational-health/components/annual/annual-utils";
import { cn } from "@/lib/utils";

const ICON: Record<AnnualFigureKey, LucideIcon> = {
  workers: Users,
  examinations: Stethoscope,
  certificates: BadgeCheck,
  surveillance_completion: ClipboardCheck,
  iod_cases: HardHat,
  days_lost: CalendarX2,
  sick_leave_days: BedDouble,
  da_tests: FlaskConical,
};

/** One line under each card title saying what the figure counts. */
const SUBTITLE: Record<AnnualFigureKey, string> = {
  workers: "Workers on file during the period",
  examinations: "Medical examinations carried out",
  certificates: "Fitness certificates signed",
  surveillance_completion: "Share of due surveillance completed",
  iod_cases: "Injury on duty cases reported",
  days_lost: "Working days lost to injury",
  sick_leave_days: "Days covered by sick-leave certificates",
  da_tests: "Drug and alcohol tests collected",
};

type Point = { year: string; value: number | null };

const W = 96;
const H = 32;
const PAD = 4;

/**
 * A thin line through the recent years ending in a dot for this period. A hidden year ("<5") breaks the
 * line instead of being drawn as a value; fewer than two known years, or all zeros, draws nothing.
 */
function Trace({ points, label, active }: { points: Point[]; label: string; active: boolean }) {
  const known = points.flatMap((p) => (p.value === null ? [] : [p.value]));
  const top = Math.max(0, ...known);
  if (known.length < 2 || top === 0) return <span className="block h-8 w-24" aria-hidden />;
  // Why: the line shows shape only (exact values sit in the table), so it spans the lowest to the highest year.
  const bottom = Math.min(...known);
  const span = Math.max(1, top - bottom);
  const x = (i: number) => PAD + (i / Math.max(1, points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - bottom) / span) * (H - PAD * 2);
  const runs: string[][] = [];
  let run: string[] = [];
  points.forEach((p, i) => {
    if (p.value === null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push(`${x(i).toFixed(1)},${y(p.value).toFixed(1)}`);
  });
  if (run.length) runs.push(run);
  const last = points.length - 1;
  const lastValue = points[last].value;

  return (
    <svg role="img" aria-label={`${label}: ${points.map((p) => `${p.year} ${p.value === null ? "hidden" : p.value}`).join(", ")}`} viewBox={`0 0 ${W} ${H}`} className="block h-8 w-24 overflow-visible">
      {runs.map((segment) => (
        <polyline key={segment[0]} points={segment.join(" ")} fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={active ? "stroke-brand-primary" : "stroke-brand-navy/30"} />
      ))}
      {lastValue !== null ? <circle cx={x(last)} cy={y(lastValue)} r="3" className={active ? "fill-brand-primary" : "fill-brand-navy/70"} /> : null}
    </svg>
  );
}

function Delta({ change, compareYear }: { change: AnnualChange; compareYear: number }) {
  const { delta, good, relative, figure } = change;
  if (delta === null) return null;
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = good === null ? "text-brand-slate" : good ? "text-brand-primary" : "text-red-700";
  return (
    <span className="flex items-center gap-1.5 text-[12px]">
      <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums", good === null ? "bg-dash-canvas" : good ? "bg-brand-tint" : "bg-red-50", tone)}>
        <Icon className="size-3" aria-hidden />
        <span className={tone}>
          {delta > 0 ? `+${delta}` : delta}
          {figure.percent ? " pts" : ""}
        </span>
      </span>
      <span className="text-dash-muted tabular-nums">
        {relative !== null && !figure.percent ? `${relative > 0 ? "+" : ""}${relative}% ` : ""}on {compareYear}
      </span>
    </span>
  );
}

/**
 * The eight headline figures as cards: title and what it counts, an icon, the value, its change on the
 * year before, a line of recent years, and the change in a sentence. Choosing one charts it below.
 */
export function OhAnnualKpis({
  changes,
  earlier,
  currentLabel,
  compareYear,
  selected,
  onSelect,
}: {
  changes: AnnualChange[];
  earlier: Array<{ year: number } & Partial<Record<AnnualFigureKey, number | string | null>>>;
  currentLabel: string;
  compareYear: number | null;
  selected: AnnualFigureKey;
  onSelect: (key: AnnualFigureKey) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-4" role="group" aria-label="Headline figures">
      {changes.map((change) => {
        const { figure, current } = change;
        const active = figure.key === selected;
        const value = toNumber(current);
        const Icon = ICON[figure.key];
        return (
          <button
            key={figure.key}
            type="button"
            data-testid={`oh-annual-kpi-${figure.key}`}
            aria-pressed={active}
            onClick={() => onSelect(figure.key)}
            className={cn(
              "flex min-w-0 flex-col rounded-xl border bg-white px-5 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
              active ? "border-brand-primary ring-1 ring-brand-primary/25" : "border-dash-border hover:border-brand-navy/25",
            )}
          >
            <span className="text-[14px] font-semibold text-brand-navy">{figure.label}</span>
            <span className="mt-0.5 text-[12px] text-dash-muted">{SUBTITLE[figure.key]}</span>
            <span className="mt-4 flex items-center gap-3">
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-brand-primary text-white" : "bg-brand-tint text-brand-primary")}>
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className={cn("text-[30px] leading-none font-semibold tracking-tight tabular-nums", value === null || value === 0 ? "text-brand-navy/35" : "text-brand-navy")}>
                {current === undefined || current === null || current === "—" ? "–" : figure.percent && value !== null ? `${current}%` : current}
              </span>
              <span className="ml-auto">
                <Trace active={active} label={`${figure.label} by year`} points={[...earlier.map((p) => ({ year: String(p.year), value: toNumber(p[figure.key]) })), { year: currentLabel, value }]} />
              </span>
            </span>
            {compareYear !== null ? (
              <span className="mt-3 flex flex-col gap-1.5">
                <Delta change={change} compareYear={compareYear} />
                <span className="text-[12px] leading-snug text-dash-muted">{describeChange(change)}</span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
