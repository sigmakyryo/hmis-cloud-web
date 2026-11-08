import { getClinicalSpecialty } from "@/features/clinical-workspace/constants/clinical-specialties";
import type {
  ClinicalWorkspaceRouting,
  ClinicalWorkspaceTab,
} from "@/features/clinical-workspace/types/clinical-workspace.types";

export type IpdEncounterTabId =
  | "overview"
  | "activity"
  | "stay"
  | "complaint"
  | "notes"
  | "orders"
  | "medications"
  | "emar"
  | "physical-examination"
  | "diagnoses"
  | "vital-signs"
  | "nursing"
  | "rounds"
  | "theatre"
  | "allergies"
  | "disposition"
  | "client";

export const IPD_ENCOUNTER_TABS: ClinicalWorkspaceTab<IpdEncounterTabId>[] = [
  {
    id: "activity",
    label: "Activity",
    segment: "activity",
    group: "record",
    surface: "tab",
    requiredCapability: "view_activity_tab",
  },
  {
    id: "stay",
    label: "Stay",
    segment: "stay",
    group: "consult",
    surface: "tab",
    requiredCapability: null,
  },
  {
    id: "complaint",
    label: "Complaints & HPI",
    segment: "complaint",
    group: "consult",
    surface: "tab",
    requiredCapability: ["record_chief_complaint", "record_hpi"],
  },
  {
    id: "orders",
    label: "Orders",
    segment: "orders",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_orders_tab",
  },
  {
    id: "medications",
    label: "Medications",
    segment: "medications",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_medications_tab",
  },
  {
    id: "emar",
    label: "eMAR",
    segment: "emar",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_medications_tab",
  },
  {
    id: "vital-signs",
    label: "Vital signs",
    segment: "vital-signs",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_vital_signs_tab",
  },
  {
    id: "nursing",
    label: "Nursing",
    segment: "nursing",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_nursing_notes_tab",
  },
  {
    id: "rounds",
    label: "Rounds",
    segment: "rounds",
    group: "consult",
    surface: "tab",
    requiredCapability: null,
  },
  {
    id: "theatre",
    label: "Theatre",
    segment: "theatre",
    group: "consult",
    surface: "menu",
    requiredCapability: null,
  },
  {
    id: "physical-examination",
    label: "Exam",
    segment: "physical-examination",
    group: "consult",
    surface: "menu",
    requiredCapability: "view_physical_examination_tab",
  },
  {
    id: "diagnoses",
    label: "Diagnoses",
    segment: "diagnoses",
    group: "consult",
    surface: "menu",
    requiredCapability: "view_diagnoses_tab",
  },
  {
    id: "notes",
    label: "Clinical notes",
    segment: "notes",
    group: "record",
    surface: "menu",
    requiredCapability: "record_clinical_note",
  },
  {
    id: "allergies",
    label: "Allergies",
    segment: "allergies",
    group: "nurse",
    surface: "menu",
    requiredCapability: "record_allergy",
  },
  {
    id: "disposition",
    label: "Disposition",
    segment: "disposition",
    group: "record",
    surface: "menu",
    requiredCapability: "record_disposition",
  },
  {
    id: "client",
    label: "Client",
    segment: "client",
    group: "record",
    surface: "menu",
    requiredCapability: "view_client_tab",
  },
  {
    id: "overview",
    label: "Chart summary",
    segment: "chart",
    group: "record",
    surface: "menu",
    requiredCapability: null,
  },
];

export const IPD_WORKSPACE_ROUTING: ClinicalWorkspaceRouting<IpdEncounterTabId> = {
  specialty: getClinicalSpecialty("ipd"),
  encounterNoun: "IPD encounter",
  tabs: IPD_ENCOUNTER_TABS,
  consultLayoutTabIds: new Set<IpdEncounterTabId>([
    "stay",
    "complaint",
    "orders",
    "medications",
    "emar",
    "vital-signs",
    "nursing",
    "rounds",
    "physical-examination",
    "diagnoses",
  ]),
  fullWidthTabIds: new Set<IpdEncounterTabId>(["activity", "theatre"]),
  preferredTabsByRole: {
    nurse: ["activity", "vital-signs", "nursing", "emar"],
    physician: ["activity", "stay", "rounds"],
  },
  fallbackTabId: "overview",
};
