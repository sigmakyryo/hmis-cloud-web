"use client";

import { OhEmploymentForm } from "@/features/occupational-health/components/OhEmploymentTabPanel";
import { OhEmploymentRecords } from "@/features/occupational-health/components/OhEmploymentRecords";
import { OhEmployeeImmunizationsPanel } from "@/features/occupational-health/components/OhEmployeeImmunizationsPanel";
import { OhDrugAlcoholVisitPanel } from "@/features/occupational-health/components/OhDrugAlcoholVisitPanel";
import { OhFitnessVisitPanel } from "@/features/occupational-health/components/OhFitnessVisitPanel";
import { OhHealthChecksVisitPanel } from "@/features/occupational-health/components/OhHealthChecksVisitPanel";
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
}: OhEncounterContextPanelProps) {
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
        {customer?.uuid ? (
          <OhFitnessVisitPanel customerUuid={customer.uuid} />
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
