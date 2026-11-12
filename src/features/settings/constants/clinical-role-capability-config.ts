import type { ClinicalCapabilityKey } from "@/features/clinical-opd/types/clinical-opd.types";

export type ClinicalRoleCapabilityMeta = {
  key: ClinicalCapabilityKey;
  label: string;
  description: string;
};

export const CLINICAL_WORKSPACE_TAB_CAPABILITIES: ClinicalRoleCapabilityMeta[] = [
  {
    key: "view_activity_tab",
    label: "Activity",
    description: "Visit timeline and recent events",
  },
  {
    key: "view_vital_signs_tab",
    label: "Vital signs",
    description: "Recorded vitals for the visit",
  },
  {
    key: "view_physical_examination_tab",
    label: "Physical examination",
    description: "Exam findings on the visit",
  },
  {
    key: "view_orders_tab",
    label: "Orders",
    description: "Labs, imaging, and other orders",
  },
  {
    key: "view_investigation_results_tab",
    label: "Investigation results",
    description: "Released laboratory and radiology results",
  },
  {
    key: "view_diagnoses_tab",
    label: "Diagnoses",
    description: "Diagnoses recorded for the visit",
  },
  {
    key: "view_medications_tab",
    label: "Medications",
    description: "Active and prescribed medications",
  },
  {
    key: "view_nursing_notes_tab",
    label: "Nurse's notes",
    description: "Nurse's notes for the visit",
  },
  {
    key: "view_client_tab",
    label: "Client",
    description: "Client profile in the visit workspace",
  },
];

export const CLINICAL_ROLE_ACTION_CAPABILITIES: ClinicalRoleCapabilityMeta[] = [
  {
    key: "record_vitals",
    label: "Record vitals",
    description: "Enter vital signs during a visit",
  },
  {
    key: "record_nursing_note",
    label: "Record nursing notes",
    description: "Write and amend nursing notes on the visit",
  },
  {
    key: "order_laboratory",
    label: "Laboratory orders",
    description: "Place laboratory orders",
  },
  {
    key: "order_radiology",
    label: "Radiology orders",
    description: "Place radiology orders",
  },
  {
    key: "order_procedure",
    label: "Procedure orders",
    description: "Place procedure orders",
  },
  {
    key: "order_sundry",
    label: "Sundry orders",
    description: "Place sundry and supply orders",
  },
  {
    key: "order_medication",
    label: "Medication orders",
    description: "Place medication orders",
  },
  {
    key: "record_physical_exam",
    label: "Physical examination",
    description: "Record exam findings",
  },
  {
    key: "record_clinical_note",
    label: "Clinical notes",
    description: "Write clinician notes on the visit",
  },
  {
    key: "manage_diagnoses",
    label: "Diagnoses",
    description: "Add or update visit diagnoses",
  },
  {
    key: "prescribe",
    label: "Prescriptions",
    description: "Create and manage prescriptions",
  },
];

export const DENTAL_ROLE_CAPABILITIES: ClinicalRoleCapabilityMeta[] = [
  {
    key: "view_dental_chart_tab",
    label: "Dental chart tab",
    description: "Open the odontogram in dental encounters",
  },
  {
    key: "view_treatment_plan_tab",
    label: "Treatment plan tab",
    description: "Open treatment plans in dental encounters",
  },
  {
    key: "view_dental_history_tab",
    label: "Dental history tab",
    description: "Review earlier dental visits, findings, and procedures",
  },
  {
    key: "record_dental_chart",
    label: "Record dental chart",
    description: "Record and resolve findings on teeth",
  },
  {
    key: "manage_treatment_plan",
    label: "Manage treatment plans",
    description: "Create, sequence, and accept treatment plans",
  },
  {
    key: "perform_dental_procedure",
    label: "Perform dental procedures",
    description: "Perform procedures and bill them to the visit",
  },
];

export const THEATRE_ROLE_CAPABILITIES: ClinicalRoleCapabilityMeta[] = [
  {
    key: "view_theatre_queue",
    label: "Theatre queue & workspace",
    description: "Open the theatre queue and theatre encounters",
  },
  {
    key: "book_theatre_case",
    label: "Book theatre cases",
    description: "Book theatre cases, including from the IPD Theatre tab",
  },
  {
    key: "transition_theatre_case",
    label: "Move case status",
    description: "Check in, start, sign out, recover, discharge, postpone or cancel cases",
  },
  {
    key: "view_theatre_board",
    label: "Theatre board",
    description: "See the day's cases by operating room",
  },
  {
    key: "manage_theatre_team",
    label: "Manage surgical team",
    description: "Add or remove surgeons, anaesthetists and nurses on a case",
  },
  {
    key: "record_theatre_checklist",
    label: "WHO safety checklist",
    description: "Record sign in, time out and sign out",
  },
  {
    key: "record_theatre_pre_op",
    label: "Pre-op assessment",
    description: "Record ASA grade, consent, fasting and anaesthesia plan",
  },
  {
    key: "record_theatre_anaesthesia",
    label: "Anaesthesia record",
    description: "Record technique, airway, agents, fluids, vitals and times",
  },
  {
    key: "record_theatre_operation_note",
    label: "Write operation notes",
    description: "Record procedure, findings, implants, specimens and closure",
  },
  {
    key: "sign_theatre_operation_note",
    label: "Sign operation notes",
    description: "Sign and lock the operation note",
  },
  {
    key: "record_theatre_recovery",
    label: "Recovery (PACU)",
    description: "Record recovery observations, Aldrete score and handover",
  },
  {
    key: "record_theatre_consumables",
    label: "Record consumables & implants",
    description: "Bill consumables, implants and procedure charges to the visit",
  },
  {
    key: "issue_theatre_consumables",
    label: "Issue theatre stock",
    description: "Issue recorded items from inventory (needs Dispensation access)",
  },
  {
    key: "return_theatre_consumables",
    label: "Return theatre stock",
    description:
      "Return unused issued items to stock and reduce the bill (needs Dispensation access)",
  },
  {
    key: "record_theatre_obstetrics",
    label: "Caesarean & babies",
    description:
      "Record caesarean details (category, indication, gestation, blood loss) and each baby's birth time, weight and Apgar",
  },
  {
    key: "register_theatre_newborn",
    label: "Register newborns",
    description:
      "Create the baby's own patient record linked to the mother; admitting the baby also needs IPD access",
  },
  {
    key: "convert_theatre_case_to_ipd",
    label: "Convert day case to inpatient",
    description:
      "Admit a day case to a ward bed part-way through the case (needs IPD access)",
  },
  {
    key: "view_theatre_reports",
    label: "Theatre reports",
    description: "See case volumes, room utilisation and cancellations",
  },
  {
    key: "start_theatre_crash_case",
    label: "Start crash cases",
    description:
      "Take an emergency patient straight into theatre; pre-op, consent and WHO checklist are completed afterwards",
  },
  {
    key: "manage_theatre_rooms",
    label: "Manage theatre rooms",
    description: "Add, rename and deactivate operating rooms",
  },
  {
    key: "manage_theatre_cancellation_reasons",
    label: "Manage cancellation reasons",
    description: "Add, rename and retire the standard cancellation / postponement reasons",
  },
];
