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

export type UpdateTheatreCaseDetailsPayload = {
  procedure_description?: string;
  urgency?: TheatreCaseUrgency;
  notes?: string;
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

/* ------------------------------------------------------------------ */
/* Phase 3: anaesthesia, operation note, recovery, consumables, reports */
/* ------------------------------------------------------------------ */

export const THEATRE_ANAESTHESIA_TECHNIQUES = [
  "general",
  "spinal",
  "epidural",
  "cse",
  "regional",
  "local",
  "sedation",
] as const;

export type TheatreAnaesthesiaTechnique =
  (typeof THEATRE_ANAESTHESIA_TECHNIQUES)[number];

export const THEATRE_AIRWAYS = [
  "none",
  "face_mask",
  "lma",
  "ett",
  "tracheostomy",
] as const;

export type TheatreAirway = (typeof THEATRE_AIRWAYS)[number];

/** Free-form chart rows (agents, fluids, blood products, events). */
export type TheatreChartEntry = {
  name?: string;
  dose?: string;
  volume_ml?: number | string;
  time?: string;
  note?: string;
};

export type TheatreAnaesthesiaVital = {
  uuid: string;
  recorded_at: string;
  heart_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  spo2: number | null;
  etco2: number | null;
  respiratory_rate: number | null;
  temperature_c: string | null;
  notes: string;
};

export type TheatreAnaesthesiaRecord = {
  uuid: string;
  anaesthetist: number | null;
  anaesthetist_name: string;
  technique: TheatreAnaesthesiaTechnique | "";
  airway: TheatreAirway | "";
  airway_notes: string;
  agents: TheatreChartEntry[];
  fluids: TheatreChartEntry[];
  blood_products: TheatreChartEntry[];
  events: TheatreChartEntry[];
  estimated_blood_loss_ml: number | null;
  urine_output_ml: number | null;
  anaesthesia_start: string | null;
  induction_at: string | null;
  anaesthesia_end: string | null;
  notes: string;
  vitals: TheatreAnaesthesiaVital[];
  signed_at: string | null;
  signed_by_name: string;
  updated_at: string;
};

export type UpdateTheatreAnaesthesiaPayload = Partial<
  Omit<
    TheatreAnaesthesiaRecord,
    "uuid" | "anaesthetist_name" | "vitals" | "signed_at" | "signed_by_name" | "updated_at"
  >
>;

export type AddTheatreAnaesthesiaVitalPayload = Partial<
  Omit<TheatreAnaesthesiaVital, "uuid">
>;

export type TheatreOperationNote = {
  uuid: string;
  surgeon: number | null;
  surgeon_name: string;
  assistants: string;
  procedure_performed: string;
  indication: string;
  incision: string;
  findings: string;
  procedure_details: string;
  implants: string;
  specimens: string;
  specimens_sent_to_lab: boolean;
  drains: string;
  closure: string;
  estimated_blood_loss_ml: number | null;
  complications: string;
  post_op_instructions: string;
  signed_at: string | null;
  signed_by_name: string;
  updated_at: string;
};

export type UpdateTheatreOperationNotePayload = Partial<
  Omit<
    TheatreOperationNote,
    "uuid" | "surgeon_name" | "signed_at" | "signed_by_name" | "updated_at"
  >
>;

export const THEATRE_HANDOVER_DESTINATIONS = [
  "ward",
  "home",
  "hdu",
  "icu",
  "other",
] as const;

export type TheatreHandoverDestination =
  (typeof THEATRE_HANDOVER_DESTINATIONS)[number];

export const THEATRE_ALDRETE_ITEMS = [
  "activity",
  "respiration",
  "circulation",
  "consciousness",
  "oxygen_saturation",
] as const;

export type TheatreAldreteItem = (typeof THEATRE_ALDRETE_ITEMS)[number];

export type TheatreRecoveryObservation = {
  uuid: string;
  recorded_at: string;
  activity: number;
  respiration: number;
  circulation: number;
  consciousness: number;
  oxygen_saturation: number;
  aldrete_total: number;
  heart_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  spo2: number | null;
  pain_score: number | null;
  notes: string;
};

export type AddTheatreRecoveryObservationPayload = Record<TheatreAldreteItem, number> &
  Partial<
    Pick<
      TheatreRecoveryObservation,
      "heart_rate" | "systolic_bp" | "diastolic_bp" | "spo2" | "pain_score" | "notes"
    >
  >;

export type TheatreRecoveryRecord = {
  uuid: string;
  arrived_at: string | null;
  handover_destination: TheatreHandoverDestination | "";
  handed_over_to: string;
  notes: string;
  observations: TheatreRecoveryObservation[];
  latest_aldrete: number | null;
  discharge_score: number | null;
  discharged_at: string | null;
  discharged_by_name: string;
  updated_at: string;
};

export type UpdateTheatreRecoveryPayload = Partial<
  Pick<TheatreRecoveryRecord, "handover_destination" | "handed_over_to" | "notes">
>;

export type TheatreConsumableKind = "consumable" | "implant" | "procedure";

export type TheatreConsumableStatus = "recorded" | "issued" | "cancelled";

export type TheatreConsumable = {
  uuid: string;
  kind: TheatreConsumableKind;
  kind_label: string;
  status: TheatreConsumableStatus;
  status_label: string;
  product_uuid: string;
  product_name: string;
  product_type: string;
  quantity: string;
  visit_order_uuid: string | null;
  issued_at: string | null;
  issued_by_name: string;
  manufacturer: string;
  lot_number: string;
  serial_number: string;
  expiry_date: string | null;
  implant_site: string;
  notes: string;
  created_at: string;
};

export type AddTheatreConsumablePayload = {
  product_uuid: string;
  kind: TheatreConsumableKind;
  quantity?: string | number;
  manufacturer?: string;
  lot_number?: string;
  serial_number?: string;
  expiry_date?: string | null;
  implant_site?: string;
  notes?: string;
};

export type IssueTheatreConsumablePayload = {
  location_uuid?: string | null;
  batches?: { batch_id: number; quantity: string }[];
};

export type TheatreReportFilters = {
  date_from: string;
  date_to: string;
  clinic?: string;
  session_hours?: string;
};

export type TheatreReportRoomRow = {
  room_uuid: string | null;
  room_name: string;
  cases: number;
  completed: number;
  cancelled: number;
  operating_minutes: number;
  utilisation_percent: number | null;
};

export type TheatreReportSurgeonRow = {
  surgeon_id: number | null;
  surgeon_name: string;
  cases: number;
  completed: number;
  cancelled: number;
  operating_minutes: number;
};

export type TheatreReportCancellation = {
  case_uuid: string;
  status: "cancelled" | "postponed";
  procedure_description: string;
  scheduled_start: string | null;
  room_name: string;
  surgeon_name: string;
  reason: string;
  recorded_at: string | null;
  recorded_by: string;
};

export type TheatreReportSummary = {
  date_from: string;
  date_to: string;
  days: number;
  session_hours: number;
  totals: {
    cases: number;
    completed: number;
    cancelled: number;
    postponed: number;
    in_progress: number;
    operating_minutes: number;
    average_case_minutes: number | null;
  };
  by_status: { status: TheatreCaseStatus; label: string; count: number }[];
  by_urgency: { urgency: TheatreCaseUrgency; label: string; count: number }[];
  by_room: TheatreReportRoomRow[];
  by_surgeon: TheatreReportSurgeonRow[];
  cancellations: TheatreReportCancellation[];
};
