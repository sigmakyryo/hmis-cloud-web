"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";

import { OhCertificateForm } from "@/features/occupational-health/components/OhCertificateTabPanel";
import { OhCertificateReadiness } from "@/features/occupational-health/components/OhCertificateReadiness";
import { OhCertificateRecords } from "@/features/occupational-health/components/OhCertificateRecords";
import { OhMedicalExaminationsPanel } from "@/features/occupational-health/components/OhMedicalExaminationsPanel";
import { OhSessionEmployeeForm } from "@/features/occupational-health/components/OhSessionEmployeeForm";
import { OhVisitTemplateStep } from "@/features/occupational-health/components/OhVisitTemplateStep";
import type { useOhEncounterWorkspaceData } from "@/features/occupational-health/hooks/use-occupational-health";
import { COF_TEMPLATE_RESPONSE_KEY, type OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import {
  isExaminationStepReady,
  sessionFormStepKey,
  sessionFormSteps,
  sessionStepStatus,
  type SessionFormStep,
  type SessionStepStatus,
} from "@/features/occupational-health/lib/oh-session-forms";
import type { EmploymentEpisode, OhVisitEncounter } from "@/features/occupational-health/types";
import { cn } from "@/lib/utils";

type OhSessionFormsProps = {
  encounter: OhVisitEncounter;
  activeStep: string;
  completionRef?: { current: (() => Promise<boolean>) | null };
  cofCompletionRef?: { current: (() => Promise<boolean>) | null };
  employeeContinueRef?: { current: (() => Promise<boolean>) | null };
  completing?: boolean;
  episodes: EmploymentEpisode[];
  workspace: ReturnType<typeof useOhEncounterWorkspaceData>;
  onManageEmployment: () => void;
  focusedExamUuid?: string | null;
  examFocusRequest?: number;
  onActiveExamChange?: (examUuid: string | null) => void;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
  navSlot?: HTMLElement | null;
};

export function OhSessionFormNav({
  steps,
  activeStep,
  statuses,
  onSelect,
  trailingRef,
}: {
  steps: SessionFormStep[];
  activeStep: string;
  statuses: Record<string, SessionStepStatus>;
  onSelect: (step: string) => void;
  /** Receives the right-hand slot of this row so the open step can place its own header there. */
  trailingRef?: (element: HTMLDivElement | null) => void;
}) {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-dash-border bg-white px-5 py-2"
      data-testid="oh-session-form-nav"
    >
      <nav aria-label="Visit forms" className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const key = sessionFormStepKey(step);
          const current = key === activeStep;
          const status = statuses[key] ?? "not_started";
          const locked = status === "locked";
          return (
            <button
              key={key}
              type="button"
              aria-current={current ? "page" : undefined}
              aria-disabled={locked || undefined}
              title={locked ? "Finish the examination before opening this step" : undefined}
              onClick={() => {
                if (!locked) onSelect(key);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
                current && "bg-brand-primary text-white shadow-sm",
                !current && !locked && "bg-brand-tint/60 text-brand-navy hover:bg-brand-tint",
                locked && "cursor-not-allowed bg-dash-canvas text-dash-muted",
              )}
              data-testid={`oh-session-step-${key}`}
              data-status={status}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                  current ? "bg-white/20 text-white" : "bg-white text-brand-primary",
                  locked && "bg-white/70 text-dash-muted",
                )}
              >
                {status === "done" ? <Check className="size-3.5" aria-hidden /> : locked ? <Lock className="size-3" aria-hidden /> : index + 1}
              </span>
              <span>{step.title}</span>
              <span className="sr-only"> ({statusLabel(status)})</span>
            </button>
          );
        })}
      </nav>
      {trailingRef ? <div ref={trailingRef} className="flex flex-wrap items-center gap-3 empty:hidden" /> : null}
    </div>
  );
}

function statusLabel(status: SessionStepStatus): string {
  switch (status) {
    case "done":
      return "Done";
    case "in_progress":
      return "In progress";
    case "locked":
      return "Locked";
    default:
      return "Not started";
  }
}

export function OhSessionForms({
  encounter,
  activeStep,
  completionRef,
  cofCompletionRef,
  employeeContinueRef,
  completing,
  episodes,
  workspace,
  onManageEmployment,
  focusedExamUuid = null,
  examFocusRequest = 0,
  onActiveExamChange,
  onOpenPanel,
  navSlot = null,
}: OhSessionFormsProps) {
  const native = encounter.origin === "laravel";
  const steps = sessionFormSteps(encounter.visit_type ?? null);
  const step = steps.find((item) => sessionFormStepKey(item) === activeStep) ?? steps[0];
  const showEmployee = step?.kind === "employee";
  const showExam = step?.kind === "examination";
  const showCof = step?.kind === "certificate";
  const showAttached = step?.kind === "attached";
  const examReady = isExaminationStepReady(workspace.examinations);
  const [certificateDraft, setCertificateDraft] = useState<{
    wording?: string;
    restrictions?: string[];
  } | null>(null);
  const [certificateDraftSeq, setCertificateDraftSeq] = useState(0);

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="oh-session-forms">
      {showEmployee ? (
        <section aria-label="Employee form" className="flex min-h-0 flex-1 flex-col">
          <OhSessionEmployeeForm
            encounter={encounter}
            records={workspace.employeeForms}
            continueRef={employeeContinueRef}
            onSaved={workspace.refetchAll}
          />
        </section>
      ) : null}

      <section
        aria-label="Examination"
        aria-hidden={!showExam}
        className={cn("min-h-0 flex-1 flex-col", showExam ? "flex" : "hidden")}
        data-testid="oh-session-examination-step"
      >
        <OhMedicalExaminationsPanel
          encounter={encounter}
          completionRef={completionRef}
          completing={completing}
          episodes={episodes}
          workspace={workspace}
          onManageEmployment={onManageEmployment}
          focusedExamUuid={focusedExamUuid}
          examFocusRequest={examFocusRequest}
          onActiveExamChange={onActiveExamChange}
        />
      </section>

      {native ? (
        <section
          aria-label="Certificate of fitness"
          aria-hidden={!showCof}
          className={cn("min-h-0 flex-1 flex-col", showCof ? "flex" : "hidden")}
          data-testid="oh-session-certificate-step"
        >
          <OhVisitTemplateStep
            family="cof"
            title="Certificate of fitness"
            responseKey={COF_TEMPLATE_RESPONSE_KEY}
            encounter={encounter}
            records={workspace.cofResponses}
            locked={!examReady}
            lockReason="Finish and save the examination before opening the certificate."
            completionRef={cofCompletionRef}
            onSaved={workspace.refetchAll}
            onOpenPanel={onOpenPanel}
            headerSlot={showCof ? navSlot : null}
          />
        </section>
      ) : showCof ? (
        <section
          aria-label="Certificate of fitness"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          data-testid="oh-session-certificate-step"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
              <div className="px-5 pt-4">
                <OhCertificateForm
                  assessments={workspace.fitness}
                  visitUuid={encounter.uuid}
                  appliedDraft={certificateDraft}
                  appliedDraftSeq={certificateDraftSeq}
                  hideInlineSuggestion
                  onCreated={workspace.refetchAll}
                />
              </div>
              <div className="border-t border-dash-border px-5 py-4">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-brand-navy">Certificates</h3>
                  <span className="text-[12px] text-dash-muted">
                    {workspace.fitnessCertificates.length} on this encounter
                  </span>
                </div>
                <OhCertificateRecords
                  assessments={workspace.fitness}
                  certificates={workspace.fitnessCertificates}
                  onChanged={workspace.refetchAll}
                />
              </div>
            </div>
            <OhCertificateReadiness
              visitUuid={encounter.uuid}
              onOpenPanel={onOpenPanel}
              showDraft
              collapsible
              onUseDraft={(draft) => {
                setCertificateDraft(draft);
                setCertificateDraftSeq((current) => current + 1);
              }}
              className="max-lg:border-t lg:border-l"
            />
          </div>
        </section>
      ) : null}

      {showAttached ? (
        <section aria-label={step.title} className="px-5 py-4" data-testid="oh-session-attached-form">
          <h2 className="text-sm font-semibold text-brand-navy">{step.title}</h2>
          <p className="mt-1 text-sm text-dash-muted">Included with this visit type.</p>
        </section>
      ) : null}
    </div>
  );
}

export function buildSessionStepStatuses(
  steps: SessionFormStep[],
  workspace: ReturnType<typeof useOhEncounterWorkspaceData>,
): Record<string, SessionStepStatus> {
  const employee = workspace.employeeForms.find((row) => row.is_active !== false) ?? null;
  const statuses: Record<string, SessionStepStatus> = {};
  for (const step of steps) {
    statuses[sessionFormStepKey(step)] = sessionStepStatus(step, {
      employeeForm: employee,
      examinations: workspace.examinations,
      cofResponses: workspace.cofResponses,
    });
  }
  return statuses;
}
