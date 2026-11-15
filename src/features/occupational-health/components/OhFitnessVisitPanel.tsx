"use client";

import Link from "next/link";
import { ArrowUpRight, ClipboardList, FileText } from "lucide-react";

import { ImmStatusBadge, humanize } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useFitWorker } from "@/app/(app)/fitness/_components/shared/FitnessSummary";
import {
  OVERALL_LABEL,
  errorText,
  fmtDate,
  fmtDateTime,
  label,
} from "@/app/(app)/fitness/_components/shared/fit-format";
import {
  SOURCE_ICON,
  STATUS_TONE,
  TONE_DOT,
  TONE_TEXT,
  daysUntil,
  relativeDays,
} from "@/app/(app)/fitness/_components/shared/fit-visual";
import { ROUTES } from "@/constants/routes";
import { certificatePdfUrl } from "@/features/occupational-health/services/oh-ext.service";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import {
  VERDICT_BADGE_TONE,
  checklistProgress,
  currentFitnessCertificate,
  fitVisitChecklist,
  type FitChecklistRow,
} from "@/features/occupational-health/lib/oh-fitness-visit";
import type { FitnessAssessment, FitnessCertificate } from "@/features/occupational-health/types";
import { formatOhDateRange, newestFirst } from "@/features/occupational-health/utils/oh-format";
import { formatFitnessOutcome } from "@/features/occupational-health/utils/oh-labels";
import { cn } from "@/lib/utils";
import type { FitOverall, FitWorker } from "@/features/occupational-health/services/fitness.service";

const VERDICT_LINE: Record<FitOverall, string> = {
  fit: "Cleared for duty.",
  fit_with_restrictions: "Can work within the recorded restrictions.",
  not_fit: "Not cleared until the readiness items below are resolved.",
  unknown: "Not enough on file to decide yet.",
};

const VERDICT_ACCENT: Record<FitOverall, string> = {
  fit: "text-emerald-800",
  fit_with_restrictions: "text-amber-900",
  not_fit: "text-red-800",
  unknown: "text-brand-navy",
};

const VERDICT_DOT: Record<FitOverall, string> = {
  fit: "bg-emerald-500",
  fit_with_restrictions: "bg-amber-500",
  not_fit: "bg-red-500",
  unknown: "bg-sky-500",
};

const ROLE_LABEL: Record<string, string> = {
  cleared: "Cleared",
  restricted: "With restrictions",
  not_cleared: "Not cleared",
  unknown: "Not yet known",
};

const CERT_BADGE_TONE: Record<string, string> = {
  issued: "cleared",
  amended: "expiring",
  withdrawn: "not_cleared",
  superseded: "planned",
};

const HREF: Record<"fitnessBoard" | "fitnessTraining", string> = {
  fitnessBoard: ROUTES.fitnessBoard,
  fitnessTraining: ROUTES.fitnessTraining,
};

/** Employee-form record shown above Medical on a pre-employment visit. */
export type PreEmploymentRecord = {
  status: "not_started" | "in_progress" | "submitted" | "uploaded";
  submittedAt?: string | null;
  documentName?: string | null;
  onOpen: () => void;
};

type OhFitnessVisitPanelProps = {
  customerUuid: string;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
  preEmployment?: PreEmploymentRecord | null;
  certificates?: FitnessCertificate[];
  assessments?: FitnessAssessment[];
};

/** Fit-for-duty panel on an OH visit: verdict first, then a single readiness checklist. */
export function OhFitnessVisitPanel({
  customerUuid,
  onOpenPanel,
  preEmployment = null,
  certificates = [],
  assessments = [],
}: OhFitnessVisitPanelProps) {
  const query = useFitWorker(customerUuid);
  return (
    <div data-testid="oh-fitness-visit-panel">
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load fitness.")}</LoadError> : null}
      {query.data ? (
        <OhFitnessVisitView
          worker={query.data}
          onOpenPanel={onOpenPanel}
          preEmployment={preEmployment}
          certificates={certificates}
          assessments={assessments}
        />
      ) : null}
    </div>
  );
}

export function OhFitnessVisitView({
  worker,
  onOpenPanel,
  preEmployment = null,
  certificates,
  assessments,
}: {
  worker: FitWorker;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
  preEmployment?: PreEmploymentRecord | null;
  certificates: FitnessCertificate[];
  assessments: FitnessAssessment[];
}) {
  const overall: FitOverall = worker.overall in VERDICT_LINE ? worker.overall : "unknown";
  const rows = fitVisitChecklist(worker);
  const progress = checklistProgress(rows);
  const currentCert = currentFitnessCertificate(certificates);
  const validUntil = currentCert?.valid_to ?? worker.earliest_expiry;
  const expiryDays = validUntil ? daysUntil(validUntil) : null;
  const roleTitle = worker.role_clearance.job_title || worker.job_title;
  const roleStatus = label(ROLE_LABEL, worker.role_clearance.status);
  const outcomeByAssessment = new Map(assessments.map((item) => [item.id, item.outcome]));

  return (
    <div className="space-y-8" data-testid="oh-fit-visit">
      <header className="flex items-start justify-between gap-6 border-b border-dash-border pb-4" data-testid="oh-fit-hero">
        <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={cn("size-2.5 shrink-0 rounded-full", VERDICT_DOT[overall])} aria-hidden />
          <h2
            className={cn("text-[22px] leading-tight font-semibold tracking-tight", VERDICT_ACCENT[overall])}
            data-testid="oh-fit-verdict"
          >
            {label(OVERALL_LABEL, overall)}
          </h2>
          <ImmStatusBadge status={VERDICT_BADGE_TONE[overall] ?? "planned"} label={label(OVERALL_LABEL, overall)} />
        </div>
        <p className="text-sm text-dash-muted">{VERDICT_LINE[overall]}</p>
        <p className="text-xs leading-snug text-dash-muted" data-testid="oh-fit-hero-meta">
          {validUntil && expiryDays !== null ? (
            <>
              Valid until {fmtDate(validUntil)}
              <span
                className={cn(
                  "ml-1",
                  expiryDays < 0 ? "text-red-700" : expiryDays <= 60 ? "text-amber-800" : undefined,
                )}
              >
                · {relativeDays(expiryDays)}
              </span>
            </>
          ) : (
            "No expiry on file"
          )}
          {currentCert ? (
            <>
              {" · "}
              Issued {fmtDate(currentCert.signed_at ?? currentCert.valid_from)}
              {currentCert.version ? ` · v${currentCert.version}` : null}
            </>
          ) : null}
          {roleTitle ? (
            <>
              {" · "}
              {roleTitle}
              {roleStatus !== "—" ? ` · ${roleStatus}` : null}
            </>
          ) : null}
          {worker.computed_at ? <> · Updated {fmtDateTime(worker.computed_at)}</> : null}
        </p>
        </div>
        {currentCert ? (
          <a
            href={certificatePdfUrl(currentCert.uuid)}
            target="_blank"
            rel="noreferrer"
            data-testid="oh-fit-download-certificate"
            className="shrink-0 text-sm font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          >
            Download certificate
          </a>
        ) : null}
      </header>

      <section aria-label="Readiness" data-testid="oh-fit-checklist">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 className="text-[13px] font-semibold text-brand-navy">Readiness</h3>
          <p className="text-[12px] tabular-nums text-dash-muted">
            {progress.done} of {progress.total} done
            {progress.flagged > 0 ? ` · ${progress.flagged} flagged` : null}
          </p>
        </div>
        <div
          className="mb-1 h-0.5 overflow-hidden rounded-full bg-dash-border"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
          aria-label="Checks done"
        >
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${progress.total === 0 ? 0 : (progress.done / progress.total) * 100}%` }}
          />
        </div>
        <ol>
          {preEmployment ? <PreEmploymentRow record={preEmployment} /> : null}
          {rows.map((row) => (
            <ChecklistRow
              key={row.source}
              row={row}
              last={false}
              onOpenPanel={onOpenPanel}
            />
          ))}
          <CertificateRow current={currentCert} onOpen={onOpenPanel ? () => onOpenPanel("certificate") : undefined} />
        </ol>
      </section>

      {worker.zones.length > 0 ? (
        <section aria-label="Areas" data-testid="oh-fit-areas">
          <h3 className="mb-1 text-[13px] font-semibold text-brand-navy">Areas</h3>
          <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
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
        <section aria-label="Certificates" data-testid="oh-fit-cert-history">
          <h3 className="mb-1 text-[13px] font-semibold text-brand-navy">Certificates</h3>
          <ol>
            {newestFirst(certificates, (item) => item.signed_at ?? item.valid_from ?? item.created_at).map(
              (certificate, index, list) => {
                const outcome = outcomeByAssessment.get(certificate.assessment);
                return (
                  <li key={certificate.uuid} className="flex gap-3 py-2">
                    <span className="relative flex w-2.5 shrink-0 flex-col items-center">
                      <span
                        className={cn(
                          "mt-1.5 size-2.5 rounded-full",
                          isCurrentCert(certificate, currentCert) ? "bg-emerald-500" : "bg-slate-300",
                        )}
                        aria-hidden
                      />
                      {index < list.length - 1 ? (
                        <span className="mt-1 w-px flex-1 bg-dash-border" aria-hidden />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-brand-navy">
                          {outcome ? `${formatFitnessOutcome(outcome)} · v${certificate.version}` : `v${certificate.version}`}
                        </span>
                        <ImmStatusBadge status={CERT_BADGE_TONE[certificate.status] ?? "planned"} label={humanize(certificate.status)} />
                      </div>
                      <p className="mt-0.5 text-[12px] text-dash-muted">
                        {formatOhDateRange(certificate.valid_from, certificate.valid_to)}
                        {certificate.signed_at ? ` · Signed ${fmtDate(certificate.signed_at)}` : null}
                      </p>
                    </div>
                    {onOpenPanel ? (
                      <button
                        type="button"
                        onClick={() => onOpenPanel("certificate")}
                        className="shrink-0 self-start pt-0.5 text-[12px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
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

function isCurrentCert(certificate: FitnessCertificate, current: FitnessCertificate | null): boolean {
  return current !== null && certificate.uuid === current.uuid;
}

const PRE_EMPLOYMENT_BADGE: Record<PreEmploymentRecord["status"], { label: string; tone: string; detail: string }> = {
  not_started: { label: "Not started", tone: "planned", detail: "No form recorded on this visit." },
  in_progress: { label: "In progress", tone: "expiring", detail: "Started, not submitted." },
  submitted: { label: "Submitted", tone: "cleared", detail: "Submitted" },
  uploaded: { label: "Uploaded", tone: "cleared", detail: "Document uploaded" },
};

function PreEmploymentRow({ record }: { record: PreEmploymentRecord }) {
  const badge = PRE_EMPLOYMENT_BADGE[record.status];
  const detail =
    record.status === "uploaded" && record.documentName
      ? record.documentName
      : record.status === "submitted" && record.submittedAt
        ? `Submitted ${fmtDate(record.submittedAt)}`
        : badge.detail;
  return (
    <li data-testid="oh-fit-check-pre-employment" data-status={record.status} className="flex gap-3">
      <span className="relative flex w-2.5 shrink-0 flex-col items-center">
        <span className={cn("mt-3 size-2.5 rounded-full", TONE_DOT[record.status === "not_started" ? "missing" : record.status === "in_progress" ? "warn" : "good"])} aria-hidden />
        <span className="mt-1 w-px flex-1 bg-dash-border" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 items-start gap-2.5 py-2.5">
        <ClipboardList className="mt-0.5 size-3.5 shrink-0 text-brand-navy" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[13px] font-semibold text-brand-navy">Pre-employment</h4>
            <ImmStatusBadge status={badge.tone} label={badge.label} />
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-dash-muted">{detail}</p>
        </div>
        <button
          type="button"
          onClick={record.onOpen}
          className="shrink-0 pt-0.5 text-[12px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        >
          Open
        </button>
      </div>
    </li>
  );
}

function CertificateRow({
  current,
  onOpen,
}: {
  current: FitnessCertificate | null;
  onOpen?: () => void;
}) {
  const issued = current !== null;
  return (
    <li data-testid="oh-fit-check-certificate" data-status={issued ? "issued" : "not_started"} className="flex gap-3">
      <span className="relative flex w-2.5 shrink-0 flex-col items-center">
        <span className={cn("mt-3 size-2.5 rounded-full", TONE_DOT[issued ? "good" : "missing"])} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 items-start gap-2.5 py-2.5">
        <FileText className={cn("mt-0.5 size-3.5 shrink-0", issued ? "text-emerald-700" : "text-brand-navy")} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[13px] font-semibold text-brand-navy">Certificate of fitness</h4>
            <ImmStatusBadge status={issued ? "cleared" : "planned"} label={issued ? "Issued" : "Not started"} />
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-dash-muted">
            {issued
              ? `Issued ${fmtDate(current.signed_at ?? current.valid_from)}${current.version ? ` · v${current.version}` : ""}`
              : "Open to fill the certificate."}
          </p>
        </div>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="shrink-0 pt-0.5 text-[12px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          >
            Open
          </button>
        ) : null}
      </div>
    </li>
  );
}

function ChecklistRow({
  row,
  last,
  onOpenPanel,
}: {
  row: FitChecklistRow;
  last: boolean;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
}) {
  const Icon = SOURCE_ICON[row.source];
  const tone = STATUS_TONE[row.status];
  const expiry =
    row.expiresOn && row.status !== "missing"
      ? `${fmtDate(row.expiresOn)} · ${relativeDays(daysUntil(row.expiresOn))}`
      : null;
  const extra = row.extraCount > 0 ? `${row.extraCount} more` : null;
  const detail = [row.detail, expiry, extra].filter(Boolean).join(" · ");

  return (
    <li
      data-testid={`oh-fit-check-${row.source}`}
      data-status={row.status}
      data-blocker={row.isBlocker ? "true" : undefined}
      className={cn("flex gap-3", row.isBlocker && "border-l-2 border-red-400 pl-2.5 -ml-2.5")}
    >
      <span className="relative flex w-2.5 shrink-0 flex-col items-center">
        <span className={cn("mt-3 size-2.5 rounded-full", TONE_DOT[tone])} aria-hidden />
        {last ? null : <span className="mt-1 w-px flex-1 bg-dash-border" aria-hidden />}
      </span>
      <div className="flex min-w-0 flex-1 items-start gap-2.5 py-2.5">
        <Icon className={cn("mt-0.5 size-3.5 shrink-0", TONE_TEXT[tone])} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[13px] font-semibold text-brand-navy">{row.label}</h4>
            <ImmStatusBadge status={row.badgeTone} label={row.badge} />
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-dash-muted">{detail}</p>
        </div>
        <ChecklistJump row={row} onOpenPanel={onOpenPanel} />
      </div>
    </li>
  );
}

function ChecklistJump({
  row,
  onOpenPanel,
}: {
  row: FitChecklistRow;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
}) {
  const className =
    "shrink-0 pt-0.5 text-[12px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30";
  if (row.nav.panel && onOpenPanel) {
    return (
      <button type="button" className={className} onClick={() => onOpenPanel(row.nav.panel!)}>
        {row.nav.label}
      </button>
    );
  }
  if (row.nav.href) {
    return (
      <Link href={HREF[row.nav.href]} className={cn(className, "inline-flex items-center gap-0.5")}>
        {row.nav.label}
        <ArrowUpRight className="size-3" aria-hidden />
      </Link>
    );
  }
  return null;
}

