"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import type { ExposureDashboard } from "@/features/exposure-management/exposure.types";
import { BAND_LABELS, BAND_TONE, formatNumber } from "@/features/exposure-management/lib/exposure-format";
import { cn } from "@/lib/utils";

/**
 * Exposure groups by agent. Each cell carries the band number and a text label so colour is never the only cue;
 * empty cells say "No data" instead of looking safe.
 */
export function ExposureHeatmap({ dashboard }: { dashboard: ExposureDashboard }) {
  const { agents, groups } = dashboard;
  if (!agents.length || !groups.length) return null;

  return (
    <div data-list-band className="overflow-x-auto border-b border-dash-border/80 bg-white px-4 py-4 md:px-6">
      <table className="min-w-full border-separate border-spacing-1 text-[12px]" aria-label="Exposure band by group and agent">
        <thead>
          <tr>
            <th scope="col" className="px-2 py-1 text-left font-medium text-dash-muted">
              Group
            </th>
            {agents.map((agent) => (
              <th key={agent.uuid} scope="col" className="px-2 py-1 text-left font-medium text-dash-muted" title={agent.name}>
                {agent.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.uuid}>
              <th scope="row" className="whitespace-nowrap px-2 py-1 text-left font-medium text-brand-navy">
                <Link href={ROUTES.exposureManagementGroup(group.uuid)} className="hover:underline">
                  {group.name}
                </Link>
                <span className="ml-1.5 font-normal text-dash-muted">{group.members}</span>
              </th>
              {group.cells.map((cell, index) => {
                const agent = agents[index];
                if (!cell || cell.band === null) {
                  return (
                    <td key={agent.uuid} className="rounded-md bg-dash-canvas px-2 py-1.5 text-center text-dash-muted">
                      {cell && cell.sample_count > 0 ? `${cell.sample_count} · below LOD` : "No data"}
                    </td>
                  );
                }
                return (
                  <td
                    key={agent.uuid}
                    title={`${BAND_LABELS[cell.band] ?? ""} · ${cell.sample_count} samples · p95 ${formatNumber(cell.p95)} ${cell.oel_unit}`}
                    className={cn("rounded-md px-2 py-1.5 text-center font-medium", BAND_TONE[cell.band])}
                  >
                    <span className="tabular-nums">B{cell.band}</span>
                    <span className="ml-1 font-normal">{BAND_LABELS[cell.band]}</span>
                    {cell.confidence === "low" ? <span aria-label="low confidence"> *</span> : null}
                    {cell.open_events > 0 ? <span className="ml-1 font-semibold">· {cell.open_events} open</span> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-dash-muted">* Fewer than six samples: banded, but treat as low confidence.</p>
    </div>
  );
}
