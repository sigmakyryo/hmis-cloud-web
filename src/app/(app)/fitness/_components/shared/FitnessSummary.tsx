"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ShieldAlert, ShieldCheck, ShieldQuestion, ShieldX, type LucideIcon } from "lucide-react";

import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  fetchFitWorker,
  type FitItem,
  type FitItemStatus,
  type FitOverall,
  type FitSource,
  type FitWorker,
} from "@/features/occupational-health/services/fitness.service";
import { cn } from "@/lib/utils";
import { FitExpiryTimeline } from "./FitExpiryTimeline";
import { FitReadinessRing } from "./FitReadinessRing";
import { ITEM_LABEL, OVERALL_LABEL, SOURCE_LABEL, errorText, fmtDate, fmtDateTime, label } from "./fit-format";
import {
  FIT_SOURCES,
  SOURCE_ICON,
  STATUS_TONE,
  TONE_DOT,
  TONE_TEXT,
  daysUntil,
  groupBySource,
  relativeDays,
  worstStatus,
} from "./fit-visual";

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
  unknown: { icon: ShieldQuestion, line: "Not enough on file to decide yet.", iconColor: "text-slate-400", accent: "text-brand-navy" },
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
};

/** One fit-for-duty answer: the verdict and why, what expires next, then every source on file. */
export function FitnessSummaryView({ worker, compact, action, showWorker }: FitnessSummaryOptions & { worker: FitWorker }) {
  const verdict = VERDICT[worker.overall] ?? VERDICT.unknown;
  const bySource = groupBySource(worker.items);
  const expiryDays = worker.earliest_expiry ? daysUntil(worker.earliest_expiry) : null;
  const workerLine = [
    worker.employee_number,
    worker.employer_name,
    worker.site,
    worker.department,
  ].filter(Boolean);

  return (
    <div data-testid="oh-fit-summary">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <FitReadinessRing bySource={bySource} icon={verdict.icon} iconClassName={verdict.iconColor} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {showWorker && worker.worker_label ? (
                <p className="truncate text-[12.5px] text-dash-muted">
                  <span className="font-medium text-brand-navy">{worker.worker_label}</span>
                  {workerLine.length > 0 ? ` · ${workerLine.join(" · ")}` : ""}
                </p>
              ) : null}
              <h2 className={cn("mt-0.5 text-2xl leading-tight font-semibold tracking-tight", verdict.accent)}>
                {label(OVERALL_LABEL, worker.overall)}
              </h2>
              <p className="mt-1 text-[13px] text-dash-muted">{verdict.line}</p>
            </div>
            {action}
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1.5 text-[12.5px]">
            <Fact term="Next expiry">
              {worker.earliest_expiry && expiryDays !== null ? (
                <>
                  {fmtDate(worker.earliest_expiry)}{" "}
                  <span className={cn("font-normal", expiryDays < 0 ? "text-red-700" : expiryDays <= 60 ? "text-amber-800" : "text-dash-muted")}>
                    ({relativeDays(expiryDays)})
                  </span>
                </>
              ) : (
                "None upcoming"
              )}
            </Fact>
            <Fact term="Role">
              {worker.role_clearance.job_title || worker.job_title || "Job title not set"}
              <span className="font-normal text-dash-muted"> · {label(ROLE_LABEL, worker.role_clearance.status)}</span>
            </Fact>
            {worker.changed_at ? <Fact term="Status since">{fmtDate(worker.changed_at)}</Fact> : null}
            <Fact term="Updated">{fmtDateTime(worker.computed_at)}</Fact>
          </dl>
        </div>
      </header>

      {worker.reasons.length > 0 ? (
        <Section title="Holding this up" count={worker.reasons.length}>
          <ul className="space-y-2">
            {worker.reasons.map((reason, index) => {
              const Icon = SOURCE_ICON[reason.source];
              return (
                <li key={`${reason.source}-${index}`} className="flex items-start gap-3 text-[13px]">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", TONE_TEXT[STATUS_TONE[reason.status]])} aria-hidden />
                  <span className="min-w-0 flex-1 text-brand-navy">{reason.message}</span>
                  <StatusLabel status={reason.status} />
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {worker.restrictions.length > 0 ? (
        <Section title="Work restrictions" count={worker.restrictions.length}>
          <ul className="space-y-1.5 border-l-2 border-amber-400 pl-3.5">
            {worker.restrictions.map((restriction) => (
              <li key={restriction} className="text-[13.5px] font-medium text-amber-950">
                {restriction}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {compact ? null : (
        <>
          <Section title="Next twelve months">
            <FitExpiryTimeline items={worker.items} />
          </Section>

          <Section title="Checks on file">
            <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
              {FIT_SOURCES.map((source) => (
                <SourceRow key={source} source={source} items={bySource.get(source) ?? []} />
              ))}
            </ul>
          </Section>

          {worker.zones.length > 0 ? (
            <Section title="Areas" count={worker.zones.length}>
              <ul className="divide-y divide-dash-border/70">
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
  );
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <dt className="text-dash-muted">{term}</dt>
      <dd className="truncate font-medium text-brand-navy">{children}</dd>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section aria-label={title} className="mt-8">
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-brand-navy">
        {title}
        {count !== undefined ? (
          <span className="rounded-full bg-dash-canvas px-1.5 text-[11px] font-medium tabular-nums text-dash-muted">{count}</span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

function StatusLabel({ status }: { status: FitItemStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium", TONE_TEXT[tone])}>
      <span className={cn("size-1.5 rounded-full", TONE_DOT[tone])} aria-hidden />
      {label(ITEM_LABEL, status)}
    </span>
  );
}

function SourceRow({ source, items }: { source: FitSource; items: FitItem[] }) {
  const [open, setOpen] = useState(false);
  const worst = worstStatus(items);
  const Icon = SOURCE_ICON[source];
  const sourceLabel = label(SOURCE_LABEL, source);
  const named = items.filter((item) => item.label.trim() !== "" && item.label !== sourceLabel);
  const expiry = items
    .map((item) => item.expires_on)
    .filter((date): date is string => Boolean(date))
    .toSorted()[0];
  const detailsId = `oh-fit-source-${source}-details`;

  return (
    <li data-testid={`oh-fit-source-${source}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        disabled={items.length === 0}
        onClick={() => setOpen((value) => !value)}
        className="group flex w-full items-center gap-3 py-2.5 text-left text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:cursor-default"
      >
        <Icon
          className={cn("size-4 shrink-0", worst ? TONE_TEXT[STATUS_TONE[worst]] : "text-slate-300")}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className={cn("font-medium", worst ? "text-brand-navy" : "text-dash-muted")}>{sourceLabel}</span>
          {named.length > 0 ? (
            <span className="ml-2 text-[12.5px] text-dash-muted">{named.map((item) => item.label).join(" · ")}</span>
          ) : null}
        </span>
        {worst ? <StatusLabel status={worst} /> : <span className="shrink-0 text-[12.5px] text-dash-muted">Not on file</span>}
        <span className="w-24 shrink-0 text-right text-[12.5px] tabular-nums text-dash-muted">{expiry ? fmtDate(expiry) : "—"}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-dash-muted transition-transform",
            open && "rotate-180",
            items.length === 0 && "invisible",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul id={detailsId} className="mb-3 ml-7 space-y-2 border-l border-dash-border pl-4">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`} className="text-[12.5px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-brand-navy">{item.label || sourceLabel}</span>
                <StatusLabel status={item.status} />
              </div>
              {item.message ? <p className="mt-0.5 text-dash-muted">{item.message}</p> : null}
              {item.restriction ? <p className="mt-0.5 text-amber-900">Restriction: {item.restriction}</p> : null}
              {item.expires_on ? (
                <p className="mt-0.5 text-dash-muted">
                  Valid to {fmtDate(item.expires_on)} ({relativeDays(daysUntil(item.expires_on))})
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Self-loading summary for the visit panel and the employee record. */
export function FitnessSummary({ customerUuid, ...options }: FitnessSummaryOptions & { customerUuid: string }) {
  const query = useFitWorker(customerUuid);
  if (query.isLoading) return <QuietLoading />;
  if (query.isError) return <LoadError>{errorText(query.error, "Could not load fitness.")}</LoadError>;
  return query.data ? <FitnessSummaryView worker={query.data} {...options} /> : null;
}
