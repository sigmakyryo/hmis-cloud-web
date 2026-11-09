"use client";

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
import { sessionFormStepKey, sessionFormSteps, type SessionFormStep } from "@/features/occupational-health/lib/oh-session-forms";
import type { EmploymentEpisode, OhVisitEncounter } from "@/features/occupational-health/types";
import { cn } from "@/lib/utils";

type OhSessionFormsProps = {
  encounter: OhVisitEncounter;
  activeStep: string;
  completionRef?: { current: (() => Promise<boolean>) | null };
  cofCompletionRef?: { current: (() => Promise<boolean>) | null };
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
  onSelect,
}: {
  visitTypeName?: string | null;
  steps: SessionFormStep[];
  activeStep: string;
  onSelect: (step: string) => void;
}) {
  return (
    <nav
      aria-label="Visit forms"
      data-testid="oh-session-form-nav"
      className="flex shrink-0 flex-wrap items-center gap-2 border-b border-dash-border bg-white px-5 py-2"
    >
      {visitTypeName ? <span className="mr-1 text-sm font-semibold text-brand-navy">{visitTypeName}</span> : null}
      {steps.map((step) => {
        const key = sessionFormStepKey(step);
        const current = key === activeStep;
        return (
          <button
            key={key}
            type="button"
            aria-current={current ? "page" : undefined}
            onClick={() => onSelect(key)}
            className={current
              ? "rounded-full bg-brand-navy px-3 py-1 text-[13px] font-medium text-white"
              : "rounded-full px-3 py-1 text-[13px] font-medium text-brand-navy hover:bg-brand-tint/50"}
          >
            {step.title}
          </button>
        );
      })}
    </nav>
  );
}

export function OhSessionForms({
  encounter,
  activeStep,
  completionRef,
  cofCompletionRef,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="oh-session-forms">
      {showEmployee ? (
        <section aria-label="Employee form" className="flex min-h-0 flex-1 flex-col">
          <OhSessionEmployeeForm
            encounter={encounter}
            records={workspace.employeeForms}
            onSaved={workspace.refetchAll}
          />
        </section>
      ) : null}

      {/* Keep exam + certificate mounted so Complete can flush both in one click. */}
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
            locked={false}
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
