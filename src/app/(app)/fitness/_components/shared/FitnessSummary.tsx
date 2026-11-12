"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck, ShieldQuestion, ShieldX, type LucideIcon } from "lucide-react";

import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  fetchFitWorker,
  type FitOverall,
  type FitWorker,
} from "@/features/occupational-health/services/fitness.service";
import { cn } from "@/lib/utils";
import { FitExpiryTimeline } from "./FitExpiryTimeline";
import { FitReadinessRing } from "./FitReadinessRing";
import { FitSourceStrip, FitStatusLabel } from "./FitSourceStrip";
import { OVERALL_LABEL, SOURCE_LABEL, errorText, fmtDate, fmtDateTime, label } from "./fit-format";
import { SOURCE_ICON, STATUS_HINT, STATUS_TONE, TONE_SOFT, daysUntil, groupBySource, relativeDays } from "./fit-visual";

export const FIT_WORKER_KEY = (customerUuid: string) => ["oh-fit", "worker", customerUuid] as const;

export function useFitWorker(customerUuid: string | null) {
  return useQuery({
    queryKey: FIT_WORKER_KEY(customerUuid ?? ""),
    queryFn: () => fetchFitWorker(customerUuid as string),
    enabled: Boolean(customerUuid),
  });
}

const VERDICT: Record<FitOverall, { icon: LucideIcon; line: string; iconColor: string; accent: string }> = {
  fit: { icon: ShieldCheck, line: "Cleared for duty.", iconColor: "text-emerald-600", accent: "text-emerald-800" },
  fit_with_restrictions: {
    icon: ShieldAlert,
    line: "Can work within the restrictions below.",
    iconColor: "text-amber-500",
    accent: "text-amber-900",
  },
  not_fit: {
    icon: ShieldX,
    line: "Not cleared until the items below are resolved.",
    iconColor: "text-red-600",
    accent: "text-red-800",
  },
  unknown: { icon: ShieldQuestion, line: "Not enough on file to decide yet.", iconColor: "text-brand-primary", accent: "text-brand-navy" },
};

const ROLE_LABEL: Record<string, string> = {
  cleared: "Cleared",
  restricted: "With restrictions",
  not_cleared: "Not cleared",
  unknown: "Not yet known",
};

type FitnessSummaryOptions = {
  compact?: boolean;
  action?: ReactNode;
  /** Name, employee number, employer and site above the verdict; off where the page already names the worker. */
  showWorker?: boolean;
  /** Short line under the facts, e.g. when the answer is recalculated. */
  note?: string;
};

/** One fit-for-duty answer: verdict column on the left; what holds it up and every source on the right. */
export function FitnessSummaryView({ worker, compact, action, showWorker, note }: FitnessSummaryOptions & { worker: FitWorker }) {
  const verdict = VERDICT[worker.overall] ?? VERDICT.unknown;
  const bySource = groupBySource(worker.items);
  const expiryDays = worker.earliest_expiry ? daysUntil(worker.earliest_expiry) : null;
  const hasDated = worker.items.some((item) => Boolean(item.expires_on));
  const workerLine = [worker.employee_number, worker.employer_name, worker.site, worker.department].filter(Boolean);

  return (
    <div className="@container" data-testid="oh-fit-summary">
      <div className="grid gap-x-10 gap-y-8 @3xl:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="@3xl:border-r @3xl:border-dash-border @3xl:pr-10">
          <div className="flex items-start justify-between gap-3">
            {showWorker && worker.worker_label ? (
              <p className="min-w-0 text-[12.5px] leading-snug text-dash-muted">
                <span className="block font-medium text-brand-navy">{worker.worker_label}</span>
                {workerLine.join(" · ")}
              </p>
            ) : (
              <span />
            )}
            {action}
          </div>
          <div className="mt-4 flex items-center gap-4 @3xl:flex-col @3xl:items-start">
            <FitReadinessRing bySource={bySource} icon={verdict.icon} iconClassName={verdict.iconColor} />
            <div className="min-w-0">
              <h2 className={cn("text-2xl leading-tight font-semibold tracking-tight", verdict.accent)}>
                {label(OVERALL_LABEL, worker.overall)}
              </h2>
              <p className="mt-1 text-[13px] text-dash-muted">{verdict.line}</p>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-dash-border/70 border-y border-dash-border/70 text-[12.5px]">
            <Fact term="Next expiry">
              {worker.earliest_expiry && expiryDays !== null ? (
                <>
                  {fmtDate(worker.earliest_expiry)}
                  <span className={cn("block text-right font-normal", expiryDays < 0 ? "text-red-700" : expiryDays <= 60 ? "text-amber-800" : "text-dash-muted")}>
                    {relativeDays(expiryDays)}
                  </span>
                </>
              ) : (
                "None upcoming"
              )}
            </Fact>
            <Fact term="Role">
              {worker.role_clearance.job_title || worker.job_title || "Not set"}
              <span className="block text-right font-normal text-dash-muted">{label(ROLE_LABEL, worker.role_clearance.status)}</span>
            </Fact>
            {worker.changed_at ? <Fact term="Status since">{fmtDate(worker.changed_at)}</Fact> : null}
            <Fact term="Updated">{fmtDateTime(worker.computed_at)}</Fact>
          </dl>
          {note ? <p className="mt-2 text-[11.5px] leading-snug text-dash-muted">{note}</p> : null}

          {worker.restrictions.length > 0 ? (
            <div className="mt-6">
              <h3 className="mb-2 text-[12px] font-semibold text-amber-900">Work restrictions</h3>
              <ul className="space-y-1.5 border-l-2 border-amber-400 pl-3">
                {worker.restrictions.map((restriction) => (
                  <li key={restriction} className="text-[13px] font-medium text-amber-950">
                    {restriction}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="@container min-w-0 space-y-9">
          <Section
            title={worker.reasons.length > 0 ? "Holding this up" : "Clearance"}
            aside={worker.reasons.length > 0 ? `${worker.reasons.length} to resolve` : undefined}
          >
            {worker.reasons.length > 0 ? (
              <ol className="space-y-1">
                {worker.reasons.map((reason, index) => {
                  const Icon = SOURCE_ICON[reason.source];
                  const tone = STATUS_TONE[reason.status];
                  return (
                    <li
                      key={`${reason.source}-${index}`}
                      className="flex items-center gap-3.5 py-2.5"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[11px] font-semibold tabular-nums text-white">
                        {index + 1}
                      </span>
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", TONE_SOFT[tone])}>
                        <Icon className="size-[18px]" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] leading-snug font-semibold text-brand-navy">{reason.message}</span>
                        <span className="mt-0.5 block text-[12.5px] text-dash-muted">
                          {label(SOURCE_LABEL, reason.source)} · {STATUS_HINT[reason.status]}
                        </span>
                      </span>
                      <FitStatusLabel status={reason.status} />
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="flex items-center gap-3 py-1 text-[14px] font-medium text-emerald-800">
                <span className={cn("flex size-10 items-center justify-center rounded-full", TONE_SOFT.good)}>
                  <ShieldCheck className="size-[18px]" aria-hidden />
                </span>
                Nothing is holding this up.
              </p>
            )}
          </Section>

          {compact ? null : (
            <>
              <Section title="Checks on file" aside={`${worker.items.length} recorded`}>
                <FitSourceStrip bySource={bySource} />
              </Section>

              {hasDated ? (
                <Section title="Next twelve months">
                  <FitExpiryTimeline items={worker.items} />
                </Section>
              ) : null}

              {worker.zones.length > 0 ? (
                <Section title="Areas" count={worker.zones.length}>
                  <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
                    {worker.zones.map((zone) => (
                      <li key={zone.code} className="flex items-center gap-3 py-2 text-[13px]">
                        <span className="w-14 shrink-0 font-mono text-[11.5px] text-dash-muted">{zone.code}</span>
                        <span className="min-w-0 flex-1 font-medium text-brand-navy">{zone.name || zone.code}</span>
                        <span className="shrink-0 text-[12.5px] capitalize text-dash-muted">{zone.status.replace(/_/g, " ")}</span>
                        <span className="w-24 shrink-0 text-right text-[12.5px] tabular-nums text-dash-muted">
                          {zone.valid_until ? fmtDate(zone.valid_until) : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="text-dash-muted">{term}</dt>
      <dd className="min-w-0 text-right font-medium text-brand-navy">{children}</dd>
    </div>
  );
}

function Section({ title, count, aside, children }: { title: string; count?: number; aside?: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-brand-navy">
          <span className="h-3.5 w-[3px] rounded-full bg-brand-primary" aria-hidden />
          {title}
          {count !== undefined ? (
            <span className="rounded-full bg-brand-tint px-1.5 text-[11px] font-semibold tabular-nums text-brand-primary">{count}</span>
          ) : null}
        </h3>
        {aside ? (
          <span className="rounded-full bg-brand-tint/60 px-2 py-0.5 text-[11.5px] font-medium text-brand-primary">{aside}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Self-loading summary for the visit panel and the employee record. */
export function FitnessSummary({ customerUuid, ...options }: FitnessSummaryOptions & { customerUuid: string }) {
  const query = useFitWorker(customerUuid);
  if (query.isLoading) return <QuietLoading />;
  if (query.isError) return <LoadError>{errorText(query.error, "Could not load fitness.")}</LoadError>;
  return query.data ? <FitnessSummaryView worker={query.data} {...options} /> : null;
}
