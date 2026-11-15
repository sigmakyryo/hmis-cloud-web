"use client";

import { Gauge, ShieldCheck, Syringe, TestTubes } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { ExposureDashboard } from "@/features/exposure-management/exposure.types";
import { shortDate } from "@/features/occupational-health/components/oh-home/views/OhViewCharts";
import { QueryState, ShareRow, TodoRow, ViewSection } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import type { OhHomeExposure } from "@/features/occupational-health/lib/oh-home.types";
import { cn } from "@/lib/utils";

type SummaryQuery = { data?: OhHomeExposure; isLoading: boolean; isError: boolean; refetch: () => unknown };

const HIERARCHY_LABEL: Record<string, string> = {
  elimination: "Elimination",
  substitution: "Substitution",
  engineering: "Engineering",
  administrative: "Administrative",
  ppe: "PPE",
};

function ratioTone(ratio: number | null) {
  if (ratio === null) return "text-dash-muted";
  if (ratio >= 1) return "text-red-700";
  if (ratio >= 0.5) return "text-amber-700";
  return "text-brand-primary";
}

export function OhExpResultsSection({ summary }: { summary: SummaryQuery }) {
  const rows = summary.data?.recent_results ?? [];
  return (
    <ViewSection title="Latest results" icon={TestTubes} href={ROUTES.exposureManagementMeasurements} linkLabel="All results">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        {rows.length === 0 ? (
          <p className="text-[13.5px] text-dash-muted">No sampling results yet.</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li key={row.uuid} data-testid="oh-home-exposure-result" className="flex items-center gap-3 border-b border-dash-border/70 py-2.5 last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-brand-navy">{row.agent}</span>
                  <span className="block truncate text-[12.5px] text-dash-muted">{row.group}</span>
                </span>
                <span className="shrink-0 text-[13px] text-brand-slate tabular-nums">
                  {row.below_lod ? "Below LOD" : row.result_value !== null ? `${row.result_value} ${row.result_unit}` : "—"}
                </span>
                <span className={cn("w-16 shrink-0 text-right text-[13px] font-semibold tabular-nums", ratioTone(row.worst_ratio))} title="Share of the exposure limit">
                  {row.worst_ratio !== null ? `${Math.round(row.worst_ratio * 100)}%` : "—"}
                </span>
                <span className="w-12 shrink-0 text-right text-[12.5px] text-dash-muted tabular-nums">{shortDate(row.sampled_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </ViewSection>
  );
}

export function OhExpControlsSection({ summary }: { summary: SummaryQuery }) {
  const controls = summary.data?.controls;
  const max = Math.max(1, ...(controls?.by_hierarchy ?? []).map((row) => row.open));
  return (
    <ViewSection title="Open controls" icon={ShieldCheck} countLabel="open controls" count={controls?.open} href={ROUTES.exposureManagementEvents} linkLabel="Events">
      <QueryState isLoading={summary.isLoading} isError={summary.isError} onRetry={() => void summary.refetch()} rows={4}>
        {controls ? (
          <>
            <p className="mb-1 text-[13.5px] text-dash-muted">
              By the hierarchy of controls, most effective first.
              {controls.overdue > 0 ? <span className="font-medium text-red-700"> {controls.overdue} overdue.</span> : null}
            </p>
            <ul>
              {controls.by_hierarchy.map((row) => (
                <ShareRow key={row.hierarchy} name={HIERARCHY_LABEL[row.hierarchy] ?? row.hierarchy} percent={(row.open / max) * 100} valueLabel={String(row.open)} note="open" tone="bg-amber-500" />
              ))}
            </ul>
          </>
        ) : null}
      </QueryState>
    </ViewSection>
  );
}

export function OhExpSamplingSection({ dashboard }: { dashboard?: ExposureDashboard }) {
  const kpis = dashboard?.kpis;
  if (!kpis) return null;
  return (
    <ViewSection title="Sampling and instruments" icon={Gauge} href={ROUTES.exposureManagementSampling} linkLabel="Sampling">
      <ul>
        <TodoRow value={kpis.plans_overdue} label="Sampling plans overdue" href={ROUTES.exposureManagementSampling} alert />
        <TodoRow value={kpis.plans_due_soon} label="Sampling due soon" href={ROUTES.exposureManagementSampling} />
        <TodoRow value={kpis.calibrations_overdue} label="Calibrations overdue" href={ROUTES.exposureManagementSampling} alert />
        <TodoRow value={kpis.calibrations_due_soon} label="Calibrations due soon" href={ROUTES.exposureManagementSampling} />
        <TodoRow value={kpis.reviews_due} label="Assessments to review" href={ROUTES.exposureManagementGroups} />
      </ul>
    </ViewSection>
  );
}

export function OhExpBiologicalSection({ dashboard }: { dashboard?: ExposureDashboard }) {
  const bio = dashboard?.biological;
  if (!bio) return null;
  return (
    <ViewSection title="Needle-stick and splash incidents" icon={Syringe} countLabel="open incidents" count={bio.open_incidents} href={ROUTES.exposureManagementIncidents} linkLabel="Incidents">
      <p className="mb-1 text-[12.5px] text-dash-muted">{bio.last_90_days} reported in the last 90 days</p>
      <ul>
        <TodoRow value={bio.urgent} label="Need urgent care" hint="Post-exposure treatment" href={ROUTES.exposureManagementIncidents} alert />
        <TodoRow value={bio.followups_due} label="Follow-ups due" href={ROUTES.exposureManagementIncidents} />
      </ul>
    </ViewSection>
  );
}
