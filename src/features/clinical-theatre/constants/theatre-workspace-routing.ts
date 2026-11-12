import { getClinicalSpecialty } from "@/features/clinical-workspace/constants/clinical-specialties";
import type {
  ClinicalWorkspaceRouting,
  ClinicalWorkspaceTab,
} from "@/features/clinical-workspace/types/clinical-workspace.types";

export type TheatreEncounterTabId =
  | "overview"
  | "case"
  | "pre-op"
  | "checklist"
  | "team"
  | "anaesthesia"
  | "op-note"
  | "recovery"
  | "consumables"
  | "activity"
  | "complaint"
  | "notes"
  | "orders"
  | "medications"
  | "physical-examination"
  | "diagnoses"
  | "vital-signs"
  | "nursing"
  | "allergies"
  | "client";

/**
 * Theatre workspace tabs. Disposition is left out on purpose: the theatre
 * encounter is completed by the case status machine (return to ward /
 * discharge home), not by the generic disposition flow.
 */
export const THEATRE_ENCOUNTER_TABS: ClinicalWorkspaceTab<TheatreEncounterTabId>[] = [
  {
    id: "case",
    label: "Case",
    segment: "case",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_theatre_queue",
  },
  {
    id: "pre-op",
    label: "Pre-op",
    segment: "pre-op",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_theatre_queue",
  },
  {
    id: "checklist",
    label: "WHO checklist",
    segment: "checklist",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_theatre_queue",
  },
  {
    id: "team",
    label: "Team",
    segment: "team",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_theatre_queue",
  },
  {
    id: "anaesthesia",
    label: "Anaesthesia",
    segment: "anaesthesia",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_theatre_queue",
  },
  {
    id: "op-note",
    label: "Op note",
    segment: "op-note",
    group: "record",
    surface: "tab",
    requiredCapability: "view_theatre_queue",
  },
  {
    id: "recovery",
    label: "Recovery",
    segment: "recovery",
    group: "nurse",
    surface: "tab",
    requiredCapability: "view_theatre_queue",
  },
  {
    id: "consumables",
    label: "Consumables",
    segment: "consumables",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_theatre_queue",
  },
  {
    id: "activity",
    label: "Activity",
    segment: "activity",
    group: "record",
    surface: "tab",
    requiredCapability: "view_activity_tab",
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
    id: "notes",
    label: "Clinical notes",
    segment: "notes",
    group: "record",
    surface: "tab",
    requiredCapability: "record_clinical_note",
  },
  {
    id: "complaint",
    label: "Complaints & HPI",
    segment: "complaint",
    group: "consult",
    surface: "menu",
    requiredCapability: ["record_chief_complaint", "record_hpi"],
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
    id: "allergies",
    label: "Allergies",
    segment: "allergies",
    group: "nurse",
    surface: "menu",
    requiredCapability: "record_allergy",
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

export const THEATRE_WORKSPACE_ROUTING: ClinicalWorkspaceRouting<TheatreEncounterTabId> =
  {
    specialty: getClinicalSpecialty("theatre"),
    encounterNoun: "theatre encounter",
    tabs: THEATRE_ENCOUNTER_TABS,
    consultLayoutTabIds: new Set<TheatreEncounterTabId>([
      "complaint",
      "orders",
      "medications",
      "vital-signs",
      "nursing",
      "physical-examination",
      "diagnoses",
    ]),
    fullWidthTabIds: new Set<TheatreEncounterTabId>([
      "activity",
      "case",
      "pre-op",
      "checklist",
      "team",
      "anaesthesia",
      "op-note",
      "recovery",
      "consumables",
    ]),
    preferredTabsByRole: {
      nurse: ["case", "checklist", "recovery", "consumables"],
      physician: ["case", "pre-op", "op-note", "anaesthesia"],
    },
    fallbackTabId: "case",
  };
