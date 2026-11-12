/** Pro P3: CSSD trays and sterilisation, surgical counts, implant recall. */

export type TheatreSterilisationMethod =
  | "steam"
  | "eto"
  | "plasma"
  | "dry_heat"
  | "low_temp_steam"
  | "other";

export type TheatreSteriliser = {
  uuid: string;
  name: string;
  code: string;
  method: TheatreSterilisationMethod;
  method_label: string;
  location: string;
  notes: string;
  is_active: boolean;
};

export type TheatreSteriliserPayload = Partial<
  Pick<TheatreSteriliser, "name" | "code" | "method" | "location" | "notes" | "is_active">
>;

export type TheatreTraySetItem = {
  uuid: string;
  name: string;
  quantity: number;
  notes: string;
  product_uuid: string | null;
  product_name: string;
};

export type TheatreTraySet = {
  uuid: string;
  name: string;
  code: string;
  specialty: string;
  method: TheatreSterilisationMethod;
  method_label: string;
  shelf_life_days: number;
  notes: string;
  is_active: boolean;
  tray_count: number | null;
  items: TheatreTraySetItem[];
};

export type TheatreTraySetItemPayload = {
  product_uuid?: string | null;
  name?: string;
  quantity: number;
  notes?: string;
};

export type TheatreTraySetPayload = {
  name?: string;
  code?: string;
  specialty?: string;
  method?: TheatreSterilisationMethod;
  shelf_life_days?: number;
  notes?: string;
  items?: TheatreTraySetItemPayload[];
};

export type TheatreTrayStatus =
  | "available"
  | "in_use"
  | "awaiting_reprocessing"
  | "in_sterilisation"
  | "quarantined";

export type TheatreIndicatorResult = "pending" | "pass" | "fail" | "not_used";
export type TheatreCycleStatus = "running" | "released" | "failed" | "recalled";

export type TheatreCycleBrief = {
  uuid: string;
  cycle_number: string;
  load_number: string;
  steriliser_name: string;
  method: TheatreSterilisationMethod;
  method_label: string;
  status: TheatreCycleStatus;
  status_label: string;
  sterilised_at: string | null;
  expires_on: string | null;
  chemical_indicator: TheatreIndicatorResult;
  biological_indicator: TheatreIndicatorResult;
  failed: boolean;
};

export type TheatreTray = {
  uuid: string;
  barcode: string;
  label: string;
  status: TheatreTrayStatus;
  status_label: string;
  tray_set_uuid: string;
  tray_set_name: string;
  tray_set_code: string;
  method: TheatreSterilisationMethod;
  sterile_until: string | null;
  quarantine_reason: string;
  notes: string;
  is_active: boolean;
  last_cycle: TheatreCycleBrief | null;
  open_issue_count: number;
  /** Why the tray cannot go to a patient now ("" when it can). */
  problem: string;
};

export type TheatreTrayEvent = {
  uuid: string;
  action: string;
  from_status: string;
  to_status: string;
  note: string;
  case_uuid: string | null;
  cycle_number: string;
  actor_name: string;
  created_at: string;
};

export type TheatreTrayIssueKind = "missing" | "damaged";

export type TheatreTrayIssue = {
  uuid: string;
  name: string;
  kind: TheatreTrayIssueKind;
  kind_label: string;
  quantity: number;
  notes: string;
  set_item_uuid: string | null;
  case_uuid?: string;
  returned_at?: string | null;
};

export type TheatreTrayDetail = TheatreTray & {
  events: TheatreTrayEvent[];
  issues: TheatreTrayIssue[];
};

export type TheatreTrayFilters = {
  status?: TheatreTrayStatus | "";
  tray_set?: string;
  q?: string;
  include_retired?: boolean;
};

export type TheatreAffectedCase = {
  case_uuid: string;
  case_status: string;
  case_status_label: string;
  scheduled_start: string | null;
  patient_name: string;
  patient_identifier: string;
  surgeon_name: string;
  room_name: string;
  tray_barcode: string;
  assigned_at: string;
};

export type TheatreCycle = TheatreCycleBrief & {
  steriliser_uuid: string;
  started_at: string;
  biological_result_at: string | null;
  operator_name: string;
  released_by_name: string;
  recalled_at: string | null;
  recall_reason: string;
  notes: string;
  case_count: number | null;
  trays: {
    uuid: string;
    barcode: string;
    tray_set_name: string;
    status: TheatreTrayStatus;
    status_label: string;
    expires_on: string | null;
  }[];
  affected_cases?: TheatreAffectedCase[] | null;
};

export type TheatreCycleFilters = {
  status?: TheatreCycleStatus | "";
  steriliser?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
};

export type TheatreCycleCreatePayload = {
  steriliser_uuid: string;
  cycle_number: string;
  load_number?: string;
  method?: TheatreSterilisationMethod | "";
  started_at?: string | null;
  tray_uuids: string[];
  notes?: string;
};

export type TheatreCycleResultPayload = {
  chemical_indicator?: TheatreIndicatorResult | "";
  biological_indicator?: TheatreIndicatorResult | "";
  sterilised_at?: string | null;
  notes?: string;
};

export type TheatreCaseTrayStatus = "assigned" | "returned" | "released";

export type TheatreCaseTray = {
  uuid: string;
  status: TheatreCaseTrayStatus;
  status_label: string;
  tray: TheatreTray;
  cycle: TheatreCycleBrief | null;
  assigned_at: string;
  assigned_by_name: string;
  returned_at: string | null;
  returned_by_name: string;
  return_notes: string;
  issues: TheatreTrayIssue[];
  set_items: { uuid: string; name: string; quantity: number }[];
};

export type TheatreTrayIssuePayload = {
  set_item_uuid?: string | null;
  name?: string;
  kind: TheatreTrayIssueKind;
  quantity: number;
  notes?: string;
};

export type TheatreCountPhase = "initial" | "first" | "closing" | "final";
export type TheatreCountCategory = "swab" | "sharp" | "instrument" | "other";
export type TheatreCountSheetStatus = "open" | "reconciled" | "discrepancy" | "resolved";
export type TheatreCountXRay = "not_done" | "negative" | "positive" | "not_indicated";

export type TheatreCountItem = {
  uuid: string;
  category: TheatreCountCategory;
  category_label: string;
  name: string;
  product_uuid: string | null;
  tray_barcode: string;
  initial: number;
  added: number;
  expected: number;
  first_count: number | null;
  closing_count: number | null;
  final_count: number | null;
};

export type TheatreCountConfirmation = {
  uuid: string;
  phase: TheatreCountPhase;
  phase_label: string;
  counted_by_name: string;
  witnessed_by_name: string;
  confirmed_at: string;
  is_correct: boolean;
  discrepancies: { item: string; name: string; expected: number; counted: number }[];
  notes: string;
};

export type TheatreCountSheet = {
  uuid: string;
  status: TheatreCountSheetStatus;
  status_label: string;
  search_performed: boolean;
  search_notes: string;
  xray: TheatreCountXRay | "";
  xray_label: string;
  outcome: string;
  resolution_signed_by_name: string;
  resolution_signed_at: string | null;
  items: TheatreCountItem[];
  confirmations: TheatreCountConfirmation[];
};

export type TheatreCountState = {
  sheet: TheatreCountSheet | null;
  /** Why the count blocks WHO sign-out now ("" when it does not). */
  blocker: string;
};

export type TheatreCountWitness = { id: number; name: string; role: string };

export type TheatreCountResolvePayload = {
  search_performed: boolean;
  search_notes?: string;
  xray: TheatreCountXRay;
  outcome: string;
};

export type TheatreImplantRecallFilters = {
  lot?: string;
  serial?: string;
  product?: string;
  manufacturer?: string;
  q?: string;
  date_from?: string;
  date_to?: string;
  clinic?: string;
};

export type TheatreImplantRecallRow = {
  uuid: string;
  case_uuid: string;
  case_status: string;
  implanted_on: string;
  patient_uuid: string;
  patient_name: string;
  patient_identifier: string;
  patient_phone: string;
  product_uuid: string;
  product_name: string;
  product_code: string;
  manufacturer: string;
  lot_number: string;
  serial_number: string;
  expiry_date: string;
  implant_site: string;
  implant_laterality: string;
  inventory_batch_number: string;
  quantity: string;
  status: string;
  status_label: string;
  surgeon_name: string;
  room_name: string;
  clinic_name: string;
};

export type TheatreImplantRecallResult = {
  count: number;
  truncated: boolean;
  patients: number;
  results: TheatreImplantRecallRow[];
};

export type TheatreImplantBatch = {
  id: number;
  batch_number: string;
  expiry_date: string | null;
  supplier: string;
  is_expired: boolean;
};
