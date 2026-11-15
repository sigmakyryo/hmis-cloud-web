"use client";

import { Grid3x3 } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { QueryState, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeImmunizations } from "@/features/occupational-health/lib/oh-home.types";
import { cn } from "@/lib/utils";

type SummaryQuery = { data?: OhHomeImmunizations; isLoading: boolean; isError: boolean; refetch: () => unknown };

function cellTone(percent: number) {
  if (percent < 70) return "bg-red-50 text-red-700";
  if (percent < 90) return "bg-amber-50 text-amber-800";
  return "bg-sky-50 text-sky-800";
}

/** Where the gaps are: each employer against each vaccine, the cell shaded by how many are covered. */
export function OhImmCoverageGrid({ summary }: { summary: SummaryQuery }) {
  const matrix = summary.data?.coverage_matrix;

  return (
    <ViewSection title="Coverage by employer and vaccine" icon={Grid3x3} href={ROUTES.immunizationsCompliance} linkLabel="Compliance" testId="oh-home-imm-grid">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        {!matrix || matrix.employers.length === 0 || matrix.vaccines.length === 0 ? (
          <p className="border-y border-dash-border/70 py-5 text-[13.5px] text-dash-muted">No vaccine schedules are assigned yet.</p>
        ) : (
          <div className="overflow-x-auto border-t border-dash-border/70 pt-3">
            <table className="w-full min-w-[34rem] table-fixed border-separate border-spacing-1 text-[12.5px]">
              <thead>
                <tr>
                  <th scope="col" className="w-44 pb-1 text-left font-medium text-dash-muted">
                    Employer
                  </th>
                  {matrix.vaccines.map((vaccine) => (
                    <th key={vaccine.code} scope="col" className="pb-1 text-center font-medium text-dash-muted" title={vaccine.name}>
                      <span className="block truncate">{vaccine.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.employers.map((row) => (
                  <tr key={row.employer}>
                    <th scope="row" className="pr-2 text-left font-normal">
                      <span className="block truncate text-[13px] text-brand-navy">{row.employer}</span>
                      <span className="block text-[11.5px] text-dash-muted tabular-nums">{row.people} workers</span>
                    </th>
                    {row.cells.map((cell, index) =>
                      cell ? (
                        <td
                          key={cell.code}
                          data-testid="oh-home-imm-cell"
                          title={`${row.employer}, ${matrix.vaccines[index]?.name}: ${cell.up_to_date} of ${cell.people} covered`}
                          className={cn("h-11 rounded-md text-center font-semibold tabular-nums", cellTone(cell.percent))}
                        >
                          {Math.round(cell.percent)}%
                        </td>
                      ) : (
                        <td key={`${row.employer}-${index}`} className="h-11 rounded-md bg-dash-canvas/60 text-center text-dash-muted/60" title="Not required">
                          –
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p aria-hidden className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-dash-muted">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-red-50 ring-1 ring-red-200" /> under 70%</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-50 ring-1 ring-amber-200" /> 70–89%</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-sky-50 ring-1 ring-sky-200" /> 90% and over</span>
              <span>– not required</span>
            </p>
          </div>
        )}
      </QueryState>
    </ViewSection>
  );
}
