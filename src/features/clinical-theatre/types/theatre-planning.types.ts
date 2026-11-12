/** Pro P2: theatre timings, sessions, performance, waiting list and pre-op clinic. */

export type TheatreMilestone =
  | "in_suite"
  | "anaesthesia_start"
  | "anaesthesia_ready"
  | "knife_to_skin"
  | "closure"
  | "out_of_theatre"
  | "in_recovery";

export type TheatreTimingMilestone = {
  key: TheatreMilestone;
  label: string;
  sequence: number;
  value: string | null;
};

export type TheatreTimingInterval = {
  key: string;
  label: string;
  minutes: number | null;
};

export type TheatreTimingEvent = {
  milestone: TheatreMilestone;
  milestone_label: string;
  action: "captured" | "corrected" | "cleared";
  source: "manual" | "status";
  previous_value: string | null;
  new_value: string | null;
  reason: string;
  actor_name: string;
  created_at: string;
};

export type TheatreCaseTimings = {
  milestones: TheatreTimingMilestone[];
  next_milestone: TheatreMilestone | null;
  next_milestone_label: string;
  intervals: TheatreTimingInterval[];
  events?: TheatreTimingEvent[];
};

export type CaptureTheatreTimingPayload = {
  milestone: TheatreMilestone;
  at?: string | null;
  reason?: string;
  clear?: boolean;
};

export type TheatreSettings = {
  first_case_tolerance_minutes: number;
  turnover_gap_cap_minutes: number;
  clearance_validity_days: number;
  /** Every case needs a reconciled surgical count before WHO sign-out. */
  require_surgical_count?: boolean;
};

export type TheatreRoomRef = { uuid: string; name: string; code: string };

export type TheatreSessionTemplate = {
  uuid: string;
  room: TheatreRoomRef | null;
  weekday: number;
  weekday_label: string;
  start_time: string;
  end_time: string;
  surgeon: number | null;
  surgeon_name: string;
  specialty: string;
  label: string;
  valid_from: string | null;
  valid_until: string | null;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TheatreSessionTemplatePayload = {
  room: string;
  weekday: number;
  start_time: string;
  end_time: string;
  surgeon?: number | null;
  specialty?: string;
  label?: string;
  valid_from?: string | null;
  valid_until?: string | null;
  notes?: string;
};

export type TheatreSessionRecord = {
  uuid: string;
  room: TheatreRoomRef | null;
  template_uuid: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  surgeon: number | null;
  surgeon_name: string;
  specialty: string;
  label: string;
  status: "planned" | "cancelled";
  notes: string;
  is_active: boolean;
};

export type TheatreSessionPayload = {
  room?: string;
  template?: string | null;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  surgeon?: number | null;
  specialty?: string;
  label?: string;
  status?: "planned" | "cancelled";
  notes?: string;
};

export type TheatreSessionSlotCase = {
  uuid: string;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  procedure: string;
  patient_name: string;
};

export type TheatreSessionSlot = {
  key: string;
  source: "template" | "override" | "adhoc";
  session_uuid: string | null;
  template_uuid: string | null;
  room: TheatreRoomRef;
  date: string;
  start_time: string;
  end_time: string;
  start: string;
  end: string;
  status: "planned" | "cancelled";
  surgeon_id: number | null;
  surgeon_name: string;
  specialty: string;
  label: string;
  notes: string;
  minutes: number;
  booked_minutes: number;
  free_minutes: number;
  case_count: number;
  next_free_start: string | null;
  cases: TheatreSessionSlotCase[];
};

export type TheatreSessionWindow = {
  date_from: string;
  date_to: string;
  sessions: TheatreSessionSlot[];
};

export type TheatreSessionFilters = {
  date_from?: string;
  date_to?: string;
  room?: string;
  clinic?: string;
  include_cancelled?: boolean;
};

export type TheatrePerformanceSummary = {
  sessions: number;
  sessions_with_cases: number;
  session_minutes: number;
  used_minutes: number;
  utilisation_percent: number | null;
  cases_timed: number;
  in_room_minutes: number;
  first_case_on_time: number;
  first_case_on_time_rate_percent: number | null;
  late_starts: number;
  average_late_minutes: number | null;
  overruns: number;
  overrun_minutes: number;
  turnovers: number;
  average_turnover_minutes: number | null;
  median_turnover_minutes: number | null;
};

export type TheatrePerformanceSessionRow = {
  key: string;
  date: string;
  room_id: number;
  room_uuid: string;
  room_name: string;
  surgeon_id: number | null;
  surgeon_name: string;
  specialty: string;
  start_time: string;
  end_time: string;
  session_minutes: number;
  used_minutes: number;
  utilisation_percent: number | null;
  case_count: number;
  first_case_start: string | null;
  first_case_uuid: string | null;
  first_case_on_time: boolean | null;
  late_minutes: number;
  last_case_end: string | null;
  overrun_minutes: number;
};

export type TheatrePerformanceReport = {
  date_from: string;
  date_to: string;
  first_case_tolerance_minutes: number;
  turnover_gap_cap_minutes: number;
  totals: TheatrePerformanceSummary & {
    out_of_session_cases: number;
    out_of_session_minutes: number;
  };
  by_room: (TheatrePerformanceSummary & { room_id: number; room_name: string })[];
  by_surgeon: (TheatrePerformanceSummary & {
    surgeon_id: number | null;
    surgeon_name: string;
  })[];
  by_day: (TheatrePerformanceSummary & { date: string })[];
  late_starts: TheatrePerformanceSessionRow[];
  overruns: TheatrePerformanceSessionRow[];
  sessions: TheatrePerformanceSessionRow[];
  intervals: {
    key: string;
    label: string;
    cases: number;
    average_minutes: number | null;
    median_minutes: number | null;
  }[];
  out_of_session: { case_uuid: string; date: string; room_name: string; minutes: number }[];
};

export type TheatrePerformanceFilters = {
  date_from?: string;
  date_to?: string;
  clinic?: string;
  room?: string;
  surgeon?: string;
};

export type TheatreUrgencyCategory = {
  uuid: string;
  code: string;
  label: string;
  target_days: number;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export type TheatreUrgencyCategoryPayload = {
  code?: string;
  label?: string;
  target_days?: number;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
};

export type TheatreReadinessStatus =
  | "ready"
  | "not_assessed"
  | "in_progress"
  | "expired"
  | "unfit"
  | "deferred";

export type TheatreReadiness = {
  status: TheatreReadinessStatus;
  label: string;
  warning: string;
  assessment_uuid: string | null;
  clearance: TheatreClearance | "";
  valid_until: string | null;
  cleared_at: string | null;
  cleared_by_name: string;
};

export type TheatreWaitInfo = {
  days_waited: number;
  target_days: number;
  target_date: string;
  days_remaining: number;
  breached: boolean;
};

export type TheatrePatientRef = {
  uuid: string;
  name: string;
  identifier: string;
  gender: string;
  age: number | null;
};

export type TheatreCaseBrief = {
  uuid: string;
  status: string;
  status_label: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  visit_uuid: string | null;
  encounter_uuid: string | null;
  room_name: string;
};

export type TheatreWaitingListStatus = "waiting" | "scheduled" | "removed";

export type TheatreRemovalReason =
  | "operated"
  | "treated_elsewhere"
  | "no_longer_required"
  | "patient_declined"
  | "medically_unfit"
  | "unable_to_contact"
  | "deceased"
  | "duplicate"
  | "other";

export type TheatreWaitingListEvent = {
  action: string;
  action_label: string;
  note: string;
  case_uuid: string | null;
  actor_name: string;
  created_at: string;
};

export type TheatreWaitingListEntry = {
  uuid: string;
  status: TheatreWaitingListStatus;
  status_label: string;
  patient: TheatrePatientRef;
  clinic: { uuid: string; name: string };
  surgeon_id: number | null;
  surgeon_name: string;
  category: {
    uuid: string;
    code: string;
    label: string;
    target_days: number;
    sort_order: number;
  };
  added_on: string;
  clinical_priority_notes: string;
  notes: string;
  anticipated_duration_minutes: number | null;
  preferred_room: { uuid: string; name: string } | null;
  visit_uuid: string | null;
  stay_uuid: string | null;
  case: TheatreCaseBrief | null;
  scheduled_at: string | null;
  removed_at: string | null;
  removal_reason: TheatreRemovalReason | "";
  removal_reason_label: string;
  removal_note: string;
  removed_by_name: string;
  procedures: {
    uuid: string;
    product_uuid: string;
    name: string;
    code: string;
    laterality: string;
    notes: string;
  }[];
  wait: TheatreWaitInfo;
  readiness: TheatreReadiness;
  created_at: string;
  events?: TheatreWaitingListEvent[];
};

export type TheatreWaitingListSort = "priority" | "waited" | "added" | "target" | "patient";

export type TheatreWaitingListFilters = {
  status?: "active" | "all" | TheatreWaitingListStatus;
  category?: string;
  surgeon?: string;
  product?: string;
  clinic?: string;
  q?: string;
  breached?: boolean;
  readiness?: TheatreReadinessStatus | "";
  sort?: TheatreWaitingListSort;
};

export type TheatreWaitingListPayload = {
  customer?: string;
  clinic?: string;
  urgency_category?: string;
  surgeon?: number | null;
  added_on?: string;
  clinical_priority_notes?: string;
  notes?: string;
  anticipated_duration_minutes?: number | null;
  preferred_room?: string | null;
  visit?: string | null;
  stay?: string | null;
  procedures?: { product: string; laterality?: string; notes?: string }[];
  allow_duplicate?: boolean;
  change_reason?: string;
};

export type TheatreScheduleWarning = { code: "readiness" | "session"; message: string };

export type TheatreScheduleCheck = {
  readiness: TheatreReadiness;
  session_key: string | null;
  scheduled_end: string;
  warnings: TheatreScheduleWarning[];
};

export type TheatreSchedulePayload = {
  room: string;
  scheduled_start: string;
  scheduled_end?: string | null;
  lead_surgeon?: number | null;
  urgency?: "elective" | "urgent" | "emergency";
  notes?: string;
  acknowledge_readiness?: boolean;
  allow_outside_session?: boolean;
};

export type TheatreWaitingListReport = {
  date_from: string;
  date_to: string;
  totals: {
    active: number;
    waiting: number;
    scheduled: number;
    breached: number;
    breach_rate_percent: number | null;
    median_days_waited: number | null;
    added_in_period: number;
    removed_in_period: number;
    operated_in_period: number;
  };
  by_category: {
    category_uuid: string;
    code: string;
    label: string;
    target_days: number;
    waiting: number;
    scheduled: number;
    breached: number;
    breach_rate_percent: number | null;
    median_days_waited: number | null;
    average_days_waited: number | null;
    max_days_waited: number | null;
    operated: number;
    median_days_to_surgery: number | null;
  }[];
  removals: { reason: string; label: string; count: number }[];
  breaches: {
    entry_uuid: string;
    patient_name: string;
    category: string;
    days_waited: number;
    target_days: number;
    days_over: number;
    status: TheatreWaitingListStatus;
    procedures: string[];
  }[];
};

export type TheatreComorbidity =
  | "diabetes"
  | "hypertension"
  | "cardiac"
  | "respiratory"
  | "renal"
  | "liver"
  | "anaemia"
  | "anticoagulated"
  | "obesity"
  | "hiv"
  | "sickle_cell"
  | "pregnancy_possible"
  | "smoker";

export type TheatreOrderType = "laboratory" | "radiology" | "procedure";

export type TheatreProductBrief = {
  uuid: string;
  name: string;
  code: string;
  order_type: TheatreOrderType;
};

export type TheatrePreOpTestRule = {
  uuid: string;
  name: string;
  test_product: TheatreProductBrief | null;
  procedure_product: TheatreProductBrief | null;
  min_asa: string;
  min_age: number | null;
  max_age: number | null;
  sex: "" | "Male" | "Female";
  comorbidities: TheatreComorbidity[];
  validity_days: number;
  notes: string;
  is_active: boolean;
};

export type TheatrePreOpTestRulePayload = {
  name?: string;
  test_product?: string;
  procedure_product?: string | null;
  min_asa?: string;
  min_age?: number | null;
  max_age?: number | null;
  sex?: "" | "Male" | "Female";
  comorbidities?: TheatreComorbidity[];
  validity_days?: number;
  notes?: string;
  is_active?: boolean;
};

export type TheatreRequiredTestStatus = "required" | "ordered" | "resulted" | "waived";

export type TheatreRequiredTest = {
  uuid: string;
  product: TheatreProductBrief | null;
  reasons: string[];
  status: TheatreRequiredTestStatus;
  status_label: string;
  visit_order_uuid: string | null;
  order_status: string;
  result_status: string;
  ordered_by_name: string;
  ordered_at: string | null;
  waived_reason: string;
  result_summary: string;
};

export type TheatreClearance = "fit" | "unfit" | "deferred";

export type TheatrePreOpAssessment = {
  uuid: string;
  patient: TheatrePatientRef;
  clinic: { uuid: string; name: string };
  waiting_list_entry_uuid: string | null;
  category_code: string;
  case: TheatreCaseBrief | null;
  encounter: {
    uuid: string;
    visit_uuid: string;
    department_name: string;
    status: string;
  } | null;
  asa_grade: string;
  comorbidities: TheatreComorbidity[];
  weight_kg: string | null;
  height_cm: string | null;
  airway_notes: string;
  findings: string;
  plan: string;
  assessed_by_name: string;
  clearance: TheatreClearance | "";
  clearance_label: string;
  clearance_notes: string;
  cleared_by_name: string;
  cleared_at: string | null;
  valid_until: string | null;
  clearance_valid: boolean;
  required_tests: TheatreRequiredTest[];
  outstanding_tests: number;
  created_at: string;
  updated_at: string;
};

export type TheatrePreOpAssessmentPayload = {
  waiting_list_entry?: string | null;
  case?: string | null;
  encounter?: string | null;
  asa_grade?: string;
  comorbidities?: TheatreComorbidity[];
  weight_kg?: string | null;
  height_cm?: string | null;
  airway_notes?: string;
  findings?: string;
  plan?: string;
};

export type TheatrePreOpQueueRow = {
  kind: "waiting_list" | "case";
  entry_uuid: string | null;
  case: TheatreCaseBrief | null;
  patient: TheatrePatientRef;
  procedures: string[];
  category: { code: string; label: string } | null;
  wait: TheatreWaitInfo | null;
  readiness: TheatreReadiness;
  scheduled_start: string | null;
};

export type TheatreClearancePayload = {
  clearance: TheatreClearance;
  notes?: string;
  valid_until?: string | null;
  override_outstanding?: boolean;
};
