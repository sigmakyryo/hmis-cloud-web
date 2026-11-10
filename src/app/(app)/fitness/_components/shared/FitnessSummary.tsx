"use client";

import { useQuery } from "@tanstack/react-query";

import { ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { DaFact, DaSection } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { fetchFitWorker, type FitWorker } from "@/features/occupational-health/services/fitness.service";
import { ITEM_LABEL, ITEM_TONE, OVERALL_LABEL, OVERALL_TONE, SOURCE_LABEL, errorText, fmtDate, label } from "./fit-format";

export const FIT_WORKER_KEY = (customerUuid: string) => ["oh-fit", "worker", customerUuid] as const;

export function useFitWorker(customerUuid: string | null) {
  return useQuery({
    queryKey: FIT_WORKER_KEY(customerUuid ?? ""),
    queryFn: () => fetchFitWorker(customerUuid as string),
    enabled: Boolean(customerUuid),
  });
}

/** One fit-for-duty answer: overall, why, what expires first, then each source. */
export function FitnessSummaryView({ worker, compact }: { worker: FitWorker; compact?: boolean }) {
  return (
    <div className="space-y-4" data-testid="oh-fit-summary">
      <div className="flex flex-wrap items-center gap-3">
        <ImmStatusBadge status={OVERALL_TONE[worker.overall] ?? "planned"} label={label(OVERALL_LABEL, worker.overall)} />
        <span className="text-[13px] text-dash-muted">
          {worker.earliest_expiry ? `Next expiry ${fmtDate(worker.earliest_expiry)}` : "No upcoming expiry"}
        </span>
      </div>
      {worker.reasons.length > 0 ? (
        <DaSection title="Why">
          <ul className="space-y-1 text-[13px] text-brand-navy">
            {worker.reasons.map((reason, index) => (
              <li key={`${reason.source}-${index}`} className="flex items-start justify-between gap-3">
                <span>{reason.message}</span>
                <ImmStatusBadge status={ITEM_TONE[reason.status] ?? reason.status} label={label(ITEM_LABEL, reason.status)} />
              </li>
            ))}
          </ul>
        </DaSection>
      ) : null}
      {worker.restrictions.length > 0 ? (
        <DaSection title="Work restrictions">
          <ul className="list-disc pl-5 text-[13px] text-brand-navy">
            {worker.restrictions.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </DaSection>
      ) : null}
      {compact ? null : (
        <>
          <DaSection title="Checks">
            {worker.items.length === 0 ? (
              <p className="text-[13px] text-dash-muted">Nothing on file yet.</p>
            ) : (
              worker.items.map((item, index) => (
                <DaFact key={`${item.source}-${item.label}-${index}`} label={`${label(SOURCE_LABEL, item.source)} · ${item.label}`}>
                  <span className="inline-flex items-center gap-2">
                    {item.expires_on ? <span className="text-dash-muted">{fmtDate(item.expires_on)}</span> : null}
                    <ImmStatusBadge status={ITEM_TONE[item.status] ?? item.status} label={label(ITEM_LABEL, item.status)} />
                  </span>
                </DaFact>
              ))
            )}
          </DaSection>
          {worker.zones.length > 0 ? (
            <DaSection title="Areas">
              {worker.zones.map((zone) => (
                <DaFact key={zone.code} label={zone.name || zone.code}>
                  <span className="inline-flex items-center gap-2">
                    {zone.valid_until ? <span className="text-dash-muted">{fmtDate(zone.valid_until)}</span> : null}
                    <ImmStatusBadge status={zone.status} />
                  </span>
                </DaFact>
              ))}
            </DaSection>
          ) : null}
          <DaSection title="Role">
            <DaFact label={worker.role_clearance.job_title || "Job title not set"}>
              <ImmStatusBadge status={worker.role_clearance.status === "restricted" ? "expiring" : worker.role_clearance.status === "unknown" ? "planned" : worker.role_clearance.status} label={label({ cleared: "Cleared", restricted: "With restrictions", not_cleared: "Not cleared", unknown: "Not yet known" }, worker.role_clearance.status)} />
            </DaFact>
          </DaSection>
        </>
      )}
    </div>
  );
}

/** Self-loading summary for the visit panel and the employee record. */
export function FitnessSummary({ customerUuid, compact }: { customerUuid: string; compact?: boolean }) {
  const query = useFitWorker(customerUuid);
  if (query.isLoading) return <QuietLoading />;
  if (query.isError) return <LoadError>{errorText(query.error, "Could not load fitness.")}</LoadError>;
  return query.data ? <FitnessSummaryView worker={query.data} compact={compact} /> : null;
}
