"use client";

import { OhSection } from "@/features/occupational-health/components/dashboard/OhSection";
import type { OhWorkRow } from "@/features/occupational-health/components/surveillance/oh-surveillance-utils";
import { cn } from "@/lib/utils";

const MAX_SITES = 6;
const MAX_EXAMS = 6;

type Cell = { total: number; overdue: number };

/** Open checks counted by site and exam, busiest first, so a clinic day can be planned per site. */
export function planClinicDays(rows: OhWorkRow[]) {
  const siteTotals = new Map<string, number>();
  const examTotals = new Map<string, number>();
  const cells = new Map<string, Cell>();
  for (const row of rows) {
    const site = row.site?.trim() || "No site";
    const exam = row.component_code?.trim() || "Exam";
    siteTotals.set(site, (siteTotals.get(site) ?? 0) + 1);
    examTotals.set(exam, (examTotals.get(exam) ?? 0) + 1);
    const key = `${site}\u0000${exam}`;
    const cell = cells.get(key) ?? { total: 0, overdue: 0 };
    cell.total += 1;
    if (row.overdue) cell.overdue += 1;
    cells.set(key, cell);
  }
  const rank = (map: Map<string, number>, limit: number) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
  return {
    sites: rank(siteTotals, MAX_SITES),
    exams: rank(examTotals, MAX_EXAMS),
    cell: (site: string, exam: string) => cells.get(`${site}\u0000${exam}`) ?? { total: 0, overdue: 0 },
  };
}

function shade(cell: Cell, max: number) {
  if (cell.total === 0) return "bg-dash-canvas/60 text-dash-muted/50";
  const level = Math.ceil((cell.total / Math.max(1, max)) * 3);
  return ["", "bg-brand-tint text-brand-navy", "bg-brand-primary/30 text-brand-navy", "bg-brand-primary/60 text-white"][level] ?? "bg-brand-primary/60 text-white";
}

/** Sites down the side, exams across: pick a cell to see exactly who to call in. */
export function OhClinicDayPlanner({
  rows,
  selected,
  onSelect,
}: {
  rows: OhWorkRow[];
  selected: { site: string; exam: string };
  onSelect: (site: string, exam: string) => void;
}) {
  const plan = planClinicDays(rows);
  if (plan.sites.length === 0) return null;
  const max = Math.max(...plan.sites.flatMap(([site]) => plan.exams.map(([exam]) => plan.cell(site, exam).total)));

  return (
    <OhSection
      title="Plan clinic days"
      description="Open checks by site and exam. Pick a cell to list exactly who is due."
      testId="oh-clinic-day-planner"
      className="border-b border-dash-border/70 py-6"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] table-fixed border-separate border-spacing-1 text-[12.5px]">
          <thead>
            <tr>
              <th scope="col" className="w-40 pb-1 text-left font-medium text-dash-muted">
                Site
              </th>
              {plan.exams.map(([exam]) => (
                <th key={exam} scope="col" className="truncate pb-1 text-center font-medium text-dash-muted" title={exam}>
                  {exam}
                </th>
              ))}
              <th scope="col" className="w-16 pb-1 text-right font-medium text-dash-muted">
                All
              </th>
            </tr>
          </thead>
          <tbody>
            {plan.sites.map(([site, total]) => (
              <tr key={site}>
                <th scope="row" className="truncate pr-2 text-left text-[13px] font-normal text-brand-navy" title={site}>
                  {site}
                </th>
                {plan.exams.map(([exam]) => {
                  const cell = plan.cell(site, exam);
                  const active = selected.site === site && selected.exam === exam;
                  return (
                    <td key={exam} className="p-0">
                      {cell.total > 0 ? (
                        <button
                          type="button"
                          data-testid="oh-plan-cell"
                          aria-pressed={active}
                          aria-label={`${site}, ${exam}: ${cell.total} open${cell.overdue ? `, ${cell.overdue} overdue` : ""}`}
                          onClick={() => (active ? onSelect("", "") : onSelect(site, exam))}
                          className={cn(
                            "relative h-10 w-full rounded-md font-semibold tabular-nums transition focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:outline-none",
                            shade(cell, max),
                            active && "ring-2 ring-brand-navy ring-offset-1",
                          )}
                        >
                          {cell.total}
                          {cell.overdue > 0 ? (
                            <span aria-hidden className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-600 px-0.5 text-[9.5px] font-bold text-white">
                              {cell.overdue}
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        <span aria-hidden className={cn("flex h-10 items-center justify-center rounded-md", shade(cell, max))}>
                          ·
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="text-right font-semibold text-brand-navy tabular-nums">{total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p aria-hidden className="mt-2 flex items-center gap-1.5 text-[11.5px] text-dash-muted">
        <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-600 px-0.5 text-[9.5px] font-bold text-white">2</span> overdue among them
      </p>
    </OhSection>
  );
}
