"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  FileDown,
  MinusCircle,
  Pencil,
  Printer,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { differenceInCalendarDays, differenceInCalendarMonths, isValid, parse, parseISO, startOfDay } from "date-fns";
import { useEffect, useMemo, useState, type MouseEvent } from "react";

import {
  type ExamAnswerGroup,
  type ExamAnswerHighlight,
  type ExamAnswerRow,
  type ExamAnswerSectionView,
  type ExamAnswerSummary,
  formatCompletedAt,
  sectionAnswerRows,
} from "@/features/occupational-health/lib/exam-answers-display";
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
  sections: ExamAnswerSectionView[];
  summary?: ExamAnswerSummary | null;
  completedAt?: string | null;
  completedBy?: string | null;
  notes?: string | null;
  pdfUrl?: string | null;
  onEdit?: (() => void) | null;
  testId?: string;
};

const TOC_MIN_SECTIONS = 2;

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

const TONE_ACCENT: Record<OutcomeTone, string> = {
  fit: "border-emerald-600 dark:border-emerald-500",
  restricted: "border-amber-500 dark:border-amber-400",
  unfit: "border-red-600 dark:border-red-500",
  neutral: "border-dash-border",
};

const TONE_ICON: Record<OutcomeTone, typeof CheckCircle2> = {
  fit: CheckCircle2,
  restricted: AlertTriangle,
  unfit: XCircle,
  neutral: MinusCircle,
};

const TONE_ICON_CLASS: Record<OutcomeTone, string> = {
  fit: "text-emerald-600 dark:text-emerald-400",
  restricted: "text-amber-600 dark:text-amber-400",
  unfit: "text-red-600 dark:text-red-400",
  neutral: "text-dash-muted",
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
  const span =
    from && to
      ? formatSpan(from, to)
      : null;
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

function closestScrollParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const overflow = getComputedStyle(current).overflowY;
    if (overflow === "auto" || overflow === "scroll") {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function scrollToSection(event: MouseEvent<HTMLAnchorElement>, code: string) {
  const node = document.getElementById(`oh-answers-${code}`);
  if (!node) {
    return;
  }
  event.preventDefault();
  node.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    history.replaceState(null, "", `#oh-answers-${code}`);
  } catch {
    // Some test environments reject replaceState.
  }
}

/** Document-style read-only answers for a completed exam or certificate of fitness. */
export function OhExamAnswersView({
  heading,
  detail,
  subject,
  sections,
  summary,
  completedAt,
  completedBy,
  notes,
  pdfUrl,
  onEdit,
  testId = "oh-exam-answers-view",
}: OhExamAnswersViewProps) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const when = formatCompletedAt(completedAt);
  const meta = [completedBy, when].filter(Boolean).join(" · ");
  const subjectLine = formatSubjectLine(subject);
  const outcome = summary?.outcome;
  const tone = outcomeTone(outcome);
  const validity = describeValidity(summary?.validFrom, summary?.validTo);
  const restrictions = summary?.restrictions ?? [];
  const vitals = (summary?.highlights ?? []).filter((item) => item.role === "vital");
  const findings = (summary?.highlights ?? []).filter((item) => item.role === "finding");
  const hasOutcome = Boolean(outcome || validity || restrictions.length);
  const signed = hasOutcome ? formatSigned(completedBy, when) : null;

  const prepared = useMemo(
    () =>
      sections.map((section) => {
        const showEmpty = revealed.has(section.code);
        const emptyCount = sectionEmptyCount(section);
        const filledCount = sectionFilledCount(section);
        const groups = section.groups
          .map((group) => ({
            ...group,
            rows: group.rows.filter((row) => showEmpty || !row.empty),
          }))
          .filter(
            (group) => (group.chips?.length ?? 0) > 0 || group.rows.length > 0 || (showEmpty && group.name),
          );
        const hasFilled = filledCount > 0;
        return {
          section,
          groups,
          emptyCount,
          filledCount,
          showEmpty,
          hasFilled,
          hasContent: hasFilled || emptyCount > 0,
        };
      }),
    [sections, revealed],
  );
  const visible = prepared.filter((item) => item.hasContent);
  const showToc = visible.length >= TOC_MIN_SECTIONS;
  const sectionCodes = visible.map((item) => item.section.code);
  const sectionKey = sectionCodes.join("|");
  const firstCode = sectionCodes[0] ?? null;

  useEffect(() => {
    if (!showToc || typeof IntersectionObserver === "undefined") {
      return;
    }
    const codes = sectionKey ? sectionKey.split("|") : [];
    const nodes = codes
      .map((code) => document.getElementById(`oh-answers-${code}`))
      .filter((node): node is HTMLElement => node != null);
    if (!nodes.length) {
      return;
    }
    const root = closestScrollParent(nodes[0]!) ?? null;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const next = visibleEntries[0]?.target.id.replace(/^oh-answers-/, "") ?? null;
        if (next) {
          setActiveCode(next);
        }
      },
      { root, rootMargin: "-15% 0px -65% 0px", threshold: [0, 0.25, 1] },
    );
    for (const node of nodes) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, [showToc, sectionKey]);

  function toggleEmpty(code: string) {
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  return (
    <div
      className={cn(
        "mx-auto w-full",
        showToc
          ? "max-w-[720px] lg:grid lg:max-w-[56rem] lg:grid-cols-[9.25rem_minmax(0,45rem)] lg:items-start lg:gap-x-10 print:grid-cols-1 print:max-w-none"
          : "max-w-[720px] print:max-w-none",
      )}
      data-testid={testId}
    >
      <style>{PRINT_CSS}</style>
      {showToc ? (
        <nav
          aria-label="Answer sections"
          data-testid="oh-exam-answers-jump"
          className="hidden lg:sticky lg:top-6 lg:block lg:self-start lg:pt-10 print:hidden"
        >
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-dash-muted">Sections</p>
          <ol className="space-y-0.5 border-l border-dash-border">
            {visible.map(({ section, filledCount }) => {
              const active = (activeCode ?? firstCode) === section.code;
              return (
                <li key={section.code}>
                  <a
                    href={`#oh-answers-${section.code}`}
                    aria-current={active ? "location" : undefined}
                    onClick={(event) => scrollToSection(event, section.code)}
                    className={cn(
                      "-ml-px flex items-baseline justify-between gap-2 border-l py-1 pl-3 text-[12px] leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
                      active
                        ? "border-brand-navy font-medium text-brand-navy"
                        : "border-transparent text-dash-muted hover:text-brand-navy",
                    )}
                  >
                    <span className="min-w-0 truncate">{section.name}</span>
                    {filledCount > 0 ? (
                      <span className="shrink-0 tabular-nums text-[10px] font-normal text-dash-muted">{filledCount}</span>
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <article className="py-8 sm:py-10 print:py-0">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {heading ? (
                <h2 className="text-[17px] font-semibold tracking-tight text-brand-navy">{heading}</h2>
              ) : null}
              <span
                className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                data-testid="oh-exam-answers-status"
              >
                Completed
              </span>
            </div>
            {subjectLine ? (
              <p className="text-[12px] text-dash-muted" data-testid="oh-exam-answers-subject">
                {subjectLine}
              </p>
            ) : null}
            {detail ? <p className="text-[12px] text-dash-muted">{detail}</p> : null}
            {meta && !signed ? <p className="text-[12px] tabular-nums text-dash-muted">{meta}</p> : null}
          </div>
          <ActionGroup onEdit={onEdit} pdfUrl={pdfUrl} />
        </header>

        {hasOutcome ? (
          <OutcomeBanner
            outcome={outcome}
            tone={tone}
            validity={validity}
            restrictions={restrictions}
            signed={signed}
          />
        ) : null}

        {vitals.length || findings.length ? (
          <ExamHighlights vitals={vitals} findings={findings} />
        ) : null}

        {visible.map(({ section, groups, emptyCount, filledCount, showEmpty }) => (
          <section
            key={section.code}
            id={`oh-answers-${section.code}`}
            className="mt-8 scroll-mt-8 border-t border-dash-border pt-6 print:break-inside-avoid"
            data-testid={`oh-exam-answers-section-${section.code}`}
          >
            <h3 className="flex items-baseline gap-2 text-[13px] font-semibold tracking-tight text-brand-navy">
              {section.name}
              {filledCount > 0 ? (
                <span className="text-[11px] font-normal tabular-nums text-dash-muted">{filledCount}</span>
              ) : null}
            </h3>
            <div className={cn(groups.length > 1 ? "mt-4 space-y-6" : "mt-3")}>
              {groups.map((group) => (
                <AnswerGroup key={group.code} group={group} />
              ))}
            </div>
            {emptyCount > 0 ? (
              <button
                type="button"
                onClick={() => toggleEmpty(section.code)}
                data-testid="oh-exam-answers-empty-toggle"
                aria-pressed={showEmpty}
                className="mt-4 text-[12px] text-dash-muted transition-colors hover:text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 print:hidden"
              >
                {showEmpty ? "Hide empty" : `${emptyCount} not recorded`}
              </button>
            ) : null}
          </section>
        ))}

        {notes?.trim() ? (
          <p className="mt-8 border-t border-dash-border pt-5 text-[13px] leading-6 text-dash-muted">{notes.trim()}</p>
        ) : null}

        {!visible.length ? (
          <p className="mt-8 border-t border-dash-border py-6 text-[13px] italic text-dash-muted">No answers recorded.</p>
        ) : null}
      </article>
    </div>
  );
}

const PRINT_CSS = `
@media print {
  @page { margin: 14mm; }
  [data-testid="oh-cof-readiness"],
  [data-testid="oh-cof-assistant-toggle"],
  [data-testid="oh-cof-footer"],
  [data-testid="oh-encounter-module-nav"] {
    display: none !important;
  }
  [data-testid="oh-exam-answers-view"],
  [data-testid="oh-cof-answers-view"] {
    max-width: none !important;
  }
}
`;

function ActionGroup({
  onEdit,
  pdfUrl,
}: {
  onEdit?: (() => void) | null;
  pdfUrl?: string | null;
}) {
  return (
    <div
      role="group"
      aria-label="Document actions"
      className="flex shrink-0 overflow-hidden rounded-md border border-dash-border bg-dash-panel print:hidden"
    >
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          data-testid="oh-exam-answers-edit"
          className="inline-flex items-center gap-1.5 border-r border-dash-border px-2.5 py-1.5 text-[12px] font-medium text-brand-navy hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30"
        >
          <Pencil className="size-3.5 text-dash-muted" aria-hidden />
          Edit
        </button>
      ) : null}
      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          title="Export PDF"
          aria-label="Export PDF"
          data-testid="oh-exam-answers-export-pdf"
          className="inline-flex items-center gap-1.5 border-r border-dash-border px-2.5 py-1.5 text-[12px] font-medium text-brand-navy hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30"
        >
          <FileDown className="size-3.5 text-dash-muted" aria-hidden />
          PDF
        </a>
      ) : null}
      <button
        type="button"
        title="Print"
        onClick={() => window.print()}
        data-testid="oh-exam-answers-print"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium text-brand-navy hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30"
      >
        <Printer className="size-3.5 text-dash-muted" aria-hidden />
        Print
      </button>
    </div>
  );
}

function OutcomeBanner({
  outcome,
  tone,
  validity,
  restrictions,
  signed,
}: {
  outcome?: string;
  tone: OutcomeTone;
  validity: ValidityDescription | null;
  restrictions: string[];
  signed: string | null;
}) {
  const Icon = TONE_ICON[tone];
  return (
    <div
      className={cn("mt-6 border-l-2 py-1 pl-4", TONE_ACCENT[tone])}
      data-testid="oh-exam-answers-outcome"
      data-tone={tone}
    >
      {outcome ? (
        <div className="flex items-start gap-2">
          <Icon className={cn("mt-0.5 size-5 shrink-0", TONE_ICON_CLASS[tone])} aria-hidden />
          <p className="text-[20px] font-semibold leading-tight tracking-tight text-brand-navy">{outcome}</p>
        </div>
      ) : null}
      {validity ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-[12px] tabular-nums text-dash-muted">{validity.label}</p>
          {validity.remaining ? (
            <span
              data-testid="oh-exam-answers-remaining"
              data-tone={validity.remainingTone ?? undefined}
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                validity.remainingTone === "expired" &&
                  "bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-300",
                validity.remainingTone === "soon" &&
                  "bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
                validity.remainingTone === "ok" &&
                  "bg-muted text-dash-muted",
              )}
            >
              {validity.remaining}
            </span>
          ) : null}
        </div>
      ) : null}
      {restrictions.length ? (
        <ul className="mt-3 space-y-1.5" data-testid="oh-exam-answers-restrictions">
          {restrictions.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[13px] leading-5 text-brand-navy">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-dash-muted" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {signed ? (
        <p className="mt-3 text-[12px] tabular-nums text-dash-muted" data-testid="oh-exam-answers-signed">
          {signed}
        </p>
      ) : null}
    </div>
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
    <div className="mt-6 space-y-3" data-testid="oh-exam-answers-highlights">
      {vitals.length ? (
        <ul className="flex flex-wrap items-stretch">
          {vitals.map((item, index) => {
            const { amount, unit } = splitVitalValue(item.value);
            return (
              <li
                key={item.key}
                className={cn(
                  "flex flex-col justify-center px-4 py-0.5",
                  index > 0 && "border-l border-dash-border",
                  index === 0 && "pl-0",
                  item.flagged && "text-amber-800 dark:text-amber-300",
                )}
                title={item.flagged ? `${item.label}: outside the recorded range` : item.label}
                data-flagged={item.flagged || undefined}
              >
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-dash-muted">
                  {shortVitalLabel(item.label)}
                </span>
                <span className="mt-0.5 flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-[17px] font-semibold tabular-nums tracking-tight",
                      item.flagged ? "text-amber-800 dark:text-amber-300" : "text-brand-navy",
                    )}
                  >
                    {amount}
                  </span>
                  {unit ? <span className="text-[11px] font-normal text-dash-muted">{unit}</span> : null}
                  {item.flagged ? (
                    <span className="sr-only">Outside the recorded range</span>
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

function AnswerGroup({ group }: { group: ExamAnswerGroup }) {
  const longRows = group.rows.filter((row) => isWideRow(row));
  const inlineRows = group.rows.filter((row) => !isWideRow(row));
  return (
    <div data-testid={group.name ? `oh-exam-answers-group-${group.code}` : undefined}>
      {group.name ? (
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-dash-muted">{group.name}</h4>
      ) : null}
      {group.chips?.length ? (
        <ul className="mb-3 flex flex-wrap gap-1.5" data-testid="oh-exam-answers-chips">
          {group.chips.map((chip) => (
            <Chip key={chip}>{chip}</Chip>
          ))}
        </ul>
      ) : null}
      {inlineRows.length ? (
        <dl>
          {inlineRows.map((row) => (
            <AnswerField key={row.key} row={row} />
          ))}
        </dl>
      ) : null}
      {longRows.length ? (
        <dl className={cn(inlineRows.length ? "mt-1" : "")}>
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
        "group relative -mx-2 rounded-md border-t border-dash-border/80 px-2 py-2 first:border-t-0 first:pt-2 hover:bg-muted/70 print:hover:bg-transparent motion-reduce:transition-none",
        wide ? "block" : "grid grid-cols-[minmax(0,40%)_minmax(0,60%)] items-baseline gap-x-6",
        row.empty && "animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none",
      )}
      data-testid={`oh-exam-answers-field-${row.key}`}
    >
      <dt className="text-[12px] leading-5 text-dash-muted">{row.label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-[13px] leading-5 text-brand-navy",
          wide && "mt-1.5 leading-6",
          tabular && "tabular-nums",
          row.empty && "italic text-dash-muted",
          row.flagged && "text-amber-800 dark:text-amber-300",
        )}
      >
        <AnswerValue row={row} />
        {!row.empty && !row.previewSrc ? <CopyValue text={row.value} label={row.label} /> : null}
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
        className="h-14 w-auto max-w-[16rem] rounded-sm border border-dash-border bg-dash-panel object-contain"
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
          className={cn(
            "size-1.5 rounded-full",
            yes && !na ? "bg-emerald-600 dark:bg-emerald-400" : "bg-dash-muted",
          )}
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

function CopyValue({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      if (!navigator.clipboard?.writeText) {
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      title={copied ? "Copied" : `Copy ${label}`}
      aria-label={copied ? "Copied" : `Copy ${label}`}
      className="absolute top-1.5 right-1 hidden rounded p-1 text-dash-muted hover:bg-muted hover:text-brand-navy group-hover:inline-flex focus-visible:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 print:hidden motion-reduce:transition-none"
    >
      {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
    </button>
  );
}

function Chip({ children }: { children: string }) {
  return (
    <li className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-brand-navy">
      {children}
    </li>
  );
}
