"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import { EvaluationBadge, EventStatusBadge, SeverityBadge } from "@/features/exposure-management/components/ExposureBadges";
import { errorMessage, formatDate, formatNumber } from "@/features/exposure-management/lib/exposure-format";
import { exposureKeys, fetchWorkerExposure } from "@/features/exposure-management/services/exposure.service";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-brand-navy">{title}</h3>
      {children}
    </section>
  );
}

/** Exposure tab on the OH employee record: groups, cumulative dose, events and recent results. */
export function ExposureWorkerPanel({ customerUuid }: { customerUuid: string }) {
  const query = useQuery({ queryKey: exposureKeys.worker(customerUuid), queryFn: () => fetchWorkerExposure(customerUuid) });

  if (query.isPending) return <p className="px-4 py-6 text-[13px] text-dash-muted md:px-6">Loading…</p>;
  if (query.isError) return <p role="alert" className="px-4 py-6 text-[13px] text-red-700 md:px-6">{errorMessage(query.error, "Could not load exposure.")}</p>;
  const { groups, events, doses, measurements, incidents } = query.data;

  return (
    <div className="space-y-6 px-4 py-4 md:px-6" data-testid="oh-employee-exposure-panel">
      <Section title="Exposure groups">
        {groups.length === 0 ? (
          <p className="text-[13px] text-dash-muted">Not in any exposure group.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <li key={g.uuid}>
                <Link href={ROUTES.exposureManagementGroup(g.uuid)} className="rounded-full bg-dash-canvas px-3 py-1 text-[13px] text-brand-primary hover:underline">{g.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Cumulative exposure">
        {doses.length === 0 ? <p className="text-[13px] text-dash-muted">No dose recorded.</p> : (
          <ul className="space-y-1 text-[13px]">
            {doses.map((d) => (
              <li key={`${d.agent_code}-${d.period_start}`} className={d.cumulative_percent >= 100 ? "font-medium text-red-700" : "text-brand-slate"}>
                {d.agent_name}: {formatNumber(d.dose_percent, 3)}% this period, {formatNumber(d.cumulative_percent, 3)}% cumulative of the limit
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Events">
        {events.length === 0 ? <p className="text-[13px] text-dash-muted">No overexposure events.</p> : (
          <ul className="space-y-1.5">
            {events.map((e) => (
              <li key={e.uuid} className="flex flex-wrap items-center gap-2 text-[13px]">
                <SeverityBadge severity={e.severity} />
                <EventStatusBadge status={e.status} />
                <Link href={`${ROUTES.exposureManagementEvents}?event=${e.uuid}`} className="text-brand-primary hover:underline">{e.agent_name}</Link>
                <span className="text-dash-muted">{formatDate(e.detected_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Recent results">
        {measurements.length === 0 ? <p className="text-[13px] text-dash-muted">No personal results.</p> : (
          <ul className="space-y-1.5 text-[13px]">
            {measurements.slice(0, 10).map((m) => (
              <li key={m.uuid} className="flex flex-wrap items-center gap-2">
                <span>{m.agent_name}</span>
                <span className="tabular-nums">{m.below_lod ? `<${formatNumber(m.lod_value)}` : formatNumber(m.result_value)} {m.result_unit}</span>
                <EvaluationBadge evaluation={m.evaluation} belowLod={m.below_lod} />
                <span className="text-dash-muted">{formatDate(m.sampled_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {incidents.length > 0 ? (
        <Section title="Biological incidents">
          <ul className="space-y-1 text-[13px] text-brand-slate">
            {incidents.map((i) => <li key={i.uuid}>{i.type.replaceAll("_", " ")} · {formatDate(i.exposed_at)} · {i.status}</li>)}
          </ul>
          <Link href={ROUTES.exposureManagementIncidents} className="text-[13px] font-medium text-brand-primary hover:underline">Open incidents</Link>
        </Section>
      ) : null}
    </div>
  );
}
