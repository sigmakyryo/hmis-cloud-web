/** Theatre case and room shapes — keep in sync with api/eportal/theatre/api/v1/serializers. */

export const THEATRE_CASE_STATUSES = [
  "booked",
  "waiting",
  "pre_op",
  "in_theatre",
  "sign_out",
  "recovery",
  "discharged_ward",
  "discharged_home",
  "cancelled",
  "postponed",
] as const;

export type TheatreCaseStatus = (typeof THEATRE_CASE_STATUSES)[number];

export type TheatreCaseSource = "ipd_stay" | "existing_visit" | "elective";

export type TheatreCaseUrgency = "elective" | "urgent" | "emergency";

export type TheatreRoomKind = "major" | "minor" | "endoscopy";

export type TheatreRoom = {
  uuid: string;
  name: string;
  code: string;
  kind: TheatreRoomKind;
  notes: string;
  is_active: boolean;
  location_uuid: string;
  clinic_uuid: string;
  clinic_name: string;
  department_uuid: string;
  department_name: string;
  created_at: string;
  updated_at: string;
};

export type TheatreCaseRoom = {
  uuid: string;
  name: string;
  code: string;
  kind: TheatreRoomKind;
};

export type TheatreCase = {
  uuid: string;
  status: TheatreCaseStatus;
  status_label: string;
  source: TheatreCaseSource;
  urgency: TheatreCaseUrgency;
  billing_mode: string;
  mode_of_payment: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  recovery_started_at: string | null;
  discharged_at: string | null;
  procedure_description: string;
  notes: string;
  clinic_uuid: string;
  clinic_name: string;
  department_uuid: string;
  department_name: string;
  room: TheatreCaseRoom | null;
  customer_uuid: string;
  customer_name: string;
  visit_uuid: string | null;
  encounter_uuid: string | null;
  encounter_status: string | null;
  stay_uuid: string | null;
  appointment_uuid: string | null;
  procedure_order_uuid: string | null;
  procedure_order_description: string | null;
  lead_surgeon_id: number | null;
  lead_surgeon_name: string;
  booked_by_name: string;
  allowed_transitions: TheatreCaseStatus[];
  safety: TheatreCaseSafety;
  created_at: string;
  updated_at: string;
};

/** WHO checklist and pre-op readiness badges on every case. */
export type TheatreCaseSafety = {
  sign_in: boolean;
  time_out: boolean;
  sign_out: boolean;
  pre_op_ready: boolean;
};

export type TheatreCaseFilters = {
  clinic?: string;
  room?: string;
  /** Comma-separated statuses. */
  status?: string;
  stay?: string;
  visit?: string;
  encounter?: string;
  source?: TheatreCaseSource;
  date?: string;
};

export type TheatreRoomFilters = {
  clinic?: string;
  department?: string;
  include_inactive?: boolean;
};

export type CreateTheatreCasePayload = {
  source: TheatreCaseSource;
  stay?: string;
  visit?: string;
  encounter?: string;
  customer?: string;
  clinic?: string;
  department?: string;
  room?: string | null;
  urgency?: TheatreCaseUrgency;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  procedure_description?: string;
  notes?: string;
  procedure_order?: string;
  lead_surgeon?: number | null;
  /** Non-IPD cases with a room and slot are put on the scheduling calendar. */
  create_appointment?: boolean;
};

export type CreateTheatreRoomPayload = {
  clinic: string;
  department?: string;
  name: string;
  code?: string;
  kind?: TheatreRoomKind;
  notes?: string;
};

export type UpdateTheatreRoomPayload = Partial<
  Pick<TheatreRoom, "name" | "kind" | "notes" | "is_active">
>;

export const THEATRE_TEAM_ROLES = [
  "surgeon",
  "assistant_surgeon",
  "anaesthetist",
  "anaesthetic_nurse",
  "scrub_nurse",
  "circulating_nurse",
  "other",
] as const;

export type TheatreTeamRole = (typeof THEATRE_TEAM_ROLES)[number];

export type TheatreTeamMember = {
  uuid: string;
  role: TheatreTeamRole;
  role_label: string;
  user_id: number;
  user_name: string;
  user_role: string;
  notes: string;
  created_at: string;
};

export type AddTheatreTeamMemberPayload = {
  user: number;
  role: TheatreTeamRole;
  notes?: string;
};

export const THEATRE_CHECKLIST_STAGES = ["sign_in", "time_out", "sign_out"] as const;

export type TheatreChecklistStageId = (typeof THEATRE_CHECKLIST_STAGES)[number];

export type TheatreChecklistItem = {
  key: string;
  label: string;
  checked: boolean;
};

export type TheatreChecklistStage = {
  stage: TheatreChecklistStageId;
  label: string;
  items: TheatreChecklistItem[];
  notes: string;
  is_complete: boolean;
  completed_at: string | null;
  completed_by_name: string;
};

export type RecordTheatreChecklistPayload = {
  responses: Record<string, boolean>;
  notes?: string;
  complete?: boolean;
};

export type TheatreAsaGrade = "1" | "2" | "3" | "4" | "5" | "6";

export type TheatreAnaesthesiaPlan =
  | "general"
  | "spinal"
  | "regional"
  | "local"
  | "sedation";

export type TheatrePreOp = {
  uuid: string;
  asa_grade: TheatreAsaGrade | "";
  asa_emergency: boolean;
  anaesthesia_plan: TheatreAnaesthesiaPlan | "";
  consent_signed: boolean;
  consent_signed_at: string | null;
  fasting_since: string | null;
  site_marked: boolean;
  allergies_reviewed: boolean;
  blood_available: boolean;
  weight_kg: string | null;
  notes: string;
  assessed_by_name: string;
  assessed_at: string | null;
  updated_at: string;
};

export type UpdateTheatrePreOpPayload = Partial<
  Omit<
    TheatrePreOp,
    "uuid" | "consent_signed_at" | "assessed_by_name" | "assessed_at" | "updated_at"
  >
>;

export type TheatreBoardRoom = {
  uuid: string;
  name: string;
  code: string;
  kind: TheatreRoomKind;
  is_active: boolean;
};

export type TheatreBoardLane = {
  /** ``null`` is the unassigned lane (emergency add-ons, cases with no room). */
  room: TheatreBoardRoom | null;
  cases: TheatreCase[];
};

export type TheatreBoard = {
  date: string;
  lanes: TheatreBoardLane[];
};

export type TheatreBoardFilters = {
  date?: string;
  clinic?: string;
};
