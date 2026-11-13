"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileQuestion, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { completeNativeOhVisit } from "@/features/occupational-health/services/native-visit.service";
import { ROUTES } from "@/constants/routes";
import {
  DetailPageLayout,
  DetailPageSkeleton,
} from "@/features/app-shell/components/page-layout";
import {
  parseExamTemplateSnapshot,
  type ExamTemplateResponseEnvelope,
} from "../lib/exam-template-snapshot";
import { validateExamAnswers } from "../lib/exam-template-validation";
import { useAppBreadcrumb } from "@/features/app-shell/hooks/use-app-breadcrumb";
import { OhCancelVisitDialog } from "@/features/occupational-health/components/OhCancelVisitDialog";
import { OhEncounterContextPanel } from "@/features/occupational-health/components/OhEncounterContextPanel";
import { OhEncounterEdgeRail } from "@/features/occupational-health/components/OhEncounterEdgeRail";
import { OhEncounterHeader } from "@/features/occupational-health/components/OhEncounterHeader";
import { OhVisitJourneyRail } from "@/features/occupational-health/components/workspace/OhVisitJourneyRail";
import { OhRiskProfileInlinePrompt } from "@/features/occupational-health/components/workspace/OhRiskProfileInlinePrompt";
import { buildSessionStepStatuses } from "@/features/occupational-health/components/OhSessionForms";
import { useOhEncounterModuleParam } from "@/features/occupational-health/hooks/use-oh-encounter-module-param";
import {
  isLastSessionStep,
  nextSessionStep,
  sessionFormStepKey,
  sessionFormSteps,
  type SessionFormStep,
} from "@/features/occupational-health/lib/oh-session-forms";
import {
  OH_HEADER_ACTIONS,
  collectWorkspaceBillingCharges,
  isNativeOhVisit,
  isViewingLiveSessionStep,
  ohJumpButtonDescription,
  ohJumpButtonLabel,
  panelForSessionStep,
  resolveLiveSessionStep,
} from "@/features/occupational-health/lib/oh-visit-workspace";
import type { OhClinicalModuleId } from "@/features/occupational-health/lib/oh-visit-workspace";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import {
  useEmploymentEpisodes,
  useOhEncounterWorkspaceData,
} from "@/features/occupational-health/hooks/use-occupational-health";
import { fetchOhEncounter } from "@/features/occupational-health/services/oh.service";
import type { OhExamination } from "@/features/occupational-health/types";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { customerHasActiveRiskProfile } from "@/features/occupational-health/utils/customer-has-risk-profile";
import { customerFromOhEncounter } from "@/features/occupational-health/utils/customer-from-oh-encounter";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { useUser } from "@/providers/user-provider";

type OhEncounterWorkspacePageProps = {
  visitUuid: string;
  encounterUuid: string;
};

function WorkspaceStateScreen({
  icon: Icon,
  title,
  description,
  action,
  "data-testid": dataTestId,
}: {
  icon: typeof ShieldAlert;
  title: string;
  description: string;
  action?: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <DetailPageLayout data-testid={dataTestId}>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <Icon className="size-8 text-dash-muted" aria-hidden />
        <h1 className="text-[16px] font-semibold text-brand-navy">{title}</h1>
        <p className="max-w-md text-[13.5px] text-dash-muted">{description}</p>
        {action}
      </div>
    </DetailPageLayout>
  );
}

export function OhEncounterWorkspacePage({
  visitUuid,
  encounterUuid,
}: OhEncounterWorkspacePageProps) {
  const { userData, isLoading: isUserLoading } = useUser();
  const hasAccess = canAccessOccupationalHealth(userData);
  const [activePanel, setActivePanel] = useOhEncounterModuleParam();
  useEffect(() => {
    const openImm = () => setActivePanel("immunizations");
    window.addEventListener("oh-open-immunizations", openImm);
    return () => window.removeEventListener("oh-open-immunizations", openImm);
  }, [setActivePanel]);
  const [focusedExamUuid, setFocusedExamUuid] = useState<string | null>(null);
  const [examFocusRequest, setExamFocusRequest] = useState(0);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const completionRef = useRef<(() => Promise<boolean>) | null>(null);
  const cofCompletionRef = useRef<(() => Promise<boolean>) | null>(null);
  const employeeContinueRef = useRef<(() => Promise<boolean>) | null>(null);
  const completionBusy = useRef(false);
  const [activeExamUuid, setActiveExamUuid] = useState<string | null>(null);
  const [chosenStep, setChosenStep] = useState<string | null>(null);
  const [stepNavSlot, setStepNavSlot] = useState<HTMLDivElement | null>(null);

  const encounterQuery = useQuery({
    queryKey: ["oh-encounter", encounterUuid],
    queryFn: () => fetchOhEncounter(encounterUuid),
    enabled: Boolean(encounterUuid) && hasAccess,
    retry: false,
  });

  const encounter = encounterQuery.data ?? null;
  const workspace = useOhEncounterWorkspaceData(encounter?.id ?? null);
  const customer = encounter ? customerFromOhEncounter(encounter) : null;
  const episodesQuery = useEmploymentEpisodes(customer?.uuid);
  const episodes = episodesQuery.data ?? [];

  useAppBreadcrumb(customer ? formatCustomerName(customer) : "OH encounter");

  const episodesLoading = Boolean(customer?.uuid) && episodesQuery.isLoading;
  const hasRiskProfile = customerHasActiveRiskProfile(episodes);
  const needsEmployment =
    Boolean(customer?.uuid) && !episodesLoading && !hasRiskProfile;

  if (isUserLoading || encounterQuery.isLoading || episodesLoading) {
    return (
      <DetailPageSkeleton
        tabCount={4}
        data-testid="oh-encounter-workspace-skeleton"
      />
    );
  }

  if (!hasAccess) {
    return (
      <WorkspaceStateScreen
        icon={ShieldAlert}
        title="Access denied"
        description="You do not have access to occupational health. Ask an administrator to add you to the OccupationalHealth group."
        data-testid="oh-encounter-workspace"
      />
    );
  }

  if (!encounter || encounter.visit !== visitUuid) {
    return (
      <WorkspaceStateScreen
        icon={FileQuestion}
        title="Encounter not found"
        description="This occupational health encounter could not be loaded. It may have been removed, or you may not have access."
        action={
          <SecondaryButton asChild>
            <Link href={ROUTES.occupationalHealth}>Back to OHS Queue</Link>
          </SecondaryButton>
        }
        data-testid="oh-encounter-not-found"
      />
    );
  }

  const formSteps = sessionFormSteps(encounter.visit_type ?? null);
  const statuses = buildSessionStepStatuses(formSteps, workspace);
  const liveStep = resolveLiveSessionStep(formSteps, statuses);
  const activeStep = activeSessionStep(formSteps, chosenStep, activePanel);
  const liveTitle =
    formSteps.find((step) => sessionFormStepKey(step) === liveStep)?.title ??
    "Examination";
  const native = isNativeOhVisit(encounter);
  const showJump =
    encounter.is_active &&
    !isViewingLiveSessionStep(activePanel, activeStep, liveStep);
  const last = isLastSessionStep(formSteps, activeStep);
  const primaryAction =
    native && encounter.is_active
      ? completing
        ? last
          ? OH_HEADER_ACTIONS.completingLast
          : OH_HEADER_ACTIONS.completingNext
        : last
          ? OH_HEADER_ACTIONS.complete
          : OH_HEADER_ACTIONS.next
      : null;
  const billingCharges = collectWorkspaceBillingCharges(
    workspace.examinations,
    workspace.employeeForms,
    workspace.cofResponses,
  );

  function goStep(stepKey: string, message: string, examUuid?: string | null) {
    setChosenStep(stepKey);
    setActivePanel(panelForSessionStep(stepKey));
    if (examUuid) {
      setFocusedExamUuid(examUuid);
      setExamFocusRequest((current) => current + 1);
    }
    setCompleteError(message);
  }

  async function runPrimaryAction() {
    if (completionBusy.current) return;
    completionBusy.current = true;
    setCompleting(true);
    setCompleteError(null);
    try {
      const atLast = isLastSessionStep(formSteps, activeStep);
      if (!atLast) {
        if (activeStep === "employee") {
          if (
            employeeContinueRef.current &&
            !(await employeeContinueRef.current())
          ) {
            goStep("employee", "Review the employee form before continuing.");
            return;
          }
        } else if (activeStep === "examination") {
          if (!completionRef.current || !(await completionRef.current())) {
            goStep(
              "examination",
              "Complete the highlighted responses before continuing.",
            );
            return;
          }
          await workspace.refetchAll();
        } else if (activeStep === "certificate") {
          if (
            !cofCompletionRef.current ||
            !(await cofCompletionRef.current())
          ) {
            goStep(
              "certificate",
              "Complete the certificate before continuing.",
            );
            return;
          }
        }
        const next = nextSessionStep(formSteps, activeStep);
        if (next) {
          const key = sessionFormStepKey(next);
          setChosenStep(key);
          setActivePanel(panelForSessionStep(key));
          setCompleteError(null);
        }
        return;
      }

      if (!completionRef.current || !(await completionRef.current())) {
        goStep(
          "examination",
          "Complete the highlighted responses in this examination before completing the visit.",
        );
        return;
      }
      await workspace.refetchAll();
      for (const exam of workspace.examinations) {
        if (exam.uuid === activeExamUuid) continue;
        const schema = parseExamTemplateSnapshot(exam.template_snapshot);
        const envelope = exam.responses_json?.__exam_template__ as
          ExamTemplateResponseEnvelope | undefined;
        if (
          schema &&
          envelope?.answers?.picks &&
          envelope.answers.fields &&
          Object.keys(validateExamAnswers(schema, envelope.answers)).length
        ) {
          goStep(
            "examination",
            "Complete the highlighted responses in this examination before completing the visit.",
            exam.uuid,
          );
          return;
        }
      }
      if (!cofCompletionRef.current || !(await cofCompletionRef.current())) {
        goStep(
          "certificate",
          "Complete the certificate before completing this visit.",
        );
        return;
      }
      await completeNativeOhVisit(encounter!.uuid);
      await encounterQuery.refetch();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not complete visit. Your responses have been kept.";
      if (/certificate|examination before opening/i.test(message)) {
        goStep("certificate", message);
      } else if (/employee/i.test(message)) {
        goStep("employee", message);
      } else {
        goStep("examination", message);
      }
    } finally {
      completionBusy.current = false;
      setCompleting(false);
    }
  }

  function handleSelectStep(step: string) {
    const status = statuses[step];
    if (status === "locked") {
      setCompleteError(
        "Finish and save the examination before opening the certificate.",
      );
      return;
    }
    setChosenStep(step);
    setActivePanel(panelForSessionStep(step));
    setCompleteError(null);
  }

  function handleSelectModule(panel: OhClinicalModuleId) {
    setActivePanel(panel);
    setCompleteError(null);
  }

  function jumpToLive() {
    setChosenStep(liveStep);
    setActivePanel(panelForSessionStep(liveStep));
    setCompleteError(null);
  }

  return (
    <DetailPageLayout lockScroll data-testid="oh-encounter-workspace">
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <OhEncounterHeader
          customer={customer}
          encounter={encounter}
          visitTypeName={encounter.visit_type?.name}
          jump={
            showJump
              ? {
                  label: ohJumpButtonLabel(liveTitle),
                  description: ohJumpButtonDescription(liveTitle),
                  onClick: jumpToLive,
                }
              : null
          }
          cancel={
            native && encounter.is_active ? (
              <OhCancelVisitDialog
                encounterUuid={encounter.uuid}
                disabled={completing}
                onCancelled={() => void encounterQuery.refetch()}
              />
            ) : null
          }
          primary={
            primaryAction
              ? {
                  ...primaryAction,
                  pending: completing,
                  onClick: () => {
                    void runPrimaryAction();
                  },
                }
              : null
          }
        />
        {completeError ? (
          <p role="alert" className="shrink-0 px-5 py-2 text-sm text-red-700">
            {completeError}
          </p>
        ) : null}
        <div
          className="flex min-h-0 flex-1 flex-col lg:flex-row"
          data-testid="oh-encounter-module-layout"
        >
          <OhVisitJourneyRail
            steps={formSteps}
            activeStep={activeStep}
            liveStep={liveStep}
            statuses={statuses}
            activePanel={activePanel}
            needsEmployment={needsEmployment}
            customerUuid={customer?.uuid}
            encounterUuid={encounter.uuid}
            episodeCount={episodes.length}
            onSelectStep={handleSelectStep}
            onSelectModule={handleSelectModule}
          />
          <div className="order-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:order-2">
            {needsEmployment ? (
              <OhRiskProfileInlinePrompt
                onManageEmployment={() => {
                  setActivePanel("employment");
                  setCompleteError(null);
                }}
              />
            ) : null}
            <div
              ref={setStepNavSlot}
              className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-b border-dash-border px-5 py-2 empty:hidden"
            />
            <section
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white"
              aria-label="Occupational health content"
              data-testid="oh-encounter-context-panel"
            >
              <OhEncounterContextPanel
                completionRef={completionRef}
                cofCompletionRef={cofCompletionRef}
                employeeContinueRef={employeeContinueRef}
                completing={completing}
                activePanel={activePanel}
                activeStep={activeStep}
                encounter={encounter}
                customer={customer}
                episodes={episodes}
                workspace={workspace}
                onManageEmployment={() => setActivePanel("employment")}
                onShowForms={() => {
                  setActivePanel("medical-examinations");
                  setChosenStep("examination");
                }}
                focusedExamUuid={focusedExamUuid}
                examFocusRequest={examFocusRequest}
                onActiveExamChange={setActiveExamUuid}
                navSlot={stepNavSlot}
                onOpenPanel={(panel: OhEncounterPanelId) => {
                  setActivePanel(panel);
                  if (panel === "medical-examinations")
                    setChosenStep("examination");
                }}
              />
            </section>
          </div>
          <OhEncounterEdgeRail
            visitUuid={visitUuid}
            encounterUuid={encounter.uuid}
            encounter={encounter}
            examinations={workspace.examinations}
            activeExamUuid={activeExamUuid}
            findingCount={workspace.findings.length}
            episodes={episodes}
            billingCharges={billingCharges}
            onManageEmployment={() => setActivePanel("employment")}
            onOpenExamination={(exam: OhExamination) => {
              setFocusedExamUuid(exam.uuid);
              setExamFocusRequest((current) => current + 1);
              setChosenStep("examination");
              setActivePanel("medical-examinations");
            }}
            onStartExamination={() => {
              setFocusedExamUuid(null);
              setChosenStep("examination");
              setActivePanel("medical-examinations");
            }}
          />
        </div>
      </div>
    </DetailPageLayout>
  );
}

function activeSessionStep(
  steps: SessionFormStep[],
  chosen: string | null,
  panel: OhEncounterPanelId,
): string {
  if (chosen && steps.some((step) => sessionFormStepKey(step) === chosen)) {
    return chosen;
  }
  if (
    panel === "certificate" &&
    steps.some((step) => step.kind === "certificate")
  ) {
    return "certificate";
  }
  return sessionFormStepKey(
    steps[0] ?? { kind: "examination", title: "Examination" },
  );
}
