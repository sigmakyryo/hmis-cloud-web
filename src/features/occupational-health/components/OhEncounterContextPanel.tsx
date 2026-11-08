"use client";

import type { Customer } from "@/features/customers/types/customer.types";
import { OhCertificateForm } from "@/features/occupational-health/components/OhCertificateTabPanel";
import { OhCertificateRecords } from "@/features/occupational-health/components/OhCertificateRecords";
import { OhEmploymentForm } from "@/features/occupational-health/components/OhEmploymentTabPanel";
import { OhEmploymentRecords } from "@/features/occupational-health/components/OhEmploymentRecords";
import { OhEncounterModulePlaceholder } from "@/features/occupational-health/components/OhEncounterModulePlaceholder";
import { OhMedicalExaminationsPanel } from "@/features/occupational-health/components/OhMedicalExaminationsPanel";
import { OhVisitTemplateStep } from "@/features/occupational-health/components/OhVisitTemplateStep";
import {
  OhColumnPanel,
  OhEncounterColumns,
} from "@/features/occupational-health/components/OhEncounterColumns";
import type { useOhEncounterWorkspaceData } from "@/features/occupational-health/hooks/use-occupational-health";
import {
  COF_TEMPLATE_RESPONSE_KEY,
  isVisitStepOpen,
  type OhEncounterPanelId,
} from "@/features/occupational-health/lib/oh-encounter-modules";
import type {
  EmploymentEpisode,
  OhVisitEncounter,
} from "@/features/occupational-health/types";

type OhEncounterContextPanelProps = {
  activePanel: OhEncounterPanelId;
  encounter: OhVisitEncounter;
  completionRef?: { current: (() => Promise<boolean>) | null };
  cofCompletionRef?: { current: (() => Promise<boolean>) | null };
  completing?: boolean;
  customer: Customer | null;
  episodes: EmploymentEpisode[];
  workspace: ReturnType<typeof useOhEncounterWorkspaceData>;
  onManageEmployment: () => void;
  focusedExamUuid?: string | null;
  examFocusRequest?: number;
  onActiveExamChange?: (examUuid: string | null) => void;
};

export function OhEncounterContextPanel({
  activePanel,
  encounter,
  completionRef,
  cofCompletionRef,
  completing,
  customer,
  episodes,
  workspace,
  onManageEmployment,
  focusedExamUuid = null,
  examFocusRequest = 0,
  onActiveExamChange,
}: OhEncounterContextPanelProps) {
  const native = encounter.origin === "laravel";
  const saved = {
    exam: workspace.examinations.some((exam) => (exam.row_version ?? 0) > 1),
  };
  const cofLocked = !isVisitStepOpen("certificate", saved, native);
  const cofStep = native ? (
    <div hidden={activePanel !== "certificate"} className={activePanel === "certificate" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
      <OhVisitTemplateStep
        family="cof"
        title="Certificate"
        responseKey={COF_TEMPLATE_RESPONSE_KEY}
        encounter={encounter}
        records={workspace.cofResponses}
        locked={cofLocked}
        completionRef={cofCompletionRef}
        onSaved={workspace.refetchAll}
      />
    </div>
  ) : null;
  const medical = <div hidden={activePanel !== "medical-examinations"} className={activePanel === "medical-examinations" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
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
      /></div>;
  if (activePanel === "medical-examinations") return <>{medical}{cofStep}</>;

  if (activePanel === "certificate") {
    return (
      <>{medical}{cofStep}{cofLocked ? null : <OhEncounterColumns
        sectionKey="certificate"
        form={
          <OhColumnPanel eyebrow="Record" title="Certificate" className="bg-white">
            <OhCertificateForm
              assessments={workspace.fitness}
              onCreated={workspace.refetchAll}
            />
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
      />}</>
    );
  }

  if (activePanel === "employment") {
    return (
      <>{medical}{cofStep}<OhEncounterColumns
        sectionKey="employment"
        form={
          <OhColumnPanel eyebrow="Record" title="Employment" className="bg-white">
            <OhEmploymentForm customer={customer} />
          </OhColumnPanel>
        }
        records={
          <OhColumnPanel
            eyebrow="This encounter"
            title="Employment"
            count={episodes.length}
            className="bg-white"
          >
            <OhEmploymentRecords customer={customer} />
          </OhColumnPanel>
        }
      /></>
    );
  }

  return <>{medical}{cofStep}<OhEncounterModulePlaceholder moduleId={activePanel} /></>;
}
