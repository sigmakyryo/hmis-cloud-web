"use client";

import Link from "next/link";
import { FileQuestion, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DetailPageLayout,
  DetailPageSkeleton,
} from "@/features/app-shell/components/page-layout";
import { useAppBreadcrumb } from "@/features/app-shell/hooks/use-app-breadcrumb";
import { OhEncounterContextPanel } from "@/features/occupational-health/components/OhEncounterContextPanel";
import { OhEncounterEdgeRail } from "@/features/occupational-health/components/OhEncounterEdgeRail";
import { OhEncounterHeader } from "@/features/occupational-health/components/OhEncounterHeader";
import { OhEncounterModuleNav } from "@/features/occupational-health/components/OhEncounterModuleNav";
import { OhRiskProfileRequiredEmptyState } from "@/features/occupational-health/components/OhRiskProfileRequiredEmptyState";
import { useOhEncounterModuleParam } from "@/features/occupational-health/hooks/use-oh-encounter-module-param";
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
  const [activeExamUuid, setActiveExamUuid] = useState<string | null>(null);

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

  if (!encounter) {
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

  return (
    <DetailPageLayout data-testid="oh-encounter-workspace">
      <div className="flex min-h-full flex-col xl:h-full">
        <OhEncounterHeader
          customer={customer}
          encounter={encounter}
          actions={
            <Link
              href={ROUTES.occupationalHealth}
              className="text-[13px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
            >
              OHS Queue
            </Link>
          }
        />

        <div className="flex min-h-0 flex-1">
          <div
            className="grid min-h-0 min-w-0 flex-1 grid-cols-1 xl:grid-cols-[17.5rem_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] 2xl:grid-cols-[19rem_minmax(0,1fr)]"
            data-testid="oh-encounter-module-layout"
          >
            <OhEncounterModuleNav
              activePanel={activePanel}
              onPanelChange={setActivePanel}
            />
            <section
              className="flex min-h-0 min-w-0 flex-col bg-white"
              aria-label="Occupational health content"
              data-testid="oh-encounter-context-panel"
            >
              {showRiskProfileEmpty ? (
                <OhRiskProfileRequiredEmptyState
                  onManageEmployment={() => setActivePanel("employment")}
                />
              ) : (
                <OhEncounterContextPanel
                  activePanel={activePanel}
                  encounter={encounter}
                  customer={customer}
                  episodes={episodes}
                  workspace={workspace}
                  onManageEmployment={() => setActivePanel("employment")}
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
            iodCount={workspace.iodCases.length}
            episodes={episodes}
            onManageEmployment={() => setActivePanel("employment")}
            onOpenExamination={(exam: OhExamination) => {
              setFocusedExamUuid(exam.uuid);
              setExamFocusRequest((current) => current + 1);
              setActivePanel("medical-examinations");
            }}
            onStartExamination={() => {
              setFocusedExamUuid(null);
              setActivePanel("medical-examinations");
            }}
          />
        </div>
      </div>
    </DetailPageLayout>
  );
}
