"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import { OhSection } from "@/features/occupational-health/components/dashboard/OhSection";
import { surveillanceHref, type OhSurveillanceLink } from "@/features/occupational-health/components/surveillance/oh-surveillance-utils";
import type { OhBreakdownRow, OhComplianceInsights } from "@/features/occupational-health/services/oh-ext.service";

export type OhComplianceDimension = "by_hazard_profile" | "by_department" | "by_employer" | "by_site";

const DIMENSION: Record<OhComplianceDimension, { label: string; link: (key: string) => OhSurveillanceLink }> = {
  by_hazard_profile: { label: "Hazard profile", link: (key) => ({ hazard: key }) },
  by_department: { label: "Department", link: (key) => ({ q: key }) },
  by_employer: { label: "Employer", link: (key) => ({ q: key }) },
  by_site: { label: "Site", link: (key) => ({ site: key }) },
};
const SHOWN = 8;

/** Most overdue first, then most open. */
export function rankHotspots(rows: OhBreakdownRow[]): OhBreakdownRow[] {
  return [...rows].sort((a, b) => b.overdue - a.overdue || b.total - a.total || a.key.localeCompare(b.key)).slice(0, SHOWN);
}

/** Where open checks pile up, ranked, each one a link into the filtered worklist. */
export function OhComplianceHotspots({
  insights,
  dimension,
  onDimensionChange,
}: {
  insights: OhComplianceInsights | undefined;
  dimension: OhComplianceDimension;
  onDimensionChange: (dimension: OhComplianceDimension) => void;
}) {
  const rows = rankHotspots(insights?.[dimension] ?? []);
  const max = Math.max(1, ...rows.map((row) => row.total));

  return (
    <OhSection
      title="Where we are falling behind"
      description="Open checks, most overdue first."
      testId="oh-compliance-breakdown"
      action={
        <OhSegmented
          label="Group by"
          role="radiogroup"
          value={dimension}
          onChange={onDimensionChange}
          options={(Object.keys(DIMENSION) as OhComplianceDimension[]).map((key) => ({ value: key, label: DIMENSION[key].label }))}
        />
      }
    >
      {rows.length === 0 ? (
        <p className="border-y border-dash-border/70 py-5 text-[13.5px] text-dash-muted">No open checks.</p>
      ) : (
        <ol className="border-t border-dash-border/70">
          {rows.map((row, index) => (
            <li key={row.key} className="border-b border-dash-border/70">
              <Link
                href={surveillanceHref(ROUTES.occupationalHealthSurveillance, DIMENSION[dimension].link(row.key))}
                data-testid="oh-compliance-hotspot"
                className="group grid grid-cols-[1.5rem_minmax(0,11rem)_minmax(0,1fr)_auto] items-center gap-x-4 py-2.5 focus-visible:outline-none sm:grid-cols-[1.5rem_minmax(0,14rem)_minmax(0,1fr)_9rem]"
              >
                <span className="text-[12px] text-dash-muted tabular-nums">{index + 1}</span>
                <span className="truncate text-[14px] text-brand-navy group-hover:text-brand-primary group-focus-visible:underline">{row.key || "Not set"}</span>
                <span aria-hidden className="flex h-2 overflow-hidden rounded-full bg-dash-canvas">
                  <span className="bg-red-600" style={{ width: `${(row.overdue / max) * 100}%` }} />
                  <span className="bg-amber-400" style={{ width: `${(row.due / max) * 100}%` }} />
                </span>
                <span className="text-right text-[12.5px] whitespace-nowrap text-dash-muted tabular-nums">
                  {row.overdue > 0 ? <span className="font-semibold text-red-700">{row.overdue} overdue</span> : <span>none overdue</span>}
                  <span> · {row.total} open</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </OhSection>
  );
}
