import { getClinicalSpecialty } from "@/features/clinical-workspace/constants/clinical-specialties";
import type {
  ClinicalWorkspaceRouting,
  ClinicalWorkspaceTab,
} from "@/features/clinical-workspace/types/clinical-workspace.types";

export type TheatreEncounterTabId =
  | "overview"
  | "case"
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
 * Theatre workspace sections. The case itself is one guided flow on the
 * `case` route (`?step=` picks the perioperative step); the case header owns
 * navigation, so the shared tab bar is hidden. Disposition is left out on
 * purpose: the theatre encounter is completed by the case status machine
 * (return to ward / discharge home), not by the generic disposition flow.
 */
export const THEATRE_ENCOUNTER_TABS: ClinicalWorkspaceTab<TheatreEncounterTabId>[] = [
  {
    id: "case",
    label: "Theatre case",
    segment: "case",
    group: "consult",
    surface: "tab",
    requiredCapability: "view_theatre_queue",
  },
  // General clinical sections live under "More" so the tab bar follows the
  // theatre stages only.
  {
    id: "vital-signs",
    label: "Vital signs",
    segment: "vital-signs",
    group: "consult",
    surface: "menu",
    requiredCapability: "view_vital_signs_tab",
  },
  {
    id: "nursing",
    label: "Nursing",
    segment: "nursing",
    group: "consult",
    surface: "menu",
    requiredCapability: "view_nursing_notes_tab",
  },
  {
    id: "orders",
    label: "Orders",
    segment: "orders",
    group: "consult",
    surface: "menu",
    requiredCapability: "view_orders_tab",
  },
  {
    id: "medications",
    label: "Medications",
    segment: "medications",
    group: "consult",
    surface: "menu",
    requiredCapability: "view_medications_tab",
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
    id: "activity",
    label: "Activity",
    segment: "activity",
    group: "record",
    surface: "menu",
    requiredCapability: "view_activity_tab",
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

/**
 * Older theatre URL segments (the one-tab-per-record layout and the later
 * Pre-op / Intra-op / Recovery sections), mapped to the case-flow step and
 * Operation part that now hold them, so saved links keep working.
 * `checklist` resolves to whichever WHO stage is due once the case loads.
 */
export const THEATRE_LEGACY_SEGMENTS: Readonly<
  Record<string, { step: string; section?: string }>
> = {
  checklist: { step: "checklist" },
  team: { step: "booking" },
  anaesthesia: { step: "intra-op", section: "anaesthesia" },
  "op-note": { step: "op-note" },
  consumables: { step: "intra-op", section: "consumables" },
  "pre-op": { step: "pre-op" },
  "intra-op": { step: "intra-op" },
  recovery: { step: "recovery" },
};

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
    fullWidthTabIds: new Set<TheatreEncounterTabId>(["activity", "case"]),
    preferredTabsByRole: {
      nurse: ["case"],
      physician: ["case"],
    },
    fallbackTabId: "case",
    hideSectionTabBar: true,
  };

/** The theatre case flow route for an encounter. */
export function theatreCaseHref(visitUuid: string, encounterUuid: string): string {
  return `${THEATRE_WORKSPACE_ROUTING.specialty.basePath}/${visitUuid}/${encounterUuid}/case`;
}

/**
 * Where an old theatre URL segment now lives. `section` (the old intra-op
 * `?section=`) is carried over so the right Operation part opens.
 */
export function theatreLegacySegmentHref(
  visitUuid: string,
  encounterUuid: string,
  segment: keyof typeof THEATRE_LEGACY_SEGMENTS | string,
  section?: string | null,
): string {
  const caseHref = theatreCaseHref(visitUuid, encounterUuid);
  const target = THEATRE_LEGACY_SEGMENTS[segment];
  if (!target) return caseHref;
  const params = new URLSearchParams({ step: target.step });
  const carried = section || target.section;
  if (carried) params.set("section", carried);
  return `${caseHref}?${params.toString()}`;
}
