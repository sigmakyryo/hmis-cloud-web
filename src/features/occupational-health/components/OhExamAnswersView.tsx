"use client";

import type { ExamAnswerSectionView } from "@/features/occupational-health/lib/exam-answers-display";
import { formatCompletedAt } from "@/features/occupational-health/lib/exam-answers-display";

type OhExamAnswersViewProps = {
  heading?: string;
  sections: ExamAnswerSectionView[];
  completedAt?: string | null;
  completedBy?: string | null;
  notes?: string | null;
  pdfUrl?: string | null;
  onEdit?: (() => void) | null;
  testId?: string;
};

/** Clean read-only answers for a completed exam or certificate-of-fitness response. */
export function OhExamAnswersView({
  heading,
  sections,
  completedAt,
  completedBy,
  notes,
  pdfUrl,
  onEdit,
  testId = "oh-exam-answers-view",
}: OhExamAnswersViewProps) {
  const when = formatCompletedAt(completedAt);
  const meta = [when ? `Completed ${when}` : null, completedBy ? `by ${completedBy}` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-5" data-testid={testId}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {heading ? <h2 className="text-[15px] font-semibold text-brand-navy">{heading}</h2> : null}
            <span
              className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-800"
              data-testid="oh-exam-answers-status"
            >
              Completed
            </span>
          </div>
          {meta ? <p className="text-[11px] text-dash-muted">{meta}</p> : null}
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
      {sections.map((section) => (
        <section key={section.code} className="space-y-2" data-testid={`oh-exam-answers-section-${section.code}`}>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-dash-muted">{section.name}</h3>
          <dl className="grid grid-cols-[minmax(7rem,11rem)_1fr] gap-x-4 gap-y-1.5">
            {section.rows.map((row) => (
              <div key={row.key} className="contents">
                <dt className="text-[12px] text-dash-muted">{row.label}</dt>
                <dd className={row.empty ? "text-[12px] italic text-dash-muted" : "text-[12px] text-brand-navy"}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {notes?.trim() ? <p className="text-[12px] text-dash-muted">{notes.trim()}</p> : null}
    </div>
  );
}
