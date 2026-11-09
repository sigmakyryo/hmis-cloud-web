"use client";

import Link from "next/link";
import { FileQuestion, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { completeNativeOhVisit } from "@/features/occupational-health/services/native-visit.service";
import { useRef, useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DetailPageLayout,
  DetailPageSkeleton,
} from "@/features/app-shell/components/page-layout";
import { parseExamTemplateSnapshot, type ExamTemplateResponseEnvelope } from "../lib/exam-template-snapshot";
import { validateExamAnswers } from "../lib/exam-template-validation";
import { useAppBreadcrumb } from "@/features/app-shell/hooks/use-app-breadcrumb";
import { OhEncounterContextPanel } from "@/features/occupational-health/components/OhEncounterContextPanel";
import { OhEncounterEdgeRail } from "@/features/occupational-health/components/OhEncounterEdgeRail";
import { OhEncounterHeader } from "@/features/occupational-health/components/OhEncounterHeader";
import { OhSessionFormNav } from "@/features/occupational-health/components/OhSessionForms";
import { OhRiskProfileRequiredEmptyState } from "@/features/occupational-health/components/OhRiskProfileRequiredEmptyState";
import { useOhEncounterModuleParam } from "@/features/occupational-health/hooks/use-oh-encounter-module-param";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import { sessionFormStepKey, sessionFormSteps, type SessionFormStep } from "@/features/occupational-health/lib/oh-session-forms";
import {
  useEmploymentEpisodes,
  useOhEncounterWorkspaceData,
} from "@/features/occupational-health/hooks/use-occupational-health";
import { fetchOhEncounter } from "@/features/occupational-health/services/oh.service";
import type { OhExamination } from "@/features/occupational-health/types";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { customerFromOhEncounter } from "@/features/occupational-health/utils/customer-from-oh-encounter";
import { customerHasActiveRiskProfile } from "@/features/occupational-health/utils/customer-has-risk-profile";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { ROUTES } from "@/constants/routes";
import { useUser } from "@/providers/user-provider";

type WorkspaceStateScreenProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  "data-testid"?: string;
};

function WorkspaceStateScreen({
  icon,
  title,
  description,
  action,
  "data-testid": dataTestId,
}: WorkspaceStateScreenProps) {
  return (
    <DetailPageLayout data-testid={dataTestId}>
      <div className="flex min-h-full items-center justify-center bg-white">
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          action={action}
        />
      </div>
    </DetailPageLayout>
  );
}

type OhEncounterWorkspacePageProps = {
  visitUuid: string;
  encounterUuid: string;
};

export function OhEncounterWorkspacePage({
  visitUuid,
  encounterUuid,
}: OhEncounterWorkspacePageProps) {
  const { userData, isLoading: isUserLoading } = useUser();
  const hasAccess = canAccessOccupationalHealth(userData);
  const [activePanel, setActivePanel] = useOhEncounterModuleParam();
  const [focusedExamUuid, setFocusedExamUuid] = useState<string | null>(null);
  const [examFocusRequest, setExamFocusRequest] = useState(0);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const completionRef = useRef<(() => Promise<boolean>) | null>(null);
  const cofCompletionRef = useRef<(() => Promise<boolean>) | null>(null);
  const completionBusy = useRef(false);
  const [activeExamUuid, setActiveExamUuid] = useState<string | null>(null);
  const [chosenStep, setChosenStep] = useState<string | null>(null);

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
  const showRiskProfileEmpty =
    Boolean(customer?.uuid) &&
    !episodesLoading &&
    !hasRiskProfile &&
    activePanel !== "employment";

  if (
    isUserLoading ||
    encounterQuery.isLoading ||
    episodesLoading
  ) {
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
  const activeStep = activeSessionStep(formSteps, chosenStep, activePanel);

  return (
    <DetailPageLayout data-testid="oh-encounter-workspace">
      <div className="flex min-h-full flex-col xl:h-full">
        <OhEncounterHeader
          customer={customer}
          encounter={encounter}
          actions={<div className="flex flex-wrap items-center justify-end gap-3">
            <Link href={ROUTES.occupationalHealth} className="text-[13px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">OHS Queue</Link>
            {encounter.origin === "laravel" && encounter.is_active ? <PrimaryButton type="button" disabled={completing} onClick={async () => {
              if (completionBusy.current) return;
              completionBusy.current = true;
              setCompleting(true); setCompleteError(null);
              try {
                if (!completionRef.current || !(await completionRef.current())) {
                  setChosenStep("examination");
                  setActivePanel("medical-examinations");
                  if (!completionRef.current) setCompleteError("Review the examination setup before completing this visit.");
                  return;
                }
                if (encounter.origin === "laravel") {
                  if (!cofCompletionRef.current || !(await cofCompletionRef.current())) {
                    setChosenStep("certificate");
                    setActivePanel("certificate");
                    setCompleteError("Complete the certificate before completing this visit.");
                    return;
                  }
                }
                for (const exam of workspace.examinations) {
                  if (exam.uuid === activeExamUuid) continue;
                  const schema = parseExamTemplateSnapshot(exam.template_snapshot);
                  const envelope = exam.responses_json?.__exam_template__ as ExamTemplateResponseEnvelope | undefined;
                  if (schema && envelope?.answers?.picks && envelope.answers.fields && Object.keys(validateExamAnswers(schema, envelope.answers)).length) {
                    setFocusedExamUuid(exam.uuid);
                    setExamFocusRequest((current) => current + 1);
                    setChosenStep("examination");
                    setActivePanel("medical-examinations");
                    setCompleteError("Complete the highlighted responses in this examination before completing the visit.");
                    return;
                  }
                }
                await completeNativeOhVisit(encounter.uuid);
                await encounterQuery.refetch();
              } catch (error) {
                setChosenStep("examination");
                setActivePanel("medical-examinations");
                setCompleteError(error instanceof Error ? error.message : "Could not complete visit. Your responses have been kept.");
              } finally { completionBusy.current = false; setCompleting(false); }
            }}>{completing ? "Completing…" : "Complete visit"}</PrimaryButton> : null}
          </div>}
        />
        <OhSessionFormNav
          visitTypeName={encounter.visit_type?.name}
          steps={formSteps}
          activeStep={activeStep}
          onSelect={(step) => {
            setChosenStep(step);
            setActivePanel(step === "certificate" ? "certificate" : step === "employment" ? "employment" : "medical-examinations");
          }}
        />
        {completeError ? <p role="alert" className="px-5 py-3 text-sm text-red-700">{completeError}</p> : null}
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-testid="oh-encounter-module-layout">
            <section
              className="flex min-h-0 min-w-0 flex-1 flex-col bg-white"
              aria-label="Occupational health content"
              data-testid="oh-encounter-context-panel"
            >
              {showRiskProfileEmpty ? (
                <OhRiskProfileRequiredEmptyState
                  onManageEmployment={() => setActivePanel("employment")}
                />
              ) : (
                <OhEncounterContextPanel
                  completionRef={completionRef}
                  cofCompletionRef={cofCompletionRef}
                  completing={completing}
                  activePanel={activePanel}
                  activeStep={activeStep}
                  encounter={encounter}
                  customer={customer}
                  episodes={episodes}
                  workspace={workspace}
                  onManageEmployment={() => setActivePanel("employment")}
                  onShowForms={() => setActivePanel("medical-examinations")}
                  focusedExamUuid={focusedExamUuid}
                  examFocusRequest={examFocusRequest}
                  onActiveExamChange={setActiveExamUuid}
                />
              )}
            </section>
          </div>
          <OhEncounterEdgeRail
            visitUuid={visitUuid}
            encounterUuid={encounter.uuid}
            examinations={workspace.examinations}
            activeExamUuid={activeExamUuid}
            findingCount={workspace.findings.length}
            episodes={episodes}
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

function activeSessionStep(steps: SessionFormStep[], chosen: string | null, panel: OhEncounterPanelId): string {
  if (chosen && steps.some((step) => sessionFormStepKey(step) === chosen)) {
    return chosen;
  }
  if (panel === "certificate" && steps.some((step) => step.kind === "certificate")) {
    return "certificate";
  }
  return sessionFormStepKey(steps[0] ?? { kind: "examination", title: "Examination" });
}
