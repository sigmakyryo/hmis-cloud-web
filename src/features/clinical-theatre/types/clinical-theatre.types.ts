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

/** NCEPOD classification of intervention (timing of surgery). */
export type TheatreNcepodCategory = "immediate" | "urgent" | "expedited" | "elective";

export type TheatreProcedureLaterality =
  | "not_applicable"
  | "left"
  | "right"
  | "bilateral"
  | "midline";

export type TheatreProcedureApproach =
  | "open"
  | "laparoscopic"
  | "endoscopic"
  | "robotic"
  | "percutaneous"
  | "vaginal"
  | "other";

/** One procedure of a case; the primary one comes first. */
export type TheatreCaseProcedure = {
  uuid: string;
  name: string;
  code: string;
  is_primary: boolean;
  sequence: number;
  laterality: TheatreProcedureLaterality | "";
  laterality_label: string;
  approach: TheatreProcedureApproach | "";
  approach_label: string;
  product_uuid: string | null;
  product_name: string;
  visit_order_uuid: string | null;
  visit_order_description: string;
  surgeon_id: number | null;
  surgeon_name: string;
  notes: string;
  /** Procedure codes snapshotted from the catalogue product. */
  coding?: TheatreProcedureCodeRef[];
  /** Free text with no catalogue product (older rows). */
  is_legacy?: boolean;
  is_billed?: boolean;
  visit_order_status?: string;
};

export type TheatreProcedureCodeSystem = "cpt" | "icd10pcs" | "local";

export type TheatreProcedureCodeRef = {
  uuid?: string;
  system: TheatreProcedureCodeSystem;
  system_label?: string;
  code: string;
  description: string;
  is_primary: boolean;
};

export type TheatreCaseProcedurePayload = {
  name?: string;
  code?: string;
  is_primary?: boolean;
  sequence?: number;
  laterality?: TheatreProcedureLaterality | "";
  approach?: TheatreProcedureApproach | "";
  product?: string | null;
  visit_order?: string | null;
  surgeon?: number | null;
  notes?: string;
};

export type TheatrePaperworkItem = {
  key: string;
  label: string;
  /** Workspace section where it is completed: "pre-op" | "intra-op". */
  section: string;
};

/** Outstanding records of an emergency crash case. */
export type TheatreCasePaperwork = {
  required: boolean;
  outstanding: TheatrePaperworkItem[];
  is_complete: boolean;
  decision_to_incision_minutes: number | null;
};

/** Either side of a return-to-theatre link. */
export type TheatreCaseReturnLink = {
  uuid: string;
  status: TheatreCaseStatus;
  status_label: string;
  procedure_description: string;
  actual_start: string | null;
  actual_end: string | null;
  visit_uuid: string | null;
  encounter_uuid: string | null;
  return_planned: boolean | null;
  return_reason: string;
};

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
  is_crash: boolean;
  ncepod_category: TheatreNcepodCategory | "";
  ncepod_category_label: string;
  decision_at: string | null;
  procedures: TheatreCaseProcedure[];
  paperwork: TheatreCasePaperwork;
  return_of: TheatreCaseReturnLink | null;
  return_reason: string;
  return_planned: boolean | null;
  return_interval_days: number | null;
  returns: TheatreCaseReturnLink[];
  cancellation_reason?: TheatreCaseCancellationReason | null;
  cancellation_note?: string;
  cancelled_on_the_day?: boolean | null;
  cancelled_at?: string | null;
  customer_gender?: string | null;
  preference_card_applied_at?: string | null;
  preference_setup?: TheatrePreferenceSetup;
  converted_to_ipd_at?: string | null;
  converted_from_source?: TheatreCaseSource | "";
  conversion_reason?: string;
  created_at: string;
  updated_at: string;
};

export type TheatreCancellationCategory =
  | "patient"
  | "clinical"
  | "organisational"
  | "resources"
  | "other";

/** Reason summary embedded in a cancelled / postponed case. */
export type TheatreCaseCancellationReason = {
  uuid: string;
  code: string;
  label: string;
  category: TheatreCancellationCategory;
  category_label: string;
};

/** A tenant's standard cancellation / postponement reason. */
export type TheatreCancellationReason = {
  uuid: string;
  code: string;
  label: string;
  category: TheatreCancellationCategory;
  category_label: string;
  requires_note: boolean;
  sort_order: number;
  is_active: boolean;
};

export type CreateTheatreCancellationReasonPayload = {
  label: string;
  code?: string;
  category: TheatreCancellationCategory;
  requires_note?: boolean;
  sort_order?: number;
};

export type UpdateTheatreCancellationReasonPayload = Partial<
  Omit<CreateTheatreCancellationReasonPayload, "code"> & { is_active: boolean }
>;

/** WHO checklist and pre-op readiness badges on every case. */
export type TheatreCaseSafety = {
  sign_in: boolean;
  time_out: boolean;
  sign_out: boolean;
  pre_op_ready: boolean;
  /** Why the surgical count blocks sign-out ("" or absent when it does not). */
  count_blocker?: string;
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
  customer?: string;
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
  ncepod_category?: TheatreNcepodCategory | "";
  decision_at?: string | null;
  procedures?: TheatreCaseProcedurePayload[];
  return_of?: string | null;
  return_reason?: string;
  return_planned?: boolean | null;
};

/** Minimal input for an emergency crash case (straight into theatre). */
export type StartTheatreCrashCasePayload = {
  stay?: string;
  visit?: string;
  customer?: string;
  clinic?: string;
  room?: string | null;
  lead_surgeon?: number | null;
  procedure_description?: string;
  procedures?: TheatreCaseProcedurePayload[];
  ncepod_category?: TheatreNcepodCategory;
  decision_at?: string | null;
  notes?: string;
};

export type UpdateTheatreCaseDetailsPayload = {
  procedure_description?: string;
  urgency?: TheatreCaseUrgency;
  notes?: string;
  ncepod_category?: TheatreNcepodCategory | "";
  decision_at?: string | null;
  return_of?: string | null;
  return_reason?: string;
  return_planned?: boolean | null;
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

export type TheatreConsumableStatus = "recorded" | "issued" | "returned" | "cancelled";

export type TheatreConsumableReturn = {
  uuid: string;
  quantity: string;
  location_name: string;
  batches: { batch_id: number | null; quantity: string }[];
  reason: string;
  returned_by_name: string;
  returned_at: string;
  billing_action: "line_reduced" | "line_reversed";
  billing_action_label: string;
  billed_quantity_before: string;
  billed_quantity_after: string;
};

export type ReturnTheatreConsumablePayload = {
  quantity: string;
  reason: string;
  location_uuid?: string | null;
  batches?: { batch_id: number; quantity: string }[];
};

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
  returned_quantity?: string;
  returnable_quantity?: string;
  visit_order_uuid: string | null;
  issued_at: string | null;
  issued_by_name: string;
  issued_location_uuid?: string | null;
  issued_batches?: { batch_id: number; batch_number: string; quantity: string }[];
  returns?: TheatreConsumableReturn[];
  manufacturer: string;
  lot_number: string;
  serial_number: string;
  expiry_date: string | null;
  implant_site: string;
  implant_laterality?: string;
  inventory_batch?: { id: number; batch_number: string; expiry_date: string | null } | null;
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
  implant_laterality?: string;
  inventory_batch_id?: number | null;
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
  reason_code?: string;
  reason_label?: string;
  category?: TheatreCancellationCategory | "unspecified";
  on_the_day?: boolean;
  recorded_at: string | null;
  recorded_by: string;
};

export type TheatreReportCancellationSummary = {
  total: number;
  on_the_day: number;
  scheduled_cases: number;
  on_the_day_rate_percent: number | null;
  by_category: {
    category: TheatreCancellationCategory | "unspecified";
    label: string;
    count: number;
    on_the_day: number;
  }[];
  by_reason: {
    code: string;
    label: string;
    category: TheatreCancellationCategory | "unspecified";
    count: number;
    on_the_day: number;
  }[];
};

export type TheatreReportStockReturns = {
  returns: number;
  quantity: number;
  by_product: { product_name: string; returns: number; quantity: number }[];
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
  cancellation_summary?: TheatreReportCancellationSummary;
  stock_returns?: TheatreReportStockReturns;
  returns?: TheatreReportReturns;
  crash?: TheatreReportCrash;
  by_procedure?: TheatreReportProcedureRow[];
  obstetrics?: TheatreReportObstetrics;
  ipd_conversions?: TheatreReportIpdConversions;
};

export type TheatreReportObstetrics = {
  caesareans: number;
  by_category: { category: TheatreCaesareanCategory | ""; label: string; cases: number }[];
  babies: number;
  live_births: number;
  stillbirths: number;
  low_apgar_5: number;
  low_birth_weight: number;
  registered_newborns: number;
  unregistered_live_births: number;
};

export type TheatreReportIpdConversions = {
  converted: number;
  day_cases: number;
  rate: number;
  cases: {
    case_uuid: string;
    procedure_description: string;
    customer_name: string;
    converted_at: string;
    reason: string;
  }[];
};

// --- Caesarean / obstetric record, babies and newborn registration ---------

export type TheatreCaesareanCategory = "1" | "2" | "3" | "4";
export type TheatreUterineIncision = "lower_segment" | "classical" | "j_shaped" | "other";
export type TheatrePlacentaDelivery = "complete" | "incomplete" | "manual" | "retained";
export type TheatreBabySex = "female" | "male" | "indeterminate";
export type TheatreBabyOutcome =
  | "live_birth"
  | "fresh_stillbirth"
  | "macerated_stillbirth"
  | "early_neonatal_death";
export type TheatreBabyDestination = "with_mother" | "nursery" | "nicu" | "other";

export type TheatreObstetricRecord = {
  uuid: string;
  caesarean_category: TheatreCaesareanCategory | "";
  caesarean_category_label: string;
  indication: string;
  gestation_weeks: number | null;
  gestation_days: number | null;
  gravida: number | null;
  para: number | null;
  previous_caesareans: number | null;
  decision_to_delivery_minutes: number | null;
  uterine_incision: TheatreUterineIncision | "";
  placenta: TheatrePlacentaDelivery | "";
  estimated_blood_loss_ml: number | null;
  complications: string;
  notes: string;
  updated_by_name: string;
  updated_at: string;
};

export type TheatreBaby = {
  uuid: string;
  birth_order: number;
  time_of_birth: string;
  sex: TheatreBabySex;
  sex_label: string;
  outcome: TheatreBabyOutcome;
  outcome_label: string;
  birth_weight_g: number | null;
  apgar_1: number | null;
  apgar_5: number | null;
  apgar_10: number | null;
  resuscitation: boolean;
  resuscitation_notes: string;
  destination: TheatreBabyDestination;
  notes: string;
  newborn_uuid: string | null;
  newborn_name: string;
  newborn_identifier: string;
  newborn_stay_uuid: string | null;
  registered_at: string | null;
  registered_by_name: string;
};

export type TheatreObstetricPayload = {
  record: TheatreObstetricRecord | null;
  babies: TheatreBaby[];
};

export type UpdateTheatreObstetricPayload = Partial<
  Omit<TheatreObstetricRecord, "uuid" | "caesarean_category_label" | "updated_by_name" | "updated_at">
>;

export type TheatreBabyWritePayload = {
  birth_order?: number | null;
  time_of_birth?: string | null;
  sex: TheatreBabySex;
  outcome?: TheatreBabyOutcome;
  birth_weight_g?: number | null;
  apgar_1?: number | null;
  apgar_5?: number | null;
  apgar_10?: number | null;
  resuscitation?: boolean;
  resuscitation_notes?: string;
  destination?: TheatreBabyDestination;
  notes?: string;
};

export type RegisterTheatreNewbornPayload = {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  bed?: string | null;
  department?: string | null;
  mode_of_payment?: string;
};

export type ConvertTheatreCaseToIpdPayload = {
  bed: string;
  reason: string;
  department?: string | null;
};

export type TheatreReportReturns = {
  window_days: number;
  total: number;
  planned: number;
  unplanned: number;
  unplanned_within_window: number;
  operated_cases: number;
  unplanned_return_rate_percent: number | null;
  cases: {
    case_uuid: string;
    original_case_uuid: string;
    procedure_description: string;
    reason: string;
    planned: boolean | null;
    days_after: number | null;
    surgeon_name: string;
  }[];
};

export type TheatreReportCrash = {
  total: number;
  paperwork_outstanding: number;
  by_ncepod: {
    category: TheatreNcepodCategory;
    label: string;
    cases: number;
    median_decision_to_incision_minutes: number | null;
  }[];
};

export type TheatreReportProcedureRow = {
  procedure: string;
  count: number;
  as_primary: number;
};

/** Setup copied from a surgeon preference card into a case. */
export type TheatrePreferenceSetup = {
  card_uuid?: string;
  title?: string;
  positioning?: string;
  skin_prep?: string;
  equipment?: string;
  instrument_trays?: string[];
  notes?: string;
};
