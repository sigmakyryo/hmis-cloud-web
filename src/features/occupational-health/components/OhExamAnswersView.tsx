"use client";

import { differenceInCalendarDays, differenceInCalendarMonths, isValid, parse, parseISO, startOfDay } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Award,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Ear,
  Eye,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Moon,
  PersonStanding,
  Ruler,
  Scale,
  ShieldAlert,
  Stethoscope,
  Syringe,
  Thermometer,
  Wind,
  XCircle,
  type LucideIcon,
} from "lucide-react";
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
  type EvidenceBar,
  type EvidenceMeter,
  type EvidenceSpark,
  type EvidenceVisual,
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

const TONE_TEXT: Record<OutcomeTone, string> = {
  fit: "text-emerald-800 dark:text-emerald-300",
  restricted: "text-amber-800 dark:text-amber-300",
  unfit: "text-red-800 dark:text-red-300",
  neutral: "text-brand-navy",
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


function Glyph({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}

const EVIDENCE_ICONS: Record<string, LucideIcon> = {
  exam: Stethoscope,
  vision: Eye,
  hearing: Ear,
  lung: Wind,
  ergonomics: PersonStanding,
  fatigue: Moon,
  "drug-alcohol": FlaskConical,
  immunizations: Syringe,
};

function systemGlyph(code: string, name: string): LucideIcon {
  const key = `${code} ${name}`.toLowerCase();
  if (/vital/.test(key)) return HeartPulse;
  if (/cardio|heart|circulat/.test(key)) return Heart;
  if (/respir|lung|chest|pulmon/.test(key)) return Wind;
  if (/neuro|nervous|brain/.test(key)) return Brain;
  if (/musculo|skel|ortho|bone|joint/.test(key)) return PersonStanding;
  if (/vision|eye|ophthal/.test(key)) return Eye;
  if (/hear|audio|ear/.test(key)) return Ear;
  if (/certificate|fitness|review|outcome/.test(key)) return Award;
  if (/histor|presenting|complaint/.test(key)) return ClipboardList;
  if (/mental|psych/.test(key)) return Brain;
  return FileText;
}

function vitalGlyph(label: string): LucideIcon {
  const key = label.trim().toLowerCase();
  if (/temp/.test(key)) return Thermometer;
  if (/weight|kg|mass/.test(key)) return Scale;
  if (/height|cm|stature/.test(key)) return Ruler;
  if (/heart|pulse|bp|blood pressure|hr\b/.test(key)) return HeartPulse;
  return Activity;
}

function sectionTotal(sections: ExamAnswerSectionView[]): { filled: number; total: number } {
  const filled = sections.reduce((sum, section) => sum + sectionFilledCount(section), 0);
  const empty = sections.reduce((sum, section) => sum + sectionEmptyCount(section), 0);
  return { filled, total: filled + empty };
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
    <article className="min-w-0 text-[13px] leading-5 text-brand-navy" data-testid={testId ?? "oh-exam-answers-view"}>
      <AnswersHeader
        title={title}
        subject={subject}
        status="Completed"
        meta={headerMeta}
        onEdit={onEdit}
        pdfUrl={pdfUrl}
        exportSections={exportSections}
      />

      {kind === "cof" ? (
        <>
          {showOutcome ? (
            <OutcomeHero
              outcome={summary?.outcome}
              tone={tone}
              validity={validity}
              validFrom={summary?.validFrom}
              validTo={summary?.validTo}
              restrictions={summary?.restrictions ?? []}
              signed={signed}
              signedBy={completedBy}
            />
          ) : null}
          <EvidenceGrid
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
            <section className="mt-5">
              <h3 className="text-[13px] font-semibold text-brand-navy">Notes</h3>
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-brand-navy">{notes}</p>
            </section>
          ) : null}
          <EvidenceGrid
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
  onEdit,
  pdfUrl,
  exportSections,
}: {
  title: string;
  subject?: ExamAnswerSubject | null;
  status: string;
  meta: string | null;
  onEdit?: (() => void) | null;
  pdfUrl?: string | null;
  exportSections: PdfExportSection[];
}) {
  const initials = subjectInitials(subject?.name);
  const subjectLine = formatSubjectLine(subject);
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-dash-border pb-4">
      <div className="flex min-w-0 items-center gap-3">
        {initials ? (
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-[13px] font-semibold tracking-wide text-brand-primary dark:bg-brand-primary/20"
          >
            {initials}
          </span>
        ) : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-[17px] font-semibold tracking-tight text-brand-navy">{title}</h2>
            <span
              data-testid="oh-exam-answers-status"
              className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              {status}
            </span>
          </div>
          {subjectLine ? (
            <p className="mt-0.5 truncate text-[12px] text-dash-muted" data-testid="oh-exam-answers-subject">
              {subjectLine}
            </p>
          ) : null}
          {meta ? <p className="text-[12px] tabular-nums text-dash-muted">{meta}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            data-testid="oh-exam-answers-edit"
            className="inline-flex items-center rounded-md border border-dash-border bg-transparent px-3 py-1.5 text-[13px] font-medium text-brand-navy transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          >
            Edit
          </button>
        ) : null}
        {pdfUrl ? <ExportDialog pdfUrl={pdfUrl} sections={exportSections} /> : null}
      </div>
    </header>
  );
}

const HERO_WASH: Record<OutcomeTone, string> = {
  fit: "from-emerald-50/95 via-emerald-50/45 to-transparent dark:from-emerald-500/15 dark:via-emerald-500/5 dark:to-transparent",
  restricted: "from-amber-50/95 via-amber-50/45 to-transparent dark:from-amber-500/15 dark:via-amber-500/5 dark:to-transparent",
  unfit: "from-rose-50/95 via-rose-50/45 to-transparent dark:from-rose-500/15 dark:via-rose-500/5 dark:to-transparent",
  neutral: "from-muted/80 via-muted/30 to-transparent dark:from-white/5 dark:via-white/0 dark:to-transparent",
};

const HERO_EDGE: Record<OutcomeTone, string> = {
  fit: "border-emerald-500/70 dark:border-emerald-400/60",
  restricted: "border-amber-500/70 dark:border-amber-400/60",
  unfit: "border-rose-500/70 dark:border-rose-400/60",
  neutral: "border-dash-border",
};

const HERO_ICON_WRAP: Record<OutcomeTone, string> = {
  fit: "bg-emerald-100/80 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  restricted: "bg-amber-100/80 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  unfit: "bg-rose-100/80 text-rose-800 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
  neutral: "bg-muted text-dash-muted ring-dash-border",
};

const HERO_ICON: Record<OutcomeTone, typeof CheckCircle2> = {
  fit: CheckCircle2,
  restricted: AlertTriangle,
  unfit: XCircle,
  neutral: CheckCircle2,
};

function OutcomeHero({
  outcome,
  tone,
  validity,
  validFrom,
  validTo,
  restrictions,
  signed,
  signedBy,
}: {
  outcome?: string;
  tone: OutcomeTone;
  validity: ValidityDescription | null;
  validFrom?: string | null;
  validTo?: string | null;
  restrictions: string[];
  signed: string | null;
  signedBy?: string | null;
}) {
  const initials = subjectInitials(signedBy);
  return (
    <section
      className={cn("mt-4 border-l-4 bg-gradient-to-r px-5 py-5", HERO_WASH[tone], HERO_EDGE[tone])}
      data-testid="oh-exam-answers-outcome"
      data-tone={tone}
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className={cn("mt-0.5 flex size-14 shrink-0 items-center justify-center rounded-full ring-1", HERO_ICON_WRAP[tone])}
            aria-hidden
          >
            <Glyph icon={HERO_ICON[tone]} className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            {outcome ? (
              <>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.1em] text-dash-muted">Fitness outcome</h3>
                <p className={cn("mt-1 text-[22px] font-semibold leading-tight tracking-tight", TONE_TEXT[tone])}>
                  {outcome}
                </p>
              </>
            ) : null}
            {validity ? (
              <ValidityTrack
                validity={validity}
                validFrom={validFrom}
                validTo={validTo}
              />
            ) : null}
            {restrictions.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5" data-testid="oh-exam-answers-restrictions">
                {restrictions.map((line) => (
                  <li
                    key={line}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-950 dark:bg-amber-500/15 dark:text-amber-200"
                  >
                    <ShieldAlert className="size-3 shrink-0" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
            {signed ? (
              <div className="mt-3 flex items-center gap-2" data-testid="oh-exam-answers-signed">
                {initials ? (
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-[10px] font-semibold text-brand-primary dark:bg-brand-primary/20"
                  >
                    {initials}
                  </span>
                ) : null}
                <p className="text-[12px] tabular-nums text-dash-muted">{signed}</p>
              </div>
            ) : null}
          </div>
        </div>
        {validity?.remaining ? <RemainingRing validity={validity} validFrom={validFrom} validTo={validTo} /> : null}
      </div>
    </section>
  );
}

function validityPlacement(
  validFrom: string | null | undefined,
  validTo: string | null | undefined,
  now: Date = new Date(),
): { todayPct: number; remainingPct: number } | null {
  const to = validTo ? parseDisplayDate(validTo) : null;
  if (!to) {
    return null;
  }
  const from = validFrom ? parseDisplayDate(validFrom) : null;
  const start = from ?? now;
  const total = startOfDay(to).getTime() - startOfDay(start).getTime();
  if (total <= 0) {
    return { todayPct: 1, remainingPct: 0 };
  }
  const elapsed = startOfDay(now).getTime() - startOfDay(start).getTime();
  const remaining = startOfDay(to).getTime() - startOfDay(now).getTime();
  return {
    todayPct: Math.min(1, Math.max(0, elapsed / total)),
    remainingPct: Math.min(1, Math.max(0, remaining / total)),
  };
}

function ValidityTrack({
  validity,
  validFrom,
  validTo,
}: {
  validity: ValidityDescription;
  validFrom?: string | null;
  validTo?: string | null;
}) {
  const place = validityPlacement(validFrom, validTo);
  return (
    <div className="mt-3 max-w-lg">
      <p className="text-[12px] tabular-nums text-dash-muted">{validity.label}</p>
      {place && (validFrom || validTo) ? (
        <div className="mt-2" data-testid="oh-exam-answers-validity-bar">
          <div className="relative h-1.5 rounded-full bg-muted dark:bg-white/10">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                validity.remainingTone === "expired"
                  ? "bg-rose-400 dark:bg-rose-400/80"
                  : validity.remainingTone === "soon"
                    ? "bg-amber-400 dark:bg-amber-400/80"
                    : "bg-brand-primary/70",
              )}
              style={{ width: `${place.todayPct * 100}%` }}
            />
            <span
              aria-hidden
              title="Today"
              className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-navy ring-2 ring-white dark:bg-white dark:ring-brand-navy"
              style={{ left: `${place.todayPct * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-dash-muted">
            <span>{validFrom || "Issued"}</span>
            <span>Today</span>
            <span>{validTo || "Expiry"}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RemainingRing({
  validity,
  validFrom,
  validTo,
}: {
  validity: ValidityDescription;
  validFrom?: string | null;
  validTo?: string | null;
}) {
  const place = validityPlacement(validFrom, validTo);
  const pct = place?.remainingPct ?? (validity.remainingTone === "expired" ? 0 : 1);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const tone = validity.remainingTone;
  const stroke =
    tone === "expired"
      ? "stroke-rose-500 dark:stroke-rose-400"
      : tone === "soon"
        ? "stroke-amber-500 dark:stroke-amber-400"
        : "stroke-emerald-600 dark:stroke-emerald-400";
  return (
    <div
      className="relative size-[4.5rem] shrink-0"
      data-testid="oh-exam-answers-remaining"
      data-tone={tone ?? undefined}
    >
      <svg viewBox="0 0 56 56" className="-rotate-90" aria-hidden>
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          strokeWidth="4"
          className="stroke-muted dark:stroke-white/10"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span
          className={cn(
            "text-[10px] font-semibold leading-tight tabular-nums",
            tone === "expired" && "text-rose-800 dark:text-rose-300",
            tone === "soon" && "text-amber-900 dark:text-amber-300",
            tone === "ok" && "text-emerald-800 dark:text-emerald-300",
          )}
        >
          {validity.remaining}
        </span>
      </div>
    </div>
  );
}

function EvidenceGrid({
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
    <section className="mt-6" data-testid="oh-exam-answers-evidence">
      <h3 className="text-[13px] font-semibold text-brand-navy">{title}</h3>
      {loading && lines.length === 0 ? (
        <p className="mt-2 text-[12px] text-dash-muted" role="status">
          Loading visit records…
        </p>
      ) : (
        <ul className="mt-2 grid grid-cols-1 border-l border-t border-dash-border sm:grid-cols-2 xl:grid-cols-4">
          {lines.map((line) => (
            <EvidenceTile key={line.id} line={line} onOpenPanel={onOpenPanel} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EvidenceTile({
  line,
  onOpenPanel,
}: {
  line: VisitEvidenceLine;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
}) {
  const figure = line.displayValue ?? line.result;
  const actionLabel = line.available ? "Open" : "Record";
  return (
    <li
      className={cn(
        "group relative border-b border-r border-dash-border p-3.5 transition-shadow duration-200 motion-reduce:transition-none",
        "hover:z-10 hover:shadow-sm",
        !line.available && "bg-muted/30 dark:bg-white/5",
      )}
      data-testid={`oh-exam-answers-evidence-${line.id}`}
      data-available={line.available ? "true" : "false"}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            line.available
              ? line.tone === "attention"
                ? "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                : "bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20"
              : "bg-muted text-dash-muted",
          )}
          aria-hidden
        >
          <Glyph icon={EVIDENCE_ICONS[line.id] ?? Activity} className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1 pr-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-dash-muted">{line.label}</p>
          <p
            className={cn(
              "mt-0.5 text-[17px] font-semibold leading-tight tracking-tight tabular-nums",
              line.available ? "text-brand-navy" : "text-dash-muted",
            )}
          >
            {figure}
            {line.displayUnit ? (
              <span className="ml-1 text-[10px] font-medium text-dash-muted">{line.displayUnit}</span>
            ) : null}
          </p>
          {line.displayValue && line.result && line.result !== line.displayValue ? (
            <p className="mt-0.5 truncate text-[11px] text-dash-muted">{line.result}</p>
          ) : null}
          {line.visual ? <EvidenceVisuals visual={line.visual} tone={line.tone} /> : null}
          <div className="mt-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                line.tone === "ok" && "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
                line.tone === "attention" && "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
                line.tone === "needed" && "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
                line.tone === "muted" && "bg-muted text-dash-muted",
              )}
            >
              {line.statusLabel}
            </span>
          </div>
        </div>
      </div>
      {onOpenPanel && line.panel ? (
        <button
          type="button"
          onClick={() => onOpenPanel(line.panel as OhEncounterPanelId)}
          className={cn(
            "absolute top-2.5 right-2 inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-brand-primary transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 motion-reduce:transition-none",
            line.available
              ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              : "opacity-100",
          )}
        >
          {actionLabel}
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="sr-only"> {line.label}</span>
        </button>
      ) : null}
    </li>
  );
}

function EvidenceVisuals({ visual, tone }: { visual: EvidenceVisual; tone: VisitEvidenceLine["tone"] }) {
  return (
    <div className="mt-2 space-y-1.5">
      {visual.spark?.length ? <MiniSpark series={visual.spark} /> : null}
      {visual.bars?.length ? <MiniBars bars={visual.bars} attention={tone === "attention"} /> : null}
      {visual.meter ? <MiniMeter meter={visual.meter} attention={tone === "attention"} /> : null}
    </div>
  );
}

function MiniBars({ bars, attention }: { bars: EvidenceBar[]; attention: boolean }) {
  return (
    <ul className="space-y-1" aria-hidden>
      {bars.map((bar) => {
        const pct = bar.max > 0 ? Math.min(100, Math.max(0, (bar.value / bar.max) * 100)) : 0;
        return (
          <li key={bar.label} className="flex items-center gap-1.5">
            <span className="w-3 text-[9px] font-medium text-dash-muted">{bar.label}</span>
            <span className="h-1.5 min-w-0 flex-1 rounded-full bg-muted dark:bg-white/10">
              <span
                className={cn(
                  "block h-full rounded-full",
                  attention ? "bg-amber-500 dark:bg-amber-400" : "bg-brand-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MiniMeter({ meter, attention }: { meter: EvidenceMeter; attention: boolean }) {
  const pct = meter.max > 0 ? Math.min(100, Math.max(0, (meter.value / meter.max) * 100)) : 0;
  return (
    <div className="h-1.5 rounded-full bg-muted dark:bg-white/10" aria-hidden>
      <div
        className={cn("h-full rounded-full", attention ? "bg-amber-500 dark:bg-amber-400" : "bg-brand-primary")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MiniSpark({ series }: { series: EvidenceSpark[] }) {
  const width = 96;
  const height = 28;
  const pad = 2;
  const allY = series.flatMap((item) => item.points.map((point) => point.y));
  const max = Math.max(80, ...allY);
  const strokes = ["stroke-brand-primary", "stroke-amber-600 dark:stroke-amber-400"];
  function path(points: Array<{ x: string; y: number }>): string {
    if (points.length < 2) {
      return "";
    }
    return points
      .map((point, index) => {
        const x = pad + (index / (points.length - 1)) * (width - 2 * pad);
        const y = pad + (1 - point.y / max) * (height - 2 * pad);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      {series.map((item, index) => (
        <path
          key={item.label}
          d={path(item.points)}
          fill="none"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className={strokes[index % strokes.length]}
        />
      ))}
    </svg>
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
  const ratio = total > 0 ? filled / total : 0;
  return (
    <section className="mt-6" data-testid="oh-exam-answers-form">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        data-testid="oh-exam-answers-form-toggle"
        className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left transition-colors duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 motion-reduce:transition-none"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-brand-navy">Form answers ({filled})</p>
          <p className="text-[11px] text-dash-muted">
            {filled} of {total} recorded
          </p>
        </div>
        <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block dark:bg-white/10" aria-hidden>
          <span className="block h-full rounded-full bg-brand-primary" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-dash-muted transition-transform duration-300 motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="mt-3 animate-in fade-in-0 slide-in-from-top-1 duration-300 motion-reduce:animate-none">
          <SectionsList sections={sections} />
        </div>
      ) : null}
    </section>
  );
}

function SectionsList({ sections, className }: { sections: ExamAnswerSectionView[]; className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex size-7 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20"
            aria-hidden
          >
            <Glyph icon={systemGlyph(section.code, section.name)} className="size-3.5" />
          </span>
          <h3 className="text-[13px] font-semibold text-brand-navy">{section.name}</h3>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              flagged > 0
                ? "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"
                : "bg-muted text-dash-muted",
            )}
          >
            {flagged > 0 ? `${flagged} flagged` : `${filled} recorded`}
          </span>
        </div>
        {empty > 0 ? (
          <button
            type="button"
            onClick={() => setShowEmpty((current) => !current)}
            data-testid="oh-exam-answers-empty-toggle"
            className="text-[11px] font-medium text-dash-muted transition-colors hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          >
            {showEmpty ? "Hide empty" : `${empty} not recorded`}
          </button>
        ) : null}
      </div>
      <div className="space-y-4">
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
    <div className="mt-5 space-y-3" data-testid="oh-exam-answers-highlights">
      {vitals.length ? (
        <ul className="flex flex-wrap border-y border-dash-border">
          {vitals.map((item) => {
            const { amount, unit } = splitVitalValue(item.value);
            return (
              <li
                key={item.key}
                className={cn(
                  "flex min-w-[7.5rem] flex-1 flex-col justify-center gap-1 border-r border-dash-border px-4 py-3 last:border-r-0 transition-shadow duration-200 hover:shadow-sm motion-reduce:transition-none",
                  item.flagged && "bg-rose-50/80 dark:bg-rose-500/10",
                )}
                title={item.flagged ? `${item.label}: outside the recorded range` : item.label}
                data-flagged={item.flagged || undefined}
              >
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em]",
                    item.flagged ? "text-rose-800 dark:text-rose-300" : "text-dash-muted",
                  )}
                >
                  <Glyph icon={vitalGlyph(item.label)} className="size-3.5" />
                  {shortVitalLabel(item.label)}
                </span>
                <span className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-[22px] font-semibold tabular-nums tracking-tight",
                      item.flagged ? "text-rose-800 dark:text-rose-300" : "text-brand-navy",
                    )}
                  >
                    {amount}
                  </span>
                  {unit ? <span className="text-[11px] font-normal text-dash-muted">{unit}</span> : null}
                  {item.flagged ? <span className="sr-only">Outside the recorded range</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {findings.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {findings.map((item, index) => (
            <Chip key={item.key} tone={index % 3}>
              {item.value}
            </Chip>
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
        <h4 className="mb-1.5 text-[12px] font-medium text-dash-muted">{group.name}</h4>
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
        className="h-14 w-auto max-w-[16rem] border border-dash-border bg-dash-panel object-contain"
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

function Chip({ children, tone = 0 }: { children: string; tone?: number }) {
  const wash = [
    "bg-brand-primary/10 text-brand-navy dark:bg-brand-primary/20 dark:text-emerald-100",
    "bg-sky-50 text-sky-950 dark:bg-sky-500/15 dark:text-sky-200",
    "bg-violet-50 text-violet-950 dark:bg-violet-500/15 dark:text-violet-200",
  ];
  return (
    <li className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", wash[tone % wash.length])}>
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
        className="inline-flex items-center rounded-md bg-brand-primary px-3 py-1.5 text-[13px] font-medium text-white transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 motion-reduce:transition-none"
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
                "inline-flex items-center justify-center rounded-md bg-brand-primary px-3 py-1.5 text-[13px] font-medium text-white",
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
