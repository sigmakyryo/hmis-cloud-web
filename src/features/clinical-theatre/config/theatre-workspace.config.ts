import { SHARED_CLINICAL_PANELS } from "@/features/clinical-opd/config/opd-workspace.config";
import { TheatreCaseHeader } from "@/features/clinical-theatre/components/TheatreCaseHeader";
import { TheatreEncounterEdgeRail } from "@/features/clinical-theatre/components/TheatreEncounterEdgeRail";
import { TheatreWorkspaceTabs } from "@/features/clinical-theatre/components/TheatreWorkspaceTabs";
import { TheatreCaseFlowSection } from "@/features/clinical-theatre/components/case-flow/TheatreCaseFlow";
import {
  THEATRE_WORKSPACE_ROUTING,
  type TheatreEncounterTabId,
} from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import type { ClinicalWorkspaceConfig } from "@/features/clinical-workspace/types/clinical-workspace.types";

export const THEATRE_WORKSPACE_CONFIG: ClinicalWorkspaceConfig<TheatreEncounterTabId> =
  {
    ...THEATRE_WORKSPACE_ROUTING,
    workspaceBanner: TheatreCaseHeader,
    workspaceNav: TheatreWorkspaceTabs,
    workspaceAside: TheatreEncounterEdgeRail,
    hideEncounterHeader: true,
    hideVitalsStatsStrip: true,
    panels: {
      overview: SHARED_CLINICAL_PANELS.overview,
      case: TheatreCaseFlowSection,
      activity: SHARED_CLINICAL_PANELS.activity,
      complaint: SHARED_CLINICAL_PANELS.complaint,
      notes: SHARED_CLINICAL_PANELS.notes,
      orders: SHARED_CLINICAL_PANELS.orders,
      medications: SHARED_CLINICAL_PANELS.medications,
      "physical-examination": SHARED_CLINICAL_PANELS["physical-examination"],
      diagnoses: SHARED_CLINICAL_PANELS.diagnoses,
      "vital-signs": SHARED_CLINICAL_PANELS["vital-signs"],
      nursing: SHARED_CLINICAL_PANELS.nursing,
      allergies: SHARED_CLINICAL_PANELS.allergies,
      client: SHARED_CLINICAL_PANELS.client,
    },
  };
