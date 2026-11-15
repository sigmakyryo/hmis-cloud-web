"use client";

import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { OhDrugAlcoholVisitPanel } from "@/features/occupational-health/components/OhDrugAlcoholVisitPanel";
import { OhEmployeeImmunizationsPanel } from "@/features/occupational-health/components/OhEmployeeImmunizationsPanel";
import {
  OhFitnessVisitPanel,
  type PreEmploymentRecord,
} from "@/features/occupational-health/components/OhFitnessVisitPanel";
import { OhHealthChecksVisitPanel } from "@/features/occupational-health/components/OhHealthChecksVisitPanel";
import { OhIodVisitPanel } from "@/features/occupational-health/components/OhIodVisitPanel";
import { OhSessionEmployeeForm } from "@/features/occupational-health/components/OhSessionEmployeeForm";
import { OhSessionForms } from "@/features/occupational-health/components/OhSessionForms";
import type { useOhEncounterWorkspaceData } from "@/features/occupational-health/hooks/use-occupational-health";
import { useOhIodApplicability } from "@/features/occupational-health/hooks/use-oh-iod-applicability";
import { iodApplies } from "@/features/occupational-health/lib/oh-iod-applicability";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import { employeeFormStatus } from "@/features/occupational-health/lib/oh-session-forms";
import type { Customer } from "@/features/customers/types/customer.types";
import { examinationPdfUrl } from "@/features/occupational-health/services/oh-ext.service";
import type { EmploymentEpisode, OhExamination, OhTemplateCapture, OhVisitEncounter } from "@/features/occupational-health/types";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type FitnessSheet =
  | "medical"
  | "employee"
  | "certificate"
  | "immunizations"
  | "drug-alcohol"
  | "health-checks"
  | "injuries";

const SHEET_TITLE: Record<FitnessSheet, string> = {
  medical: "Medical",
  employee: "Pre-employment",
  certificate: "Certificate",
  immunizations: "Immunizations",
  "drug-alcohol": "Drug & alcohol",
  "health-checks": "Health checks",
  injuries: "Injury on duty",
};

type OhFitnessWorkspaceProps = {
  encounter: OhVisitEncounter;
  customer: Customer;
  episodes: EmploymentEpisode[];
  workspace: ReturnType<typeof useOhEncounterWorkspaceData>;
  completionRef?: { current: (() => Promise<boolean>) | null };
  cofCompletionRef?: { current: (() => Promise<boolean>) | null };
  employeeContinueRef?: { current: (() => Promise<boolean>) | null };
  completing?: boolean;
  focusedExamUuid?: string | null;
  examFocusRequest?: number;
  onActiveExamChange?: (examUuid: string | null) => void;
  onManageEmployment: () => void;
  navSlot?: HTMLElement | null;
};

/** Fit-for-duty page. Exam, pre-employment, and the other visit actions open over it. */
export function OhFitnessWorkspace({
  encounter,
  customer,
  episodes,
  workspace,
  completionRef,
  cofCompletionRef,
  employeeContinueRef,
  completing,
  focusedExamUuid = null,
  examFocusRequest = 0,
  onActiveExamChange,
  onManageEmployment,
  navSlot = null,
}: OhFitnessWorkspaceProps) {
  const [sheet, setSheet] = useState<FitnessSheet | null>(null);
  const [employeeManual, setEmployeeManual] = useState(false);
  const iodSetting = useOhIodApplicability();
  const showIod =
    iodSetting.isReady && iodApplies(iodSetting.setting, encounter.visit_type?.code);
  const iodCase = workspace.iodCases[0] ?? null;
  const wide = sheet === "medical" || (sheet === "employee" && employeeManual);
  const examDownload = sheet === "medical" ? filledExamination(workspace.examinations) : null;
  const preEmployment = encounter.visit_type?.code === "pre_employment";

  function openPanel(panel: OhEncounterPanelId) {
    const next = sheetForPanel(panel);
    if (next) setSheet(next);
  }

  return (
    <>
      <OhFitnessVisitPanel
        customerUuid={customer.uuid}
        onOpenPanel={openPanel}
        preEmployment={
          preEmployment
            ? preEmploymentRecord(workspace.employeeForms, () => setSheet("employee"))
            : null
        }
        certificates={workspace.fitnessCertificates}
        assessments={workspace.fitness}
        iod={showIod ? { status: iodCase?.status ?? null } : null}
      />
      <Sheet
        open={sheet !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSheet(null);
            setEmployeeManual(false);
          }
        }}
      >
        <SheetContent
          side="right"
          data-testid="oh-fitness-sheet"
          data-width={wide ? "half" : "regular"}
          className={cn(
            appFont.className,
            "flex flex-col gap-0 overflow-hidden bg-white p-0",
            wide ? "w-1/2 max-w-none sm:max-w-none" : sheet === "employee" ? "w-full sm:max-w-md" : "w-full sm:max-w-xl",
          )}
        >
          <SheetHeader className="shrink-0 space-y-0 border-b border-dash-border px-5 py-4 pr-12 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <SheetTitle className="text-sm font-semibold text-brand-navy">
                  {sheet ? SHEET_TITLE[sheet] : "Visit"}
                </SheetTitle>
                <SheetDescription className="text-xs text-dash-muted">
                  {sheet === "medical"
                    ? "Examination for this visit. Fitness stays open beside it."
                    : sheet === "employee"
                      ? "Answer the questions in clinic, or send them to the employee."
                      : sheet === "injuries"
                        ? "Record the workplace injury for this visit."
                        : "Closes back to fitness."}
                </SheetDescription>
              </div>
              {examDownload ? (
                <a
                  href={examinationPdfUrl(examDownload.uuid)}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="oh-fitness-sheet-download"
                  className="shrink-0 text-sm font-medium text-brand-primary hover:underline"
                >
                  Download
                </a>
              ) : null}
            </div>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
            {sheet === "employee" ? (
              <EmployeeForm
                encounter={encounter}
                workspace={workspace}
                employeeContinueRef={employeeContinueRef}
                onEditingChange={setEmployeeManual}
              />
            ) : null}
            {sheet === "medical" || sheet === "certificate" ? (
              <OhSessionForms
                activeStep={sheet === "medical" ? "examination" : "certificate"}
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
                onOpenPanel={openPanel}
                navSlot={navSlot}
              />
            ) : null}
            {sheet === "immunizations" ? (
              <div className="px-5 py-4">
                <OhEmployeeImmunizationsPanel
                  customerUuid={customer.uuid}
                  encounterUuid={encounter.uuid}
                  visitUuid={typeof encounter.visit === "string" ? encounter.visit : null}
                  compact
                />
              </div>
            ) : null}
            {sheet === "drug-alcohol" ? (
              <div className="px-5 py-4">
                <OhDrugAlcoholVisitPanel customerUuid={customer.uuid} encounterUuid={encounter.uuid} />
              </div>
            ) : null}
            {sheet === "health-checks" ? (
              <div className="px-5 py-4">
                <OhHealthChecksVisitPanel customerUuid={customer.uuid} encounterUuid={encounter.uuid} />
              </div>
            ) : null}
            {sheet === "injuries" ? (
              <div className="px-5 py-4">
                <OhIodVisitPanel
                  customer={customer}
                  encounter={encounter}
                  iodCases={workspace.iodCases}
                  onRefresh={() => {
                    void workspace.refetchAll();
                  }}
                />
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function filledExamination(examinations: OhExamination[]): OhExamination | null {
  for (const exam of examinations) {
    if (exam.is_active === false) continue;
    const envelope = exam.responses_json?.__exam_template__;
    if (envelope && typeof envelope === "object" && "answers" in envelope) {
      return exam;
    }
  }
  return null;
}

function preEmploymentRecord(
  forms: OhTemplateCapture[],
  onOpen: () => void,
): PreEmploymentRecord {
  const form = forms.find((row) => row.is_active !== false) ?? null;
  const step = employeeFormStatus(form);
  if (!form || step === "not_started") {
    return { status: "not_started", onOpen };
  }
  if (step === "done") {
    return {
      status: form.status === "uploaded" ? "uploaded" : "submitted",
      submittedAt: form.submitted_at,
      documentName: form.document_original_name,
      onOpen,
    };
  }
  return { status: "in_progress", onOpen };
}

function EmployeeForm({
  encounter,
  workspace,
  employeeContinueRef,
  onEditingChange,
}: {
  encounter: OhVisitEncounter;
  workspace: ReturnType<typeof useOhEncounterWorkspaceData>;
  employeeContinueRef?: { current: (() => Promise<boolean>) | null };
  onEditingChange: (editing: boolean) => void;
}) {
  return (
    <div data-testid="oh-fit-pre-employment-form">
      <OhSessionEmployeeForm
        encounter={encounter}
        records={workspace.employeeForms}
        continueRef={employeeContinueRef}
        onSaved={workspace.refetchAll}
        embedded
        onEditingChange={onEditingChange}
      />
    </div>
  );
}

function sheetForPanel(panel: OhEncounterPanelId): FitnessSheet | null {
  switch (panel) {
    case "medical-examinations":
      return "medical";
    case "certificate":
      return "certificate";
    case "immunizations":
      return "immunizations";
    case "drug-alcohol":
      return "drug-alcohol";
    case "health-checks":
      return "health-checks";
    case "injuries":
      return "injuries";
    default:
      return null;
  }
}
