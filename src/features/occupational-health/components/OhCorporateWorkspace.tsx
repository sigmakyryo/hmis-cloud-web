"use client";

import type { ReactNode } from "react";

import {
  useOhEmploymentLookups,
} from "@/features/occupational-health/hooks/use-occupational-health";
import type { EmploymentEpisode, OhExamination } from "@/features/occupational-health/types";
import { resolveActiveRiskProfileEpisode } from "@/features/occupational-health/utils/customer-has-risk-profile";
import {
  formatOhDate,
  humanizeOhCode,
  newestFirst,
} from "@/features/occupational-health/utils/oh-format";
import { formatExamTypeLabel } from "@/features/occupational-health/utils/oh-labels";
import { cn } from "@/lib/utils";

const COLUMN_SCROLL_CLASS = "min-h-0 xl:overflow-y-auto";

type OhCorporateWorkspaceProps = {
  form: ReactNode;
  body: ReactNode;
  aside: ReactNode;
};

/** White entry column, gray record well, white facts rail. */
export function OhCorporateWorkspace({
  form,
  body,
  aside,
}: OhCorporateWorkspaceProps) {
  return (
    <div
      className="grid min-h-0 flex-1 grid-cols-1 xl:h-full xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)_18.5rem] xl:grid-rows-[minmax(0,1fr)]"
      data-testid="oh-corporate-workspace"
    >
      <section
        className={cn(
          "border-b border-dash-border bg-white xl:border-b-0 xl:border-r",
          COLUMN_SCROLL_CLASS,
        )}
        aria-label="Record"
      >
        {form}
      </section>
      <section
        className={cn("min-w-0 bg-dash-canvas", COLUMN_SCROLL_CLASS)}
        aria-label="This encounter"
      >
        {body}
      </section>
      <aside
        className={cn(
          "border-t border-dash-border bg-white xl:border-t-0 xl:border-l",
          COLUMN_SCROLL_CLASS,
        )}
        aria-label="Encounter summary"
      >
        {aside}
      </aside>
    </div>
  );
}

type OhExaminationLedgerProps = {
  examinations: OhExamination[];
};

export function OhExaminationLedger({ examinations }: OhExaminationLedgerProps) {
  const sorted = newestFirst(
    examinations,
    (exam) => exam.examined_at ?? exam.created_at,
  );

  if (sorted.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 px-6 py-5" data-testid="oh-exam-ledger">
      {sorted.map((exam) => (
        <article key={exam.uuid}>
          <h2 className="text-[13.5px] font-semibold text-brand-navy">
            {formatExamTypeLabel(exam.exam_type)}
          </h2>
          <p className="mt-1 text-[13px] text-dash-muted">
            {formatOhDate(exam.examined_at ?? exam.created_at)}
          </p>
          {exam.notes ? (
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-brand-slate">
              {exam.notes}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

type OhEncounterSummaryRailProps = {
  examinationCount: number;
  findingCount: number;
  iodCount: number;
  episodes: EmploymentEpisode[];
  onManageEmployment: () => void;
};

export function OhEncounterSummaryRail({
  examinationCount,
  findingCount,
  iodCount,
  episodes,
  onManageEmployment,
}: OhEncounterSummaryRailProps) {
  const episode =
    resolveActiveRiskProfileEpisode(episodes) ??
    [...episodes].sort((left, right) => right.start_date.localeCompare(left.start_date))[0] ??
    null;
  const lookups = useOhEmploymentLookups(Boolean(episode));
  const employerName = episode
    ? (lookups.employerNames.get(episode.employer) ?? "—")
    : "—";
  const jobTitle = episode
    ? (lookups.jobTitleNames.get(episode.job_title) ?? "—")
    : "—";

  return (
    <div className="space-y-8 px-5 py-5" data-testid="oh-encounter-summary-rail">
      <section>
        <h2 className="text-[13.5px] font-semibold text-brand-navy">This encounter</h2>
        <FactList
          rows={[
            { label: "Examinations", value: examinationCount },
            { label: "Findings", value: findingCount },
            { label: "IOD cases", value: iodCount },
          ]}
        />
      </section>
      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[13.5px] font-semibold text-brand-navy">Employment</h2>
          <button
            type="button"
            onClick={onManageEmployment}
            className="text-[13px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          >
            Manage
          </button>
        </div>
        {episode ? (
          <FactList
            rows={[
              { label: "Employer", value: employerName },
              { label: "Job title", value: jobTitle },
              {
                label: "Site",
                value: episode.site ? (
                  <span className="text-brand-primary">{episode.site}</span>
                ) : (
                  "—"
                ),
              },
              { label: "Department", value: episode.department_name || "—" },
              { label: "Employee no.", value: episode.employee_number || "—" },
              { label: "Type", value: humanizeOhCode(episode.employment_type) },
              { label: "Since", value: formatOhDate(episode.start_date) },
              { label: "Fitness req.", value: episode.requires_fitness ? "Yes" : "No" },
            ]}
          />
        ) : (
          <p className="mt-3 text-[13px] text-dash-muted">No employment episode yet.</p>
        )}
      </section>
    </div>
  );
}

function FactList({
  rows,
}: {
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="mt-3 grid grid-cols-[7.25rem_minmax(0,1fr)] gap-y-2 text-[13px]">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-dash-muted">{row.label}</dt>
          <dd className="min-w-0 truncate text-right text-brand-navy">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
