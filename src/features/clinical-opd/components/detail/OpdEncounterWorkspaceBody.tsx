"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { DetailPageMainSection } from "@/features/app-shell/components/page-layout";
import { cn } from "@/lib/utils";
import { OpdEncounterAllergyBanner } from "@/features/clinical-opd/components/detail/OpdEncounterAllergyBanner";
import { OpdEncounterTabs } from "@/features/clinical-opd/components/detail/OpdEncounterTabs";
import { OpdEncounterVitalsStatsStrip } from "@/features/clinical-opd/components/detail/OpdEncounterVitalsStatsStrip";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import { useEncounterWorkspace } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { useWorkspaceRouting } from "@/features/clinical-opd/hooks/use-workspace-routing";
import { useOptionalClinicalWorkspaceConfig } from "@/features/clinical-workspace/components/clinical-workspace-config-context";
import { workspaceTabFromPathname } from "@/features/clinical-workspace/utils/workspace-tabs";

type OpdEncounterWorkspaceBodyProps = {
  children: ReactNode;
};

export function OpdEncounterWorkspaceBody({
  children,
}: OpdEncounterWorkspaceBodyProps) {
  const pathname = usePathname();
  const routing = useWorkspaceRouting();
  const workspaceConfig = useOptionalClinicalWorkspaceConfig();
  const WorkspaceBanner = workspaceConfig?.workspaceBanner;
  const WorkspaceNav = workspaceConfig?.workspaceNav;
  const WorkspaceAside = workspaceConfig?.workspaceAside;
  const hideVitalsStatsStrip = workspaceConfig?.hideVitalsStatsStrip;
  const isSplitWorkspace = Boolean(WorkspaceNav || WorkspaceAside);
  const { visitUuid, encounterUuid, chartSummary } = useOpdEncounterWorkspace();
  const activeTab = workspaceTabFromPathname(
    routing,
    pathname,
    visitUuid,
    encounterUuid,
  );
  const isFullWidthLayout =
    activeTab !== null &&
    (routing.consultLayoutTabIds.has(activeTab) ||
      routing.fullWidthTabIds.has(activeTab));
  const { observations } = useEncounterWorkspace(visitUuid, encounterUuid);
  const thisEncounterVitals =
    observations.data ?? chartSummary?.this_encounter_vitals ?? [];
  const stripObservations =
    thisEncounterVitals.length > 0
      ? thisEncounterVitals
      : (chartSummary?.last_vitals ?? []);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col",
        isSplitWorkspace && "h-full min-h-0 overflow-hidden",
      )}
      data-testid="opd-encounter-workspace-grid"
    >
      <OpdEncounterAllergyBanner allergies={chartSummary?.allergies ?? []} />
      {hideVitalsStatsStrip ? null : (
        <OpdEncounterVitalsStatsStrip
          observations={stripObservations}
          encounterObservations={thisEncounterVitals}
          isLoading={observations.isLoading && !chartSummary}
        />
      )}
      {WorkspaceBanner ? (
        <WorkspaceBanner visitUuid={visitUuid} encounterUuid={encounterUuid} />
      ) : null}
      {routing.hideSectionTabBar ? null : <OpdEncounterTabs />}

      {isSplitWorkspace ? (
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row"
          data-testid="workspace-nav-split"
        >
          {WorkspaceNav ? (
            <WorkspaceNav visitUuid={visitUuid} encounterUuid={encounterUuid} />
          ) : null}
          <div
            className="order-3 min-h-0 min-w-0 flex-1 overflow-y-auto pb-20 xl:pb-0 lg:order-2"
            data-testid="workspace-nav-main"
          >
            {isFullWidthLayout ? (
              children
            ) : (
              <DetailPageMainSection className="max-w-3xl">
                {children}
              </DetailPageMainSection>
            )}
          </div>
          {WorkspaceAside ? (
            <WorkspaceAside
              visitUuid={visitUuid}
              encounterUuid={encounterUuid}
            />
          ) : null}
        </div>
      ) : isFullWidthLayout ? (
        children
      ) : (
        <DetailPageMainSection className="max-w-3xl">
          {children}
        </DetailPageMainSection>
      )}
    </div>
  );
}
