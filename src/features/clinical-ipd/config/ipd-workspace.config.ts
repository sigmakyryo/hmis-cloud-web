import { IpdEmarTabPanel } from "@/features/clinical-ipd/components/IpdEmarTabPanel";
import { IpdRoundsTabPanel } from "@/features/clinical-ipd/components/IpdRoundsTabPanel";
import { IpdStayTabPanel } from "@/features/clinical-ipd/components/IpdStayTabPanel";
import { IpdTheatreTabPanel } from "@/features/clinical-ipd/components/IpdTheatreTabPanel";
import {
  IPD_WORKSPACE_ROUTING,
  type IpdEncounterTabId,
} from "@/features/clinical-ipd/constants/ipd-workspace-routing";
import { SHARED_CLINICAL_PANELS } from "@/features/clinical-opd/config/opd-workspace.config";
import type { ClinicalWorkspaceConfig } from "@/features/clinical-workspace/types/clinical-workspace.types";

export const IPD_WORKSPACE_CONFIG: ClinicalWorkspaceConfig<IpdEncounterTabId> = {
  ...IPD_WORKSPACE_ROUTING,
  panels: {
    overview: SHARED_CLINICAL_PANELS.overview,
    activity: SHARED_CLINICAL_PANELS.activity,
    stay: IpdStayTabPanel,
    complaint: SHARED_CLINICAL_PANELS.complaint,
    notes: SHARED_CLINICAL_PANELS.notes,
    orders: SHARED_CLINICAL_PANELS.orders,
    medications: SHARED_CLINICAL_PANELS.medications,
    emar: IpdEmarTabPanel,
    "physical-examination": SHARED_CLINICAL_PANELS["physical-examination"],
    diagnoses: SHARED_CLINICAL_PANELS.diagnoses,
    "vital-signs": SHARED_CLINICAL_PANELS["vital-signs"],
    nursing: SHARED_CLINICAL_PANELS.nursing,
    rounds: IpdRoundsTabPanel,
    theatre: IpdTheatreTabPanel,
    allergies: SHARED_CLINICAL_PANELS.allergies,
    disposition: SHARED_CLINICAL_PANELS.disposition,
    client: SHARED_CLINICAL_PANELS.client,
  },
};
