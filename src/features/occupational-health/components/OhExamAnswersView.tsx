"use client";

import { useMemo, useState } from "react";

import {
  emptyAnswerCount,
  formatCompletedAt,
  type ExamAnswerFieldKind,
  type ExamAnswerGroup,
  type ExamAnswerRow,
  type ExamAnswerSectionView,
  type ExamAnswerSummary,
} from "@/features/occupational-health/lib/exam-answers-display";
import { cn } from "@/lib/utils";

type OhExamAnswersViewProps = {
  heading?: string;
  sections: ExamAnswerSectionView[];
  summary?: ExamAnswerSummary | null;
  completedAt?: string | null;
  completedBy?: string | null;
  notes?: string | null;
  pdfUrl?: string | null;
  onEdit?: (() => void) | null;
  testId?: string;
};

const JUMP_THRESHOLD = 4;

/** Clean read-only answers for a completed exam or certificate-of-fitness response. */
export function OhExamAnswersView({
  heading,
  sections,
  summary,
  completedAt,
  completedBy,
  notes,
  pdfUrl,
  onEdit,
  testId = "oh-exam-answers-view",
}: OhExamAnswersViewProps) {
  const [showEmpty, setShowEmpty] = useState(false);
  const when = formatCompletedAt(completedAt);
  const meta = [when ? `Completed ${when}` : null, completedBy ? `by ${completedBy}` : null]
    .filter(Boolean)
    .join(" ");
  const emptyCount = emptyAnswerCount(sections);
  const visibleSections = useMemo(
    () => sections.filter((section) => sectionHasVisibleContent(section, showEmpty)).map((section) => ({
      ...section,
      groups: section.groups
        .map((group) => ({
          ...group,
          rows: group.rows.filter((row) => showEmpty || !row.empty),
        }))
        .filter((group) => (group.chips?.length ?? 0) > 0 || group.rows.length > 0 || (showEmpty && group.name)),
    })),
    [sections, showEmpty],
  );
  const outcome = summary?.outcome;
  const validity = summary?.highlights.find((item) => item.role === "validity")?.value;
  const restrictions = summary?.restrictions ?? [];
  const examHighlights = (summary?.highlights ?? []).filter(
    (item) => item.role === "vital" || item.role === "finding",
  );
  const showJump = visibleSections.length >= JUMP_THRESHOLD;

  return (
    <div className="space-y-0" data-testid={testId}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pb-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {heading ? <h2 className="text-[15px] font-semibold text-brand-navy">{heading}</h2> : null}
            <span
              className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-800"
              data-testid="oh-exam-answers-status"
            >
              Completed
            </span>
            {meta ? <p className="text-[11px] text-dash-muted">{meta}</p> : null}
          </div>
          {outcome || validity ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5" data-testid="oh-exam-answers-outcome">
              {outcome ? (
                <p className="text-[14px] font-semibold text-brand-navy">{outcome}</p>
              ) : null}
              {validity ? <p className="text-[12px] text-dash-muted">{validity}</p> : null}
            </div>
          ) : null}
          {restrictions.length ? (
            <ul className="flex flex-wrap gap-1" data-testid="oh-exam-answers-restrictions">
              {restrictions.map((line) => (
                <li
                  key={line}
                  className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-950"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
          {examHighlights.length ? (
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="oh-exam-answers-highlights">
              {examHighlights.map((item) => (
                <li key={item.key} className="text-[12px] text-brand-navy">
                  {item.role === "finding" ? (
                    item.value
                  ) : (
                    <>
                      <span className="text-dash-muted">{item.label} </span>
                      <span className="font-medium">{item.value}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              data-testid="oh-exam-answers-edit"
              className="text-[13px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
            >
              Edit
            </button>
          ) : null}
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="oh-exam-answers-export-pdf"
              className="text-[13px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
            >
              Export PDF
            </a>
          ) : null}
        </div>
      </header>

      {showJump ? (
        <nav
          aria-label="Answer sections"
          className="flex flex-wrap gap-x-3 gap-y-1 border-t border-dash-border pt-2.5 pb-1"
          data-testid="oh-exam-answers-jump"
        >
          {visibleSections.map((section) => (
            <a
              key={section.code}
              href={`#oh-answers-${section.code}`}
              className="text-[11px] font-medium text-brand-primary hover:underline"
            >
              {section.name}
            </a>
          ))}
        </nav>
      ) : null}

      {visibleSections.map((section) => (
        <section
          key={section.code}
          id={`oh-answers-${section.code}`}
          className="border-t border-dash-border py-4"
          data-testid={`oh-exam-answers-section-${section.code}`}
        >
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-dash-muted">
            {section.name}
          </h3>
          <div className={cn(section.groups.length > 1 ? "mt-3 space-y-4" : "mt-2.5")}>
            {section.groups.map((group) => (
              <AnswerGroup key={group.code} group={group} />
            ))}
          </div>
        </section>
      ))}

      {emptyCount > 0 ? (
        <div className="border-t border-dash-border pt-3">
          <button
            type="button"
            onClick={() => setShowEmpty((current) => !current)}
            data-testid="oh-exam-answers-empty-toggle"
            className="text-[12px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
            aria-pressed={showEmpty}
          >
            {showEmpty ? "Hide empty fields" : `Show empty (${emptyCount})`}
          </button>
        </div>
      ) : null}

      {notes?.trim() ? (
        <p className="border-t border-dash-border pt-3 text-[12px] text-dash-muted">{notes.trim()}</p>
      ) : null}

      {!visibleSections.length && emptyCount === 0 ? (
        <p className="border-t border-dash-border py-4 text-[12px] italic text-dash-muted">No answers recorded.</p>
      ) : null}
    </div>
  );
}

function sectionHasVisibleContent(section: ExamAnswerSectionView, showEmpty: boolean): boolean {
  return section.groups.some(
    (group) =>
      (group.chips?.length ?? 0) > 0 ||
      group.rows.some((row) => showEmpty || !row.empty) ||
      (showEmpty && Boolean(group.name)),
  );
}

function AnswerGroup({ group }: { group: ExamAnswerGroup }) {
  const compact = group.rows.filter((row) => row.compact && !row.empty);
  const stacked = group.rows.filter((row) => !compact.includes(row));
  return (
    <div data-testid={group.name ? `oh-exam-answers-group-${group.code}` : undefined}>
      {group.name ? (
        <h4 className="mb-2 text-[12.5px] font-semibold text-brand-navy">{group.name}</h4>
      ) : null}
      {group.chips?.length ? (
        <ul className="mb-2 flex flex-wrap gap-1" data-testid="oh-exam-answers-chips">
          {group.chips.map((chip) => (
            <li
              key={chip}
              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-brand-navy"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}
      {compact.length ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
          {compact.map((row) => (
            <AnswerField key={row.key} row={row} />
          ))}
        </dl>
      ) : null}
      {stacked.length ? (
        <dl className={cn("space-y-2.5", compact.length ? "mt-2.5" : "")}>
          {stacked.map((row) => (
            <AnswerField key={row.key} row={row} wide />
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function AnswerField({ row, wide = false }: { row: ExamAnswerRow; wide?: boolean }) {
  return (
    <div className={wide ? "min-w-0" : "min-w-0"} data-testid={`oh-exam-answers-field-${row.key}`}>
      <dt className="text-[11px] text-dash-muted">{row.label}</dt>
      <dd className={cn("mt-0.5 text-[12.5px] text-brand-navy", row.empty && "italic text-dash-muted")}>
        <AnswerValue kind={row.kind} value={row.value} empty={row.empty} />
      </dd>
    </div>
  );
}

function AnswerValue({
  kind,
  value,
  empty,
}: {
  kind: ExamAnswerFieldKind;
  value: string;
  empty: boolean;
}) {
  if (empty) {
    return <>{value}</>;
  }
  if (kind === "boolean") {
    const yes = value.toLowerCase() === "yes";
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
          yes ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700",
        )}
      >
        {value}
      </span>
    );
  }
  if (kind === "long") {
    return <span className="whitespace-pre-wrap">{value}</span>;
  }
  return <>{value}</>;
}
