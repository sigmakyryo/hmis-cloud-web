"use client";

import { differenceInCalendarDays, differenceInCalendarMonths, isValid, parse, parseISO, startOfDay } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type ExamAnswerGroup,
  type ExamAnswerHighlight,
  type ExamAnswerRow,
  type ExamAnswerSectionView,
  type ExamAnswerSummary,
  formatCompletedAt,
  sectionAnswerRows,
} from "@/features/occupational-health/lib/exam-answers-display";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import {
  pdfExportSections,
  withPdfInclude,
  type PdfExportSection,
  type VisitEvidenceLine,
} from "@/features/occupational-health/lib/visit-evidence";
import { cn } from "@/lib/utils";

export type ExamAnswerSubject = {
  name?: string | null;
  employeeNumber?: string | null;
  role?: string | null;
};

type OhExamAnswersViewProps = {
  heading?: string;
  detail?: string;
  subject?: ExamAnswerSubject | null;
  family?: "exam" | "cof";
  sections: ExamAnswerSectionView[];
  summary?: ExamAnswerSummary | null;
  completedAt?: string | null;
  completedBy?: string | null;
  notes?: string | null;
  pdfUrl?: string | null;
  onEdit?: (() => void) | null;
  testId?: string;
  evidence?: VisitEvidenceLine[];
  evidenceLoading?: boolean;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
};

type OutcomeTone = "fit" | "restricted" | "unfit" | "neutral";

/** Semantic accent for a certificate verdict. Restricted is checked before fit. */
export function outcomeTone(outcome: string | undefined): OutcomeTone {
  const text = (outcome ?? "").toLowerCase();
  if (!text) {
    return "neutral";
  }
  if (/\bunfit\b|not fit|failed|unfit for/.test(text)) {
    return "unfit";
  }
  if (/restrict|limited|conditional/.test(text)) {
    return "restricted";
  }
  if (/\bfit\b/.test(text)) {
    return "fit";
  }
  return "neutral";
}

const TONE_BADGE: Record<OutcomeTone, string> = {
  fit: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  restricted: "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  unfit: "bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  neutral: "bg-transparent text-dash-muted ring-1 ring-dash-border",
};

const TONE_LABEL: Record<OutcomeTone, string> = {
  fit: "Fit",
  restricted: "Restricted",
  unfit: "Unfit",
  neutral: "",
};

const VITAL_SHORT: Record<string, string> = {
  "blood pressure": "BP",
  bp: "BP",
  "heart rate": "HR",
  pulse: "HR",
  hr: "HR",
  temperature: "Temp",
  temp: "Temp",
  weight: "Weight",
  height: "Height",
  bmi: "BMI",
  spo2: "SpO2",
  oxygen: "SpO2",
};

export type ValidityDescription = {
  label: string;
  remaining: string | null;
  remainingTone: "ok" | "soon" | "expired" | null;
};

/** Duration and remaining-time copy for a certificate validity window. */
export function describeValidity(
  validFrom: string | null | undefined,
  validTo: string | null | undefined,
  now: Date = new Date(),
): ValidityDescription | null {
  if (!validFrom && !validTo) {
    return null;
  }
  const from = validFrom ? parseDisplayDate(validFrom) : null;
  const to = validTo ? parseDisplayDate(validTo) : null;
  const span = from && to ? formatSpan(from, to) : null;
  const range =
    validFrom && validTo
      ? `Valid ${validFrom} → ${validTo}`
      : validTo
        ? `Valid until ${validTo}`
        : `Valid from ${validFrom}`;
  const label = span ? `${range} · ${span}` : range;
  if (!to) {
    return { label, remaining: null, remainingTone: null };
  }
  const days = differenceInCalendarDays(startOfDay(to), startOfDay(now));
  if (days < 0) {
    return { label, remaining: "Expired", remainingTone: "expired" };
  }
  const months = differenceInCalendarMonths(startOfDay(to), startOfDay(now));
  const remaining =
    months >= 2 ? `${months} months left` : days === 0 ? "Expires today" : days === 1 ? "1 day left" : `${days} days left`;
  const remainingTone: ValidityDescription["remainingTone"] = days < 30 ? "soon" : "ok";
  return { label, remaining, remainingTone };
}

function parseDisplayDate(value: string): Date | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const iso = parseISO(trimmed.length === 10 ? trimmed : trimmed);
    if (isValid(iso)) {
      return iso;
    }
  }
  const parsed = parse(trimmed, "d MMM yyyy", new Date());
  return isValid(parsed) ? parsed : null;
}

function formatSpan(from: Date, to: Date): string | null {
  const months = differenceInCalendarMonths(startOfDay(to), startOfDay(from));
  const days = differenceInCalendarDays(startOfDay(to), startOfDay(from));
  if (months >= 1) {
    return months === 1 ? "1 month" : `${months} months`;
  }
  if (days >= 1) {
    return days === 1 ? "1 day" : `${days} days`;
  }
  return null;
}

export function formatSubjectLine(subject?: ExamAnswerSubject | null): string | null {
  if (!subject) {
    return null;
  }
  const parts = [subject.name, subject.employeeNumber, subject.role]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Worker identity already on the visit encounter / employment episode — no extra fetch. */
export function visitAnswerSubject(
  encounter: {
    customer_name?: string | null;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    customer_identifier?: string | null;
  },
  episode?: { employee_number?: string | null } | null,
): ExamAnswerSubject {
  const assembled = [encounter.first_name, encounter.middle_name, encounter.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
  const name = encounter.customer_name?.trim() || assembled || null;
  const employeeNumber = episode?.employee_number?.trim() || encounter.customer_identifier?.trim() || null;
  return { name, employeeNumber, role: null };
}

function formatSigned(completedBy: string | null | undefined, when: string | null): string | null {
  if (completedBy && when) {
    return `Signed by ${completedBy} · ${when}`;
  }
  if (completedBy) {
    return `Signed by ${completedBy}`;
  }
  if (when) {
    return `Signed ${when}`;
  }
  return null;
}

function shortVitalLabel(label: string): string {
  const key = label.trim().toLowerCase();
  return VITAL_SHORT[key] ?? (label.length > 16 ? label.slice(0, 14) : label);
}

export function splitVitalValue(value: string): { amount: string; unit: string | null } {
  const match = value.trim().match(/^(.+?)\s+([^\d\s][^\s]*)$/);
  if (match?.[1] && match[2]) {
    return { amount: match[1], unit: match[2] };
  }
  return { amount: value, unit: null };
}

function sectionEmptyCount(section: ExamAnswerSectionView): number {
  return sectionAnswerRows(section).filter((row) => row.empty).length;
}

function sectionFilledCount(section: ExamAnswerSectionView): number {
  const rows = sectionAnswerRows(section).filter((row) => !row.empty).length;
  const chips = section.groups.reduce((total, group) => total + (group.chips?.length ?? 0), 0);
  return rows + chips;
}

/** Initials from a worker or clinician name, skipping a leading title. */
export function subjectInitials(name: string | null | undefined): string {
  const cleaned = (name ?? "").replace(/^(dr|prof|mr|mrs|ms|miss)\.?\s+/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return `${first ?? ""}${last ?? ""}`.toUpperCase();
}

function sectionTotal(sections: ExamAnswerSectionView[]): { filled: number; total: number } {
  const filled = sections.reduce((sum, section) => sum + sectionFilledCount(section), 0);
  const empty = sections.reduce((sum, section) => sum + sectionEmptyCount(section), 0);
  return { filled, total: filled + empty };
}

function statusBadgeClass(tone: VisitEvidenceLine["tone"] | "expired" | OutcomeTone): string {
  if (tone === "ok" || tone === "fit") {
    return TONE_BADGE.fit;
  }
  if (tone === "attention" || tone === "needed" || tone === "restricted") {
    return TONE_BADGE.restricted;
  }
  if (tone === "unfit" || tone === "expired") {
    return TONE_BADGE.unfit;
  }
  return "text-dash-muted ring-1 ring-dash-border";
}

function Badge({
  children,
  tone,
  testId,
}: {
  children: string;
  tone?: VisitEvidenceLine["tone"] | "expired" | OutcomeTone | null;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center px-1.5 py-px text-[10px] font-medium leading-4",
        statusBadgeClass(tone ?? "muted"),
      )}
    >
      {children}
    </span>
  );
}

/** Read-only completed exam or certificate, led by the outcome and visit evidence. */
export function OhExamAnswersView({
  heading,
  family,
  subject,
  sections,
  summary,
  completedAt,
  completedBy,
  notes,
  pdfUrl,
  onEdit,
  testId,
  evidence,
  evidenceLoading = false,
  onOpenPanel,
}: OhExamAnswersViewProps) {
  const kind = family ?? (summary?.outcome ? "cof" : "exam");
  const when = formatCompletedAt(completedAt);
  const headerMeta = [completedBy, when].filter(Boolean).join(" · ") || null;
  const signed = formatSigned(completedBy, when);
  const validity = summary ? describeValidity(summary.validFrom, summary.validTo) : null;
  const tone = outcomeTone(summary?.outcome);
  const vitals = (summary?.highlights ?? []).filter((item) => item.role === "vital");
  const findings = (summary?.highlights ?? []).filter((item) => item.role !== "vital");
  const { filled, total } = sectionTotal(sections);
  const hasSignature =
    sections.some((section) => sectionAnswerRows(section).some((row) => Boolean(row.previewSrc))) || Boolean(signed);
  const hasFitness = Boolean(summary?.outcome) || (summary?.restrictions.length ?? 0) > 0;
  const exportSections = pdfExportSections({
    family: kind,
    hasAnswers: filled > 0,
    hasFitness,
    hasSignature,
    evidence: evidence ?? [],
  });
  const title = heading ?? (kind === "cof" ? "Certificate of fitness" : "Examination");
  const showOutcome = kind === "cof" && Boolean(summary?.outcome || validity || (summary?.restrictions.length ?? 0) || signed);

  return (
    <article className="min-w-0 bg-transparent text-[13px] leading-5 text-brand-navy" data-testid={testId ?? "oh-exam-answers-view"}>
      <AnswersHeader
        title={title}
        subject={subject}
        status="Completed"
        meta={headerMeta}
        validity={kind === "cof" ? validity : null}
        validTo={summary?.validTo}
        validFrom={summary?.validFrom}
        onEdit={onEdit}
        pdfUrl={pdfUrl}
        exportSections={exportSections}
      />

      {kind === "cof" ? (
        <>
          {showOutcome ? (
            <OutcomeBlock
              outcome={summary?.outcome}
              tone={tone}
              restrictions={summary?.restrictions ?? []}
              signed={signed}
            />
          ) : null}
          <EvidenceList
            title="Visit evidence"
            lines={evidence ?? []}
            loading={evidenceLoading}
            onOpenPanel={onOpenPanel}
          />
          <FormAnswers sections={sections} defaultOpen={false} filled={filled} total={total} />
        </>
      ) : (
        <>
          {vitals.length > 0 || findings.length > 0 ? <ExamHighlights vitals={vitals} findings={findings} /> : null}
          <FormAnswers sections={sections} defaultOpen filled={filled} total={total} />
          {notes ? (
            <section className="mt-5 border-t border-dash-border pt-4">
              <h3 className="text-[12px] font-semibold text-brand-navy">Notes</h3>
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-brand-navy">{notes}</p>
            </section>
          ) : null}
          <EvidenceList
            title="Related checks"
            lines={evidence ?? []}
            loading={evidenceLoading}
            onOpenPanel={onOpenPanel}
          />
        </>
      )}
    </article>
  );
}

function AnswersHeader({
  title,
  subject,
  status,
  meta,
  validity,
  validTo,
  validFrom,
  onEdit,
  pdfUrl,
  exportSections,
}: {
  title: string;
  subject?: ExamAnswerSubject | null;
  status: string;
  meta: string | null;
  validity?: ValidityDescription | null;
  validTo?: string | null;
  validFrom?: string | null;
  onEdit?: (() => void) | null;
  pdfUrl?: string | null;
  exportSections: PdfExportSection[];
}) {
  const subjectLine = formatSubjectLine(subject);
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-dash-border pb-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className="text-[15px] font-semibold tracking-tight text-brand-navy">{title}</h2>
          <Badge tone="ok" testId="oh-exam-answers-status">
            {status}
          </Badge>
        </div>
        {subjectLine ? (
          <p className="mt-1 text-[12px] text-dash-muted" data-testid="oh-exam-answers-subject">
            {subjectLine}
          </p>
        ) : null}
        {meta || validity ? (
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-[12px] text-dash-muted">
            {meta ? <p className="tabular-nums">{meta}</p> : null}
            {validity ? <ValidityMeta validity={validity} validTo={validTo} validFrom={validFrom} /> : null}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            data-testid="oh-exam-answers-edit"
            className="inline-flex items-center px-2.5 py-1 text-[12px] font-medium text-brand-navy ring-1 ring-dash-border transition-colors hover:bg-transparent hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          >
            Edit
          </button>
        ) : null}
        {pdfUrl ? <ExportDialog pdfUrl={pdfUrl} sections={exportSections} /> : null}
      </div>
    </header>
  );
}

function ValidityMeta({
  validity,
  validTo,
  validFrom,
}: {
  validity: ValidityDescription;
  validTo?: string | null;
  validFrom?: string | null;
}) {
  const until = (validTo ?? "").trim();
  const from = (validFrom ?? "").trim();
  const headline = until ? `Valid until ${until}` : from ? `Valid from ${from}` : validity.label;
  return (
    <p className="tabular-nums" data-testid="oh-exam-answers-validity">
      <span>{headline}</span>
      {validity.remaining ? (
        <>
          {" · "}
          {validity.remainingTone === "expired" ? (
            <Badge tone="expired" testId="oh-exam-answers-remaining">
              {validity.remaining}
            </Badge>
          ) : (
            <span data-testid="oh-exam-answers-remaining">{validity.remaining}</span>
          )}
        </>
      ) : null}
    </p>
  );
}

function OutcomeBlock({
  outcome,
  tone,
  restrictions,
  signed,
}: {
  outcome?: string;
  tone: OutcomeTone;
  restrictions: string[];
  signed: string | null;
}) {
  const badge = TONE_LABEL[tone];
  return (
    <section className="mt-5 border-b border-dash-border pb-5" data-testid="oh-exam-answers-outcome" data-tone={tone}>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-dash-muted">Fitness outcome</h3>
      {outcome ? (
        <p className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-brand-navy">{outcome}</span>
          {badge ? <Badge tone={tone}>{badge}</Badge> : null}
        </p>
      ) : null}
      {restrictions.length ? (
        <div className="mt-3">
          <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-dash-muted">Restrictions</h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-4" data-testid="oh-exam-answers-restrictions">
            {restrictions.map((line) => (
              <li key={line} className="text-[13px] text-brand-navy">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {signed ? (
        <p className="mt-3 text-[12px] tabular-nums text-dash-muted" data-testid="oh-exam-answers-signed">
          {signed}
        </p>
      ) : null}
    </section>
  );
}

function EvidenceList({
  title,
  lines,
  loading,
  onOpenPanel,
}: {
  title: string;
  lines: VisitEvidenceLine[];
  loading: boolean;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
}) {
  if (!loading && lines.length === 0) {
    return null;
  }
  return (
    <section className="mt-5" data-testid="oh-exam-answers-evidence">
      <h3 className="text-[12px] font-semibold text-brand-navy">{title}</h3>
      {loading && lines.length === 0 ? (
        <p className="mt-2 text-[12px] text-dash-muted" role="status">
          Loading visit records…
        </p>
      ) : (
        <ul className="mt-2 border-y border-dash-border">
          {lines.map((line) => (
            <EvidenceRow key={line.id} line={line} onOpenPanel={onOpenPanel} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EvidenceRow({
  line,
  onOpenPanel,
}: {
  line: VisitEvidenceLine;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
}) {
  const figure = line.displayValue ?? line.result;
  const actionLabel = line.available ? "Open" : "Record";
  const showResult = Boolean(line.displayValue && line.result && line.result !== line.displayValue);
  return (
    <li
      className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-dash-border py-2 last:border-b-0"
      data-testid={`oh-exam-answers-evidence-${line.id}`}
      data-available={line.available ? "true" : "false"}
    >
      <p className="w-[9.5rem] shrink-0 text-[12px] font-medium text-brand-navy">{line.label}</p>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[12px] tabular-nums", line.available ? "text-brand-navy" : "text-dash-muted")}>
          {figure}
          {line.displayUnit ? <span className="ml-1 text-[11px] text-dash-muted">{line.displayUnit}</span> : null}
        </p>
        {showResult ? <p className="mt-0.5 text-[11px] text-dash-muted">{line.result}</p> : null}
      </div>
      <Badge tone={line.tone}>{line.statusLabel}</Badge>
      {onOpenPanel && line.panel ? (
        <button
          type="button"
          onClick={() => onOpenPanel(line.panel as OhEncounterPanelId)}
          className="shrink-0 text-[12px] font-medium text-dash-muted hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        >
          {actionLabel}
          <span className="sr-only"> {line.label}</span>
        </button>
      ) : null}
    </li>
  );
}

function FormAnswers({
  sections,
  defaultOpen,
  filled,
  total,
}: {
  sections: ExamAnswerSectionView[];
  defaultOpen: boolean;
  filled: number;
  total: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mt-5" data-testid="oh-exam-answers-form">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        data-testid="oh-exam-answers-form-toggle"
        className="flex w-full items-center gap-3 border-b border-dash-border py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-brand-navy">Form answers ({filled})</p>
          <p className="text-[11px] text-dash-muted">
            {filled} of {total} recorded
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-dash-muted transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="mt-4">
          <SectionsList sections={sections} />
        </div>
      ) : null}
    </section>
  );
}

function SectionsList({ sections, className }: { sections: ExamAnswerSectionView[]; className?: string }) {
  return (
    <div className={cn("space-y-5", className)}>
      {sections.map((section) => (
        <SectionBlock key={section.code} section={section} />
      ))}
    </div>
  );
}

function SectionBlock({ section }: { section: ExamAnswerSectionView }) {
  const empty = sectionEmptyCount(section);
  const filled = sectionFilledCount(section);
  const flagged = sectionAnswerRows(section).filter((row) => row.flagged && !row.empty).length;
  const [showEmpty, setShowEmpty] = useState(false);
  return (
    <section data-testid={`oh-exam-answers-section-${section.code}`} id={`oh-answers-${section.code}`}>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-[13px] font-semibold text-brand-navy">{section.name}</h3>
          <Badge tone={flagged > 0 ? "attention" : "muted"}>{flagged > 0 ? `${flagged} flagged` : `${filled} recorded`}</Badge>
        </div>
        {empty > 0 ? (
          <button
            type="button"
            onClick={() => setShowEmpty((current) => !current)}
            data-testid="oh-exam-answers-empty-toggle"
            className="text-[11px] font-medium text-dash-muted hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          >
            {showEmpty ? "Hide empty" : `${empty} not recorded`}
          </button>
        ) : null}
      </div>
      <div className="space-y-3">
        {section.groups.map((group) => (
          <AnswerGroup key={group.code || group.name} group={group} showEmpty={showEmpty} />
        ))}
      </div>
    </section>
  );
}

function ExamHighlights({
  vitals,
  findings,
}: {
  vitals: ExamAnswerHighlight[];
  findings: ExamAnswerHighlight[];
}) {
  return (
    <div className="mt-4 space-y-3" data-testid="oh-exam-answers-highlights">
      {vitals.length ? (
        <ul className="flex flex-wrap border-b border-dash-border">
          {vitals.map((item) => {
            const { amount, unit } = splitVitalValue(item.value);
            return (
              <li
                key={item.key}
                className="flex min-w-[6.5rem] flex-1 flex-col justify-center border-r border-dash-border px-3 py-2.5 last:border-r-0"
                title={item.flagged ? `${item.label}: outside the recorded range` : item.label}
                data-flagged={item.flagged || undefined}
              >
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-dash-muted">
                  {shortVitalLabel(item.label)}
                </span>
                <span className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-[16px] font-semibold tabular-nums tracking-tight",
                      item.flagged ? "text-rose-800 dark:text-rose-300" : "text-brand-navy",
                    )}
                  >
                    {amount}
                  </span>
                  {unit ? <span className="text-[11px] font-normal text-dash-muted">{unit}</span> : null}
                  {item.flagged ? (
                    <>
                      <Badge tone="unfit">Flagged</Badge>
                      <span className="sr-only">Outside the recorded range</span>
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {findings.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {findings.map((item) => (
            <Chip key={item.key}>{item.value}</Chip>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AnswerGroup({ group, showEmpty }: { group: ExamAnswerGroup; showEmpty: boolean }) {
  const rows = group.rows.filter((row) => showEmpty || !row.empty);
  const longRows = rows.filter((row) => isWideRow(row));
  const inlineRows = rows.filter((row) => !isWideRow(row));
  return (
    <div data-testid={group.name ? `oh-exam-answers-group-${group.code}` : undefined}>
      {group.name ? (
        <h4 className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-dash-muted">{group.name}</h4>
      ) : null}
      {group.chips?.length ? (
        <ul className="mb-2 flex flex-wrap gap-1.5" data-testid="oh-exam-answers-chips">
          {group.chips.map((chip) => (
            <Chip key={chip}>{chip}</Chip>
          ))}
        </ul>
      ) : null}
      {inlineRows.length ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6">
          {inlineRows.map((row) => (
            <AnswerField key={row.key} row={row} />
          ))}
        </dl>
      ) : null}
      {longRows.length ? (
        <dl className={inlineRows.length ? "mt-1" : undefined}>
          {longRows.map((row) => (
            <AnswerField key={row.key} row={row} wide />
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function isWideRow(row: ExamAnswerRow): boolean {
  return row.kind === "long" || Boolean(row.previewSrc);
}

function AnswerField({ row, wide = false }: { row: ExamAnswerRow; wide?: boolean }) {
  const tabular = row.kind === "number" || row.kind === "date";
  return (
    <div
      className={cn(
        "border-t border-dash-border py-1.5 first:border-t-0 first:pt-0",
        wide ? "block" : "grid grid-cols-[minmax(0,42%)_minmax(0,58%)] items-baseline gap-x-4",
      )}
      data-testid={`oh-exam-answers-field-${row.key}`}
    >
      <dt className="text-[12px] leading-5 text-dash-muted">{row.label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-[13px] leading-5 text-brand-navy",
          wide && "mt-1",
          tabular && "tabular-nums",
          row.empty && "italic text-dash-muted",
          row.flagged && "text-rose-800 dark:text-rose-300",
        )}
      >
        <AnswerValue row={row} />
      </dd>
    </div>
  );
}

function AnswerValue({ row }: { row: ExamAnswerRow }) {
  if (row.empty) {
    return <>{row.value}</>;
  }
  if (row.previewSrc) {
    return (
      // Signature (or image attachment) is a clinician-drawn data URL from the saved answer.
      // eslint-disable-next-line @next/next/no-img-element -- data:image URLs are not next/image candidates
      <img
        src={row.previewSrc}
        alt={row.label}
        className="h-14 w-auto max-w-[16rem] border border-dash-border bg-transparent object-contain"
      />
    );
  }
  if (row.kind === "boolean") {
    const lowered = row.value.toLowerCase();
    const yes = lowered === "yes";
    const na = lowered === "n/a" || lowered === "na" || lowered === "not applicable" || lowered === "unknown";
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className={cn("size-1.5 rounded-full", yes && !na ? "bg-emerald-600 dark:bg-emerald-400" : "bg-dash-muted")}
          aria-hidden
        />
        {row.value}
      </span>
    );
  }
  if (row.kind === "choice") {
    const parts = row.value.split(", ").map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) {
      return (
        <ul className="flex flex-wrap gap-1">
          {parts.map((part) => (
            <Chip key={part}>{part}</Chip>
          ))}
        </ul>
      );
    }
  }
  if (row.kind === "long") {
    return <span className="whitespace-pre-wrap">{row.value}</span>;
  }
  return <>{row.value}</>;
}

function Chip({ children }: { children: string }) {
  return (
    <li className="inline-flex items-center px-1.5 py-px text-[11px] text-brand-navy ring-1 ring-dash-border">
      {children}
    </li>
  );
}

function ExportDialog({ pdfUrl, sections }: { pdfUrl: string; sections: PdfExportSection[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  function setOpenAndDefaults(next: boolean) {
    if (next) {
      setSelected(sections.filter((section) => section.available).map((section) => section.key));
    }
    setOpen(next);
  }

  function toggle(key: string) {
    setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  const href = withPdfInclude(pdfUrl, selected);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenAndDefaults(true)}
        data-testid="oh-exam-answers-export-pdf"
        className="inline-flex items-center bg-brand-primary px-2.5 py-1 text-[12px] font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
      >
        Export
      </button>
      <Dialog open={open} onOpenChange={setOpenAndDefaults}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export PDF</DialogTitle>
            <DialogDescription>Choose the sections to include. Available records are selected to start.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 text-[12px]">
            <button
              type="button"
              onClick={() => setSelected(sections.map((section) => section.key))}
              className="font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
            >
              Select none
            </button>
          </div>
          <ul className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
            {sections.map((section) => (
              <li key={section.key}>
                <label className="flex cursor-pointer items-center gap-2 py-1 text-[13px] text-brand-navy">
                  <input
                    type="checkbox"
                    checked={selected.includes(section.key)}
                    onChange={() => toggle(section.key)}
                    data-available={section.available ? "true" : "false"}
                    className="size-3.5 accent-brand-primary"
                  />
                  <span className="flex-1">{section.label}</span>
                  {section.note ? <span className="text-[11px] text-dash-muted">{section.note}</span> : null}
                </label>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <a
              href={selected.length > 0 ? href : undefined}
              aria-disabled={selected.length === 0 || undefined}
              onClick={(event) => {
                if (selected.length === 0) {
                  event.preventDefault();
                  return;
                }
                setOpen(false);
              }}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="oh-exam-answers-export-confirm"
              className={cn(
                "inline-flex items-center justify-center bg-brand-primary px-3 py-1.5 text-[13px] font-medium text-white",
                selected.length === 0 && "pointer-events-none opacity-50",
              )}
            >
              Export PDF
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
