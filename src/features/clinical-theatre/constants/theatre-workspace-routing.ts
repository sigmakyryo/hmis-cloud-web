import { getClinicalSpecialty } from "@/features/clinical-workspace/constants/clinical-specialties";
import type {
  ClinicalWorkspaceRouting,
  ClinicalWorkspaceTab,
} from "@/features/clinical-workspace/types/clinical-workspace.types";

export type TheatreEncounterTabId =
  | "overview"
  | "case"
  | "pre-op"
  | "intra-op"
  | "recovery"
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
    label: "Overview",
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
    id: "intra-op",
    label: "Intra-op",
    segment: "intra-op",
    group: "consult",
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
 * Segments of the old one-tab-per-record layout, mapped to the section (and
 * intra-op sub-section) that now holds them, so saved links keep working.
 */
export const THEATRE_LEGACY_SEGMENTS: Readonly<
  Record<string, { tab: TheatreEncounterTabId; section?: string }>
> = {
  checklist: { tab: "pre-op" },
  team: { tab: "case" },
  anaesthesia: { tab: "intra-op", section: "anaesthesia" },
  "op-note": { tab: "intra-op", section: "op-note" },
  consumables: { tab: "intra-op", section: "consumables" },
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
    fullWidthTabIds: new Set<TheatreEncounterTabId>([
      "activity",
      "case",
      "pre-op",
      "intra-op",
      "recovery",
    ]),
    preferredTabsByRole: {
      nurse: ["case", "pre-op", "recovery"],
      physician: ["case", "pre-op", "intra-op"],
    },
    fallbackTabId: "case",
  };

/** Where an old per-record theatre URL segment now lives. */
export function theatreLegacySegmentHref(
  visitUuid: string,
  encounterUuid: string,
  segment: keyof typeof THEATRE_LEGACY_SEGMENTS | string,
): string {
  const base = `${THEATRE_WORKSPACE_ROUTING.specialty.basePath}/${visitUuid}/${encounterUuid}`;
  const target = THEATRE_LEGACY_SEGMENTS[segment];
  if (!target) return base;
  const tab = THEATRE_ENCOUNTER_TABS.find((item) => item.id === target.tab);
  const href = `${base}/${tab?.segment ?? target.tab}`;
  return target.section ? `${href}?section=${target.section}` : href;
}
