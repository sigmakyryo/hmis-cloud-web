import { SHARED_CLINICAL_PANELS } from "@/features/clinical-opd/config/opd-workspace.config";
import { TheatreCaseHeader } from "@/features/clinical-theatre/components/TheatreCaseHeader";
import {
  TheatreIntraOpSection,
  TheatreOverviewSection,
  TheatrePreOpSection,
  TheatreRecoverySection,
} from "@/features/clinical-theatre/components/TheatreWorkspaceSections";
import {
  THEATRE_WORKSPACE_ROUTING,
  type TheatreEncounterTabId,
} from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import type { ClinicalWorkspaceConfig } from "@/features/clinical-workspace/types/clinical-workspace.types";

export const THEATRE_WORKSPACE_CONFIG: ClinicalWorkspaceConfig<TheatreEncounterTabId> = {
  ...THEATRE_WORKSPACE_ROUTING,
  workspaceBanner: TheatreCaseHeader,
  panels: {
    overview: SHARED_CLINICAL_PANELS.overview,
    case: TheatreOverviewSection,
    "pre-op": TheatrePreOpSection,
    "intra-op": TheatreIntraOpSection,
    recovery: TheatreRecoverySection,
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
