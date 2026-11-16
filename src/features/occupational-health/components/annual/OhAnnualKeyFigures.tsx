import { ChevronRight } from "lucide-react";

import type { AnnualChange } from "@/features/occupational-health/components/annual/annual-changes";
import { isSuppressed, toNumber } from "@/features/occupational-health/components/annual/annual-utils";
import type { AnnualTrendPoint } from "@/features/occupational-health/services/oh-annual-report.service";
import { cn } from "@/lib/utils";

const show = (value: unknown, percent?: boolean) =>
  value === undefined || value === null || value === "" || value === "—" ? "–" : percent && toNumber(value) !== null ? `${value}%` : String(value);

/**
 * The exact numbers behind the dot tracks, folded away: every earlier year beside this period, and the
 * change on the year before. Hidden counts ("<5") stay as they are.
 */
export function OhAnnualKeyFigures({
  changes,
  series,
  reportYear,
  currentLabel,
  compareYear,
}: {
  changes: AnnualChange[];
  series: AnnualTrendPoint[];
  reportYear: number;
  currentLabel: string;
  compareYear: number | null;
}) {
  const earlier = series.filter((point) => point.year < reportYear).slice(-4);
  const hasHidden = changes.some(({ figure, current }) => isSuppressed(current) || earlier.some((point) => isSuppressed(point[figure.key])));

  return (
    <details className="group" data-testid="oh-annual-numbers">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] font-semibold text-brand-navy marker:hidden hover:text-brand-primary focus-visible:underline focus-visible:outline-none">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
        Show the numbers
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-[12px]" data-testid="oh-annual-key-figures">
          <thead>
            <tr className="text-[11.5px] text-dash-muted">
              <th scope="col" className="py-2 pr-6 text-left font-medium">
                Measure
              </th>
              {earlier.map((point) => (
                <th key={point.year} scope="col" className="w-20 px-3 py-2 text-right font-medium tabular-nums">
                  {point.year}
                </th>
              ))}
              <th scope="col" className="w-28 px-3 py-2.5 text-right font-semibold text-brand-navy tabular-nums">
                {currentLabel}
              </th>
              {compareYear !== null ? (
                <th scope="col" className="w-24 py-2 pl-3 text-right font-medium">
                  On {compareYear}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {changes.map(({ figure, current, delta, good }) => (
              <tr key={figure.key} className="hover:bg-dash-canvas/60">
                <th scope="row" className="py-2.5 pr-6 text-left font-normal whitespace-nowrap text-brand-navy">
                  {figure.label}
                </th>
                {earlier.map((point) => (
                  <td key={point.year} className="px-3 py-2.5 text-right text-dash-muted tabular-nums">
                    {show(point[figure.key], figure.percent)}
                  </td>
                ))}
                <td className="px-3 py-2.5 text-right font-semibold text-brand-navy tabular-nums">{show(current, figure.percent)}</td>
                {compareYear !== null ? (
                  <td className={cn("py-2.5 pl-3 text-right tabular-nums", good === null ? "text-dash-muted" : good ? "text-brand-primary" : "text-red-700")}>
                    {delta === null ? "–" : `${delta > 0 ? `+${delta}` : delta}${figure.percent ? " pts" : ""}`}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasHidden ? <p className="mt-3 text-[11.5px] text-dash-muted">Years with fewer than 5 are left as gaps in the small charts.</p> : null}
    </details>
  );
}
