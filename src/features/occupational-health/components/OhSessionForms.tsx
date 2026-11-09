"use client";

import { Check, Lock } from "lucide-react";

import { OhCertificateForm } from "@/features/occupational-health/components/OhCertificateTabPanel";
import { OhCertificateRecords } from "@/features/occupational-health/components/OhCertificateRecords";
import { OhMedicalExaminationsPanel } from "@/features/occupational-health/components/OhMedicalExaminationsPanel";
import { OhSessionEmployeeForm } from "@/features/occupational-health/components/OhSessionEmployeeForm";
import { OhVisitTemplateStep } from "@/features/occupational-health/components/OhVisitTemplateStep";
import {
  OhColumnPanel,
  OhEncounterColumns,
} from "@/features/occupational-health/components/OhEncounterColumns";
import type { useOhEncounterWorkspaceData } from "@/features/occupational-health/hooks/use-occupational-health";
import { COF_TEMPLATE_RESPONSE_KEY } from "@/features/occupational-health/lib/oh-encounter-modules";
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
};

export function OhSessionFormNav({
  visitTypeName,
  steps,
  activeStep,
  statuses,
  onSelect,
}: {
  visitTypeName?: string | null;
  steps: SessionFormStep[];
  activeStep: string;
  statuses: Record<string, SessionStepStatus>;
  onSelect: (step: string) => void;
}) {
  return (
    <div
      className="shrink-0 border-b border-dash-border bg-white px-5 py-3"
      data-testid="oh-session-form-nav"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-primary">
            Visit forms
          </p>
          <p className="truncate text-sm font-semibold text-brand-navy">
            {visitTypeName || "Occupational health visit"}
          </p>
        </div>
      </div>
      <nav aria-label="Visit forms" className="mt-3 flex flex-wrap gap-2">
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
}: OhSessionFormsProps) {
  const native = encounter.origin === "laravel";
  const steps = sessionFormSteps(encounter.visit_type ?? null);
  const step = steps.find((item) => sessionFormStepKey(item) === activeStep) ?? steps[0];
  const showEmployee = step?.kind === "employee";
  const showExam = step?.kind === "examination";
  const showCof = step?.kind === "certificate";
  const showAttached = step?.kind === "attached";
  const examReady = isExaminationStepReady(workspace.examinations);

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
          />
        </section>
      ) : showCof ? (
        <section aria-label="Certificate of fitness" className="min-h-0 flex-1 overflow-y-auto">
          <OhEncounterColumns
            sectionKey="certificate"
            form={
              <OhColumnPanel eyebrow="Record" title="Certificate of fitness" className="bg-white">
                <OhCertificateForm assessments={workspace.fitness} onCreated={workspace.refetchAll} />
              </OhColumnPanel>
            }
            records={
              <OhColumnPanel
                eyebrow="This encounter"
                title="Certificates"
                count={workspace.fitnessCertificates.length}
                className="bg-white"
              >
                <OhCertificateRecords
                  assessments={workspace.fitness}
                  certificates={workspace.fitnessCertificates}
                  onChanged={workspace.refetchAll}
                />
              </OhColumnPanel>
            }
          />
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
