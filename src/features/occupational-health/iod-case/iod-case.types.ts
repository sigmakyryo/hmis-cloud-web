export type IodCaseStatus = "open" | "under_review" | "closed";

export type IodCaseDetail = {
  id: number;
  uuid: string;
  customer: number | null;
  customer_uuid: string | null;
  employment_episode: number | null;
  encounter: number | null;
  encounter_uuid: string | null;
  visit_uuid: string | null;
  she_reference: string;
  severity: string;
  lost_days: number;
  status: string;
  onset_date: string | null;
  incident_time: string | null;
  mechanism: string;
  body_part: string;
  incident_location: string;
  reported_by: string;
  safety_classification: string;
  work_related: boolean;
  description: string;
  witnesses: string;
  immediate_action: string;
  treatment_given: string;
  root_cause: string;
  employer_notified_on: string | null;
  authority_notified_on: string | null;
  claim_reference: string;
  return_to_work_on: string | null;
  closed_on: string | null;
  closure_summary: string;
  /** The OPD visit and encounter the case was recorded from (HMIS ids), when it was. */
  source_visit_uuid: string | null;
  source_encounter_uuid: string | null;
  /** AI write-up from the visit record: "" (not tried), waiting, documented, needs_input, failed. */
  ai_status: string;
  ai_documented_at: string | null;
  /** Fields the AI filled in, for review. */
  ai_drafted_fields: string[];
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type IodEntryKind = "note" | "action" | "event";

export type IodCaseEntry = {
  uuid: string;
  kind: IodEntryKind;
  event_code: string;
  body: string;
  owner_name: string;
  due_date: string | null;
  completed_on: string | null;
  author_name: string;
  created_at: string | null;
};

export type IodNotice = {
  code: string;
  label: string;
  likely_required: boolean;
  missing_fields: string[];
  ready: boolean;
};

export type IodStatutoryPack = {
  notice: string;
  employee: {
    full_name: string;
    identifier: string;
    date_of_birth: string | null;
    gender: string;
    employee_number: string;
    job_title: string;
    department: string;
    site: string;
    employment_start_date: string | null;
    employment_type: string;
  };
  employer: { name: string; registration_number: string };
  medical: {
    first_treatment_date: string | null;
    treatment_given: string;
    lost_days: number;
    fitness_outcome: string | null;
    restrictions: string[];
    certificate_valid_to: string | null;
  };
  classification: { lost_time_injury: boolean; fatal: boolean };
  notifications: IodNotice[];
  generated_at: string;
};

export type NewIodEntry =
  | { kind: "note"; body: string }
  | { kind: "action"; body: string; owner_name?: string; due_date?: string | null };
