"use client";

import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, Circle } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { QuietLoading, LoadError } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useFitWorker } from "@/app/(app)/fitness/_components/shared/FitnessSummary";
import {
  OVERALL_LABEL,
  errorText,
  fmtDate,
  label,
} from "@/app/(app)/fitness/_components/shared/fit-format";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { ROUTES } from "@/constants/routes";
import type { Customer } from "@/features/customers/types/customer.types";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import {
  buildFitAssessment,
  currentFitnessCertificate,
  type FitAssessmentCard,
  type FitAssessmentSummary,
  type FitAssessmentUiStatus,
} from "@/features/occupational-health/lib/oh-fitness-visit";
import { certificatePdfUrl } from "@/features/occupational-health/services/oh-ext.service";
import type { FitnessAssessment, FitnessCertificate, OhVisitEncounter } from "@/features/occupational-health/types";
import { newestFirst } from "@/features/occupational-health/utils/oh-format";
import { formatFitnessOutcome } from "@/features/occupational-health/utils/oh-labels";
import { cn } from "@/lib/utils";
import type { FitOverall, FitWorker } from "@/features/occupational-health/services/fitness.service";

const HREF: Record<"fitnessBoard" | "fitnessTraining", string> = {
  fitnessBoard: ROUTES.fitnessBoard,
  fitnessTraining: ROUTES.fitnessTraining,
};

const DECISION_BADGE: Record<FitOverall, string> = {
  fit: "border-emerald-200 bg-emerald-50 text-emerald-800",
  fit_with_restrictions: "border-amber-200 bg-amber-50 text-amber-900",
  not_fit: "border-red-200 bg-red-50 text-red-800",
  unknown: "border-amber-200 bg-amber-50 text-amber-900",
};

const STATUS_BADGE: Record<FitAssessmentUiStatus, string> = {
  blocking: "border-red-200 bg-red-50 text-red-700",
  required: "border-amber-200 bg-amber-50 text-amber-800",
  optional: "border-slate-200 bg-slate-50 text-slate-600",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  locked: "border-slate-200 bg-slate-100 text-slate-500",
  expired: "border-red-200 bg-red-50 text-red-700",
  not_applicable: "border-slate-200 bg-slate-50 text-slate-500",
};

/** Employee-form record shown above Medical on a pre-employment visit. */
export type PreEmploymentRecord = {
  status: "not_started" | "in_progress" | "submitted" | "uploaded";
  submittedAt?: string | null;
  documentName?: string | null;
  onOpen: () => void;
};

/** Injury-on-duty row. Null status means no case has been recorded on this visit. */
export type FitnessIodRecord = {
  status: string | null;
};

type OhFitnessVisitPanelProps = {
  customerUuid: string;
  customer?: Customer | null;
  encounter?: OhVisitEncounter | null;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
  preEmployment?: PreEmploymentRecord | null;
  certificates?: FitnessCertificate[];
  assessments?: FitnessAssessment[];
  iod?: FitnessIodRecord | null;
};

/** Fit-for-duty panel on an OH visit: decision summary, then grouped requirement cards. */
export function OhFitnessVisitPanel({
  customerUuid,
  customer = null,
  encounter = null,
  onOpenPanel,
  preEmployment = null,
  certificates = [],
  assessments = [],
  iod = null,
}: OhFitnessVisitPanelProps) {
  const query = useFitWorker(customerUuid);
  return (
    <div data-testid="oh-fitness-visit-panel">
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load fitness.")}</LoadError> : null}
      {query.data ? (
        <OhFitnessVisitView
          worker={query.data}
          customer={customer}
          encounter={encounter}
          onOpenPanel={onOpenPanel}
          preEmployment={preEmployment}
          certificates={certificates}
          assessments={assessments}
          iod={iod}
        />
      ) : null}
    </div>
  );
}

export function OhFitnessVisitView({
  worker,
  customer = null,
  encounter = null,
  onOpenPanel,
  preEmployment = null,
  certificates,
  assessments,
  iod = null,
}: {
  worker: FitWorker;
  customer?: Customer | null;
  encounter?: OhVisitEncounter | null;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
  preEmployment?: PreEmploymentRecord | null;
  certificates: FitnessCertificate[];
  assessments: FitnessAssessment[];
  iod?: FitnessIodRecord | null;
}) {
  const model = useMemo(
    () =>
      buildFitAssessment({
        worker,
        certificates,
        preEmployment: preEmployment
          ? {
              status: preEmployment.status,
              submittedAt: preEmployment.submittedAt,
              documentName: preEmployment.documentName,
            }
          : null,
        iod,
      }),
    [worker, certificates, preEmployment, iod],
  );

  const outcomeByAssessment = useMemo(
    () => new Map(assessments.map((item) => [item.id, item.outcome])),
    [assessments],
  );
  const currentCert = currentFitnessCertificate(certificates);

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-6"
      data-testid="oh-fit-visit"
    >
      {(worker.job_title || worker.site || worker.department || encounter?.hazard_profile_name || currentCert) ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5" data-testid="oh-fit-context-meta">
          <p className="text-[12px] text-dash-muted">
            {[
              worker.employee_number || customer?.customer_identifier || null,
              worker.job_title || worker.role_clearance.job_title || null,
              [worker.department, worker.site].filter(Boolean).join(", ") || null,
              encounter?.hazard_profile_name
                ? `Hazards: ${encounter.hazard_profile_name}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {currentCert ? (
            <div className="flex items-center gap-3">
              <p className="text-[12px] text-dash-muted" data-testid="oh-fit-hero-meta">
                Issued {fmtDate(currentCert.signed_at ?? currentCert.valid_from)}
                {currentCert.version ? ` · v${currentCert.version}` : null}
              </p>
              <a
                href={certificatePdfUrl(currentCert.uuid)}
                target="_blank"
                rel="noreferrer"
                data-testid="oh-fit-download-certificate"
                className="text-[13px] font-medium text-brand-primary hover:underline"
              >
                Download certificate
              </a>
            </div>
          ) : (
            <p className="sr-only" data-testid="oh-fit-hero-meta">
              No certificate issued
            </p>
          )}
        </div>
      ) : (
        <p className="sr-only" data-testid="oh-fit-hero-meta">
          No certificate issued
        </p>
      )}

      <AssessmentSummaryCard
        summary={model.summary}
        onOpenPanel={onOpenPanel}
      />

      <RequirementSection
        title="Needs attention"
        count={model.needsAttention.length}
        testId="oh-fit-needs-attention"
        empty="Nothing needs attention."
      >
        {model.needsAttention.map((card) => (
          <RequirementCard
            key={card.id}
            card={card}
            onOpenPanel={onOpenPanel}
            onOpenPreEmployment={preEmployment?.onOpen}
          />
        ))}
      </RequirementSection>

      {model.locked.length > 0 ? (
        <RequirementSection
          title="Locked"
          count={model.locked.length}
          testId="oh-fit-locked"
        >
          {model.locked.map((card) => (
            <RequirementCard
              key={card.id}
              card={card}
              onOpenPanel={onOpenPanel}
              onOpenPreEmployment={preEmployment?.onOpen}
            />
          ))}
        </RequirementSection>
      ) : null}

      <RequirementSection
        title="Completed"
        count={model.completed.length}
        testId="oh-fit-completed"
        empty="No completed items yet."
      >
        {model.completed.map((card) => (
          <RequirementCard
            key={card.id}
            card={card}
            onOpenPanel={onOpenPanel}
            onOpenPreEmployment={preEmployment?.onOpen}
          />
        ))}
      </RequirementSection>

      {/* Compatibility hooks for existing fitness visit assertions */}
      <div className="sr-only" aria-hidden data-testid="oh-fit-hero">
        <span data-testid="oh-fit-verdict">{label(OVERALL_LABEL, model.summary.overall)}</span>
        <span data-testid="oh-fit-checklist">
          {model.summary.progress.done} of {model.summary.progress.total} done
          {model.summary.progress.flagged > 0
            ? ` · ${model.summary.progress.flagged} flagged`
            : null}
        </span>
      </div>

      {worker.zones.length > 0 ? (
        <section aria-label="Areas" data-testid="oh-fit-areas" className="rounded-xl border border-dash-border bg-white px-4 py-3">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-dash-muted">
            Areas
          </h3>
          <ul className="divide-y divide-dash-border/70">
            {worker.zones.map((zone) => (
              <li key={zone.code} className="flex items-center gap-3 py-2 text-[12.5px]">
                <span className="w-12 shrink-0 font-mono text-[11px] text-dash-muted">{zone.code}</span>
                <span className="min-w-0 flex-1 font-medium text-brand-navy">{zone.name || zone.code}</span>
                <span className="shrink-0 capitalize text-dash-muted">{zone.status.replace(/_/g, " ")}</span>
                <span className="w-24 shrink-0 text-right tabular-nums text-dash-muted">
                  {zone.valid_until ? fmtDate(zone.valid_until) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {certificates.length > 0 ? (
        <section
          aria-label="Certificates"
          data-testid="oh-fit-cert-history"
          className="rounded-xl border border-dash-border bg-white px-4 py-3"
        >
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-dash-muted">
            Certificate history
          </h3>
          <ol className="space-y-2">
            {newestFirst(certificates, (item) => item.signed_at ?? item.valid_from ?? item.created_at).map(
              (certificate) => {
                const outcome = outcomeByAssessment.get(certificate.assessment);
                return (
                  <li
                    key={certificate.uuid}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-brand-navy">
                        {outcome
                          ? `${formatFitnessOutcome(outcome)} · v${certificate.version}`
                          : `v${certificate.version}`}
                      </p>
                      <p className="text-[12px] text-dash-muted">
                        {fmtDate(certificate.valid_from)} – {fmtDate(certificate.valid_to)}
                        {certificate.status !== "issued"
                          ? ` · ${certificate.status.replace(/_/g, " ")}`
                          : null}
                      </p>
                    </div>
                    {onOpenPanel ? (
                      <button
                        type="button"
                        onClick={() => onOpenPanel("certificate")}
                        className="shrink-0 text-[12px] font-medium text-brand-primary hover:underline"
                      >
                        Open
                      </button>
                    ) : null}
                  </li>
                );
              },
            )}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function AssessmentSummaryCard({
  summary,
  onOpenPanel,
}: {
  summary: FitAssessmentSummary;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
}) {
  const pct =
    summary.progress.total === 0
      ? 0
      : Math.round((summary.progress.done / summary.progress.total) * 100);

  return (
    <section
      className="rounded-xl border border-dash-border bg-white p-4 shadow-sm sm:p-5"
      data-testid="oh-fit-summary-card"
      aria-label="Assessment summary"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-medium",
              DECISION_BADGE[summary.overall],
            )}
            data-testid="oh-fit-decision-badge"
          >
            {summary.decisionLabel}
          </span>
          <h3
            className="text-[20px] font-semibold tracking-tight text-brand-navy"
            data-testid="oh-fit-summary-headline"
          >
            {summary.headline}
          </h3>
          <p className="max-w-2xl text-[13px] leading-snug text-dash-muted" data-testid="oh-fit-summary-explanation">
            {summary.explanation}
          </p>
          <div className="pt-1">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={summary.progress.total}
              aria-valuenow={summary.progress.done}
              aria-label="Required items complete"
            >
              <div
                className="h-full rounded-full bg-teal-700 transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[12px] tabular-nums text-dash-muted" data-testid="oh-fit-progress-label">
              {summary.progress.done} of {summary.progress.total} required done
            </p>
          </div>
        </div>
        {summary.cta ? (
          <SummaryCta cta={summary.cta} onOpenPanel={onOpenPanel} />
        ) : null}
      </div>
    </section>
  );
}

function SummaryCta({
  cta,
  onOpenPanel,
}: {
  cta: NonNullable<FitAssessmentSummary["cta"]>;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
}) {
  if (cta.panel && onOpenPanel) {
    return (
      <PrimaryButton
        type="button"
        className="h-10 shrink-0 px-4 text-[13px]"
        data-testid="oh-fit-summary-cta"
        onClick={() => onOpenPanel(cta.panel!)}
      >
        {cta.label}
      </PrimaryButton>
    );
  }
  if (cta.href) {
    return (
      <PrimaryButton asChild className="h-10 shrink-0 px-4 text-[13px]" data-testid="oh-fit-summary-cta">
        <Link href={HREF[cta.href]}>
          {cta.label}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </PrimaryButton>
    );
  }
  return null;
}

function RequirementSection({
  title,
  count,
  testId,
  empty,
  children,
}: {
  title: string;
  count: number;
  testId: string;
  empty?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} data-testid={testId} className="space-y-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-dash-muted">
        {title}
        <span className="font-medium text-slate-400"> · {count}</span>
      </h3>
      {count === 0 && empty ? (
        <p className="rounded-xl border border-dashed border-dash-border bg-white/70 px-4 py-3 text-[13px] text-dash-muted">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2.5">{children}</ul>
      )}
    </section>
  );
}

function RequirementCard({
  card,
  onOpenPanel,
  onOpenPreEmployment,
}: {
  card: FitAssessmentCard;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
  onOpenPreEmployment?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const blocking = card.uiStatus === "blocking";
  const locked = card.uiStatus === "locked";
  const completed = card.group === "completed";
  const testId =
    card.kind === "source"
      ? `oh-fit-check-${card.source}`
      : card.kind === "pre_employment"
        ? "oh-fit-check-pre-employment"
        : card.kind === "iod"
          ? "oh-fit-check-iod"
          : "oh-fit-check-certificate";

  const primaryItems = card.items.slice(0, 1);
  const extraItems = card.items.slice(1);
  const showExpand = completed && extraItems.length > 0;

  return (
    <li
      data-testid={testId}
      data-status={card.status ?? card.uiStatus}
      data-blocker={card.isBlocker ? "true" : undefined}
      data-group={card.group}
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4",
        blocking && "border-red-200 bg-red-50/70",
        locked && "border-slate-200 bg-slate-50",
        !blocking && !locked && "border-dash-border bg-white",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <StatusGlyph uiStatus={card.uiStatus} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={cn(
                "text-[13.5px] font-semibold",
                locked ? "text-slate-500" : "text-brand-navy",
              )}
            >
              {card.title}
            </h4>
            <span
              className={cn(
                "inline-flex h-5 items-center rounded-md border px-1.5 text-[11px] font-medium",
                STATUS_BADGE[card.uiStatus],
              )}
            >
              {card.badgeLabel}
            </span>
          </div>
          <p className={cn("text-[12.5px] leading-snug", locked ? "text-slate-400" : "text-dash-muted")}>
            {cardDescription(card)}
            {showExpand ? (
              <>
                {" · "}
                <button
                  type="button"
                  className="font-medium text-brand-primary hover:underline"
                  onClick={() => setExpanded((value) => !value)}
                  data-testid={`${testId}-expand`}
                >
                  {expanded ? "Show less" : `Show ${extraItems.length} more`}
                  <ChevronDown
                    className={cn("ml-0.5 inline size-3.5 transition", expanded && "rotate-180")}
                    aria-hidden
                  />
                </button>
              </>
            ) : null}
          </p>
          {expanded && showExpand ? (
            <ul className="mt-1.5 space-y-1 border-t border-dash-border/60 pt-2">
              {[...primaryItems, ...extraItems].map((item, index) => (
                <li key={`${item.label}-${index}`} className="text-[12px] text-dash-muted">
                  <span className="font-medium text-brand-navy">{item.label}</span>
                  {item.message ? ` · ${item.message}` : null}
                  {item.expires_on ? ` · valid until ${fmtDate(item.expires_on)}` : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 justify-end sm:pl-2">
        <CardAction
          card={card}
          completed={completed}
          onOpenPanel={onOpenPanel}
          onOpenPreEmployment={onOpenPreEmployment}
        />
      </div>
    </li>
  );
}

function cardDescription(card: FitAssessmentCard): string {
  if (card.kind === "source" && card.group === "completed") {
    const base = card.items[0]?.message || card.description.split(" · valid until")[0];
    return card.expiresOn ? `${base} · valid until ${fmtDate(card.expiresOn)}` : base;
  }
  if (card.kind === "pre_employment" && card.description.startsWith("Submitted ")) {
    const raw = card.description.slice("Submitted ".length);
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return `Submitted ${fmtDate(raw)}`;
    }
  }
  if (card.kind === "certificate" && card.group === "completed" && card.expiresOn) {
    return `${card.description} · valid until ${fmtDate(card.expiresOn)}`;
  }
  return card.description;
}

function StatusGlyph({ uiStatus }: { uiStatus: FitAssessmentUiStatus }) {
  if (uiStatus === "completed") {
    return (
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white" aria-hidden>
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (uiStatus === "blocking" || uiStatus === "expired") {
    return <span className="mt-0.5 size-5 shrink-0 rounded-full bg-red-500" aria-hidden />;
  }
  if (uiStatus === "required") {
    return <Circle className="mt-0.5 size-5 shrink-0 text-amber-500" strokeWidth={2} aria-hidden />;
  }
  if (uiStatus === "locked") {
    return <Circle className="mt-0.5 size-5 shrink-0 text-slate-300" strokeWidth={2} aria-hidden />;
  }
  return <Circle className="mt-0.5 size-5 shrink-0 text-slate-300" strokeWidth={1.5} strokeDasharray="3 3" aria-hidden />;
}

function CardAction({
  card,
  completed,
  onOpenPanel,
  onOpenPreEmployment,
}: {
  card: FitAssessmentCard;
  completed: boolean;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
  onOpenPreEmployment?: () => void;
}) {
  if (card.kind === "pre_employment") {
    if (!onOpenPreEmployment) return null;
    if (completed) {
      return (
        <button
          type="button"
          onClick={onOpenPreEmployment}
          className="text-[12.5px] font-medium text-brand-primary hover:underline"
        >
          {card.actionLabel}
        </button>
      );
    }
    return (
      <SecondaryButton type="button" size="sm" className="h-8 px-3 text-[12px]" onClick={onOpenPreEmployment}>
        {card.actionLabel}
      </SecondaryButton>
    );
  }

  if (card.actionDisabled) {
    return (
      <SecondaryButton type="button" size="sm" className="h-8 px-3 text-[12px]" disabled>
        {card.actionLabel}
      </SecondaryButton>
    );
  }

  if (completed && !card.actionExternal) {
    if (card.nav?.panel && onOpenPanel) {
      return (
        <button
          type="button"
          onClick={() => onOpenPanel(card.nav!.panel!)}
          className="text-[12.5px] font-medium text-brand-primary hover:underline"
        >
          {card.actionLabel}
        </button>
      );
    }
  }

  if (card.nav?.panel && onOpenPanel) {
    if (card.actionPrimary) {
      return (
        <PrimaryButton
          type="button"
          size="sm"
          className="h-8 px-3 text-[12px]"
          onClick={() => onOpenPanel(card.nav!.panel!)}
        >
          {card.actionLabel}
        </PrimaryButton>
      );
    }
    return (
      <SecondaryButton
        type="button"
        size="sm"
        className="h-8 px-3 text-[12px]"
        onClick={() => onOpenPanel(card.nav!.panel!)}
      >
        {card.actionLabel}
      </SecondaryButton>
    );
  }

  if (card.nav?.href) {
    return (
      <SecondaryButton asChild size="sm" className="h-8 px-3 text-[12px]">
        <Link href={HREF[card.nav.href]} className="inline-flex items-center gap-1">
          {card.actionLabel}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </SecondaryButton>
    );
  }

  return null;
}
