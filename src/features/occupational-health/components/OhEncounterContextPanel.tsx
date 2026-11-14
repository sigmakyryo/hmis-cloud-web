"use client";

import { OhEmploymentForm } from "@/features/occupational-health/components/OhEmploymentTabPanel";
import { OhEmploymentRecords } from "@/features/occupational-health/components/OhEmploymentRecords";
import { OhEmployeeImmunizationsPanel } from "@/features/occupational-health/components/OhEmployeeImmunizationsPanel";
import { OhDrugAlcoholVisitPanel } from "@/features/occupational-health/components/OhDrugAlcoholVisitPanel";
import { OhFitnessVisitPanel } from "@/features/occupational-health/components/OhFitnessVisitPanel";
import { OhHealthChecksVisitPanel } from "@/features/occupational-health/components/OhHealthChecksVisitPanel";
import { OhIodVisitPanel } from "@/features/occupational-health/components/OhIodVisitPanel";
import { OhFormSetupRequired } from "@/features/occupational-health/components/OhFormSetupRequired";
import { useVisitRiskProfile } from "@/features/occupational-health/hooks/use-visit-risk-profile";
import { OhSessionForms } from "@/features/occupational-health/components/OhSessionForms";
import {
  OhColumnPanel,
  OhEncounterColumns,
} from "@/features/occupational-health/components/OhEncounterColumns";
import type { useOhEncounterWorkspaceData } from "@/features/occupational-health/hooks/use-occupational-health";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import type { Customer } from "@/features/customers/types/customer.types";
import type { EmploymentEpisode, OhVisitEncounter } from "@/features/occupational-health/types";

type OhEncounterContextPanelProps = {
  activePanel: OhEncounterPanelId;
  activeStep: string;
  encounter: OhVisitEncounter;
  completionRef?: { current: (() => Promise<boolean>) | null };
  cofCompletionRef?: { current: (() => Promise<boolean>) | null };
  employeeContinueRef?: { current: (() => Promise<boolean>) | null };
  completing?: boolean;
  customer: Customer | null;
  episodes: EmploymentEpisode[];
  workspace: ReturnType<typeof useOhEncounterWorkspaceData>;
  onManageEmployment: () => void;
  onShowForms: () => void;
  focusedExamUuid?: string | null;
  examFocusRequest?: number;
  onActiveExamChange?: (examUuid: string | null) => void;
  onOpenPanel?: (panel: OhEncounterPanelId) => void;
  navSlot?: HTMLElement | null;
};

export function OhEncounterContextPanel({
  activePanel,
  activeStep,
  encounter,
  completionRef,
  cofCompletionRef,
  employeeContinueRef,
  completing,
  customer,
  episodes,
  workspace,
  onManageEmployment,
  onShowForms,
  focusedExamUuid = null,
  examFocusRequest = 0,
  onActiveExamChange,
  onOpenPanel,
  navSlot = null,
}: OhEncounterContextPanelProps) {
  const { profile, query: profileQuery } = useVisitRiskProfile(
    episodes,
    activePanel === "fitness" && encounter.is_active !== false,
  );
  const fitnessFormUnavailable = encounter.is_active !== false &&
    (profile?.exam_template_available === false || profile?.cof_template_available === false ||
      workspace.examinations.some((exam) => exam.is_active !== false && exam.template_available === false) ||
      workspace.cofResponses.some((form) => form.is_active !== false && form.template_available === false));

  const forms = (
    <OhSessionForms
      activeStep={activeStep}
      encounter={encounter}
      completionRef={completionRef}
      cofCompletionRef={cofCompletionRef}
      employeeContinueRef={employeeContinueRef}
      completing={completing}
      episodes={episodes}
      workspace={workspace}
      onManageEmployment={onManageEmployment}
      focusedExamUuid={focusedExamUuid}
      examFocusRequest={examFocusRequest}
      onActiveExamChange={onActiveExamChange}
      onOpenPanel={onOpenPanel}
      navSlot={navSlot}
    />
  );

  if (activePanel === "immunizations") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {customer?.uuid ? (
          <OhEmployeeImmunizationsPanel
            customerUuid={customer.uuid}
            encounterUuid={encounter.uuid}
            visitUuid={typeof encounter.visit === "string" ? encounter.visit : null}
            compact
          />
        ) : (
          <p className="text-[13px] text-dash-muted">Customer is required to record immunizations.</p>
        )}
      </div>
    );
  }

  if (activePanel === "health-checks") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {customer?.uuid ? (
          <OhHealthChecksVisitPanel customerUuid={customer.uuid} encounterUuid={encounter.uuid} />
        ) : (
          <p className="text-[13px] text-dash-muted">Customer is required to record health checks.</p>
        )}
      </div>
    );
  }

  if (activePanel === "fitness") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {fitnessFormUnavailable ? (
          <OhFormSetupRequired
            form="fitness forms"
            profile={profile}
            refreshing={profileQuery.isFetching}
            onRecheck={() => {
              workspace.refetchAll();
              if (profileQuery.isEnabled) void profileQuery.refetch();
            }}
          />
        ) : customer?.uuid ? (
          <OhFitnessVisitPanel
            customerUuid={customer.uuid}
            onOpenPanel={onOpenPanel}
            certificates={workspace.fitnessCertificates}
            assessments={workspace.fitness}
          />
        ) : (
          <p className="text-[13px] text-dash-muted">Customer is required to show fitness for duty.</p>
        )}
      </div>
    );
  }

  if (activePanel === "drug-alcohol") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {customer?.uuid ? (
          <OhDrugAlcoholVisitPanel customerUuid={customer.uuid} encounterUuid={encounter.uuid} />
        ) : (
          <p className="text-[13px] text-dash-muted">Customer is required to record drug and alcohol tests.</p>
        )}
      </div>
    );
  }

  if (activePanel === "injuries") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <OhIodVisitPanel
          customer={customer}
          encounter={encounter}
          iodCases={workspace.iodCases}
          onRefresh={() => {
            void workspace.refetchAll();
          }}
        />
      </div>
    );
  }

  if (activePanel !== "employment") {
    return forms;
  }

  return (
    <>
      <div className="hidden">{forms}</div>
      <div className="border-b border-dash-border px-5 py-3">
        <button
          type="button"
          onClick={onShowForms}
          className="text-[13px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        >
          Back to forms
        </button>
      </div>
      <OhEncounterColumns
        sectionKey="employment"
        form={
          <OhColumnPanel eyebrow="Record" title="Employment" className="bg-white">
            <OhEmploymentForm customer={customer} />
          </OhColumnPanel>
        }
        records={
          <OhColumnPanel eyebrow="This encounter" title="Employment" count={episodes.length} className="bg-white">
            <OhEmploymentRecords customer={customer} />
          </OhColumnPanel>
        }
      />
    </>
  );
}
