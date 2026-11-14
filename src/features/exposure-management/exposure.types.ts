export type ExposureCategory = "chemical" | "dust" | "noise" | "vibration" | "heat" | "radiation" | "biological";
export type LimitBasis = "twa" | "stel" | "ceiling" | "action_level" | "dose";
export type Severity = "action_level" | "exceeds_limit" | "critical";
export type EventStatus = "open" | "investigating" | "controls_pending" | "closed";
export type Evaluation = "ok" | "action_level" | "exceeds_limit" | "critical" | "unknown" | "";
export type SampleType = "personal" | "area" | "biological";
export type ControlHierarchy = "elimination" | "substitution" | "engineering" | "administrative" | "ppe";
export type ControlStatus = "planned" | "in_progress" | "done" | "verified";
export type AiStatus = "" | "waiting" | "drafted" | "rejected" | "failed";
export type ConfidenceLevel = "none" | "low" | "medium" | "high";

export type ExposureMeta = {
  categories: ExposureCategory[];
  bases: LimitBasis[];
  units: Array<{ value: string; label: string }>;
  sample_types: SampleType[];
  severities: Severity[];
  event_statuses: EventStatus[];
  hierarchy: ControlHierarchy[];
  control_statuses: ControlStatus[];
  bands: Array<{ band: number; label: string; rule: string }>;
  disclaimer: string;
};

export type ExposureLimit = {
  uuid: string;
  basis: LimitBasis;
  value: number;
  unit: string;
  averaging_minutes: number;
  standard_name: string;
  citation: string;
  jurisdiction: string;
  notes: string;
  valid_from: string | null;
  superseded_at: string | null;
  is_current: boolean;
};

export type ExposureAgent = {
  uuid: string;
  code: string;
  name: string;
  category: ExposureCategory;
  cas_number: string;
  molecular_weight: number | null;
  default_unit: string;
  source_key: string;
  is_example: boolean;
  description: string;
  is_active: boolean;
  hazard_id: number | null;
  limits?: ExposureLimit[];
  components?: string[];
};

export type ReferencePack = {
  key: string;
  code: string;
  name: string;
  category: ExposureCategory;
  default_unit: string;
  limits: Array<{ basis: LimitBasis; value: number; unit: string; standard_name: string; citation: string; jurisdiction: string }>;
};

export type ExposureAssessment = {
  uuid: string;
  version: number;
  status: "draft" | "approved";
  sample_count: number;
  gm: number | null;
  gsd: number | null;
  p95: number | null;
  ucl95: number | null;
  exceedance_fraction: number | null;
  oel_value: number | null;
  oel_unit: string;
  band: number | null;
  confidence: ConfidenceLevel;
  controls_adequate: boolean | null;
  narrative: string;
  ai_draft: string | null;
  ai_status: AiStatus;
  approved_by: string;
  approved_at: string | null;
  next_review_on: string | null;
  period_from: string | null;
  period_to: string | null;
  flags: string[];
  basis: LimitBasis | null;
  citation: string | null;
  group_uuid?: string;
  group_name?: string;
  agent_uuid?: string;
  agent_code?: string;
  agent_name?: string;
};

export type GroupAgentLink = {
  agent_uuid: string | null;
  agent_code: string | null;
  agent_name: string | null;
  category: ExposureCategory | null;
  expected_level: "low" | "medium" | "high" | "unknown";
  controls_summary: string;
  restrict_on_exceed: boolean;
  notify_email: string;
  assessment: ExposureAssessment | null;
};

export type ExposureGroup = {
  uuid: string;
  code: string;
  name: string;
  employer_uuid: string | null;
  site: string;
  department: string;
  job_title: string;
  hazard_profile_id: number | null;
  hazard_profile_name: string | null;
  owner_name: string;
  description: string;
  is_active: boolean;
  member_count: number;
  has_rules: boolean;
  agents?: GroupAgentLink[];
};

export type GroupMember = {
  customer_uuid: string;
  worker_label: string;
  employer: string | null;
  job_title: string | null;
  site: string | null;
  department: string | null;
  employee_number: string | null;
};

export type MeasurementComparison = { basis: LimitBasis; limit: number; unit: string; value: number; ratio: number };

export type ExposureMeasurement = {
  uuid: string;
  group_uuid: string | null;
  group_name: string | null;
  agent_uuid: string | null;
  agent_code: string | null;
  agent_name: string | null;
  customer_uuid: string | null;
  worker_label: string;
  sample_type: SampleType;
  location: string;
  sampled_at: string | null;
  duration_minutes: number;
  result_value: number;
  result_unit: string;
  below_lod: boolean;
  lod_value: number | null;
  uncertainty_pct: number | null;
  method: string;
  lab_name: string;
  lab_ref: string;
  sampler: string;
  status: "valid" | "pending_lab" | "void";
  normalised_value: number | null;
  normalised_unit: string;
  worst_ratio: number | null;
  evaluation: Evaluation;
  flags: string[];
  comparisons: MeasurementComparison[];
  instrument_uuid: string | null;
  instrument_name: string | null;
  notes: string;
  void_reason: string;
};

export type ExposureControl = {
  uuid: string;
  hierarchy: ControlHierarchy;
  description: string;
  owner_name: string;
  due_on: string | null;
  completed_on: string | null;
  effectiveness_check_on: string | null;
  status: ControlStatus;
  overdue: boolean;
};

export type ExposureEvent = {
  uuid: string;
  group_uuid: string | null;
  group_name: string | null;
  agent_uuid: string | null;
  agent_code: string | null;
  agent_name: string | null;
  measurement_uuid: string | null;
  customer_uuid: string | null;
  worker_label: string;
  kind: string;
  severity: Severity;
  status: EventStatus;
  detected_at: string | null;
  due_on: string | null;
  overdue: boolean;
  summary: string;
  investigation: string;
  removal_from_exposure: boolean;
  iod_case_uuid: string | null;
  ai_draft: string | null;
  ai_status: AiStatus;
  closed_at: string | null;
  closed_by: string;
  controls?: ExposureControl[];
};

export type ExposurePlan = {
  uuid: string;
  group_uuid: string | null;
  group_name: string | null;
  agent_uuid: string | null;
  agent_code: string | null;
  agent_name: string | null;
  frequency_months: number;
  method: string;
  min_samples: number;
  next_due_on: string | null;
  last_sampled_on: string | null;
  status: "active" | "paused";
  notes: string;
  due_state: "not_scheduled" | "overdue" | "due_soon" | "ok";
};

export type ExposureInstrument = {
  uuid: string;
  name: string;
  serial: string;
  type: string;
  manufacturer: string;
  last_calibrated_on: string | null;
  calibration_due_on: string | null;
  status: "active" | "retired" | "out_of_calibration";
  certificate_ref: string;
  calibration_state: "retired" | "unknown" | "overdue" | "due_soon" | "ok";
};

export type WorkerDose = {
  agent_uuid: string | null;
  agent_code: string | null;
  agent_name: string | null;
  period_start: string;
  period_end: string;
  exposure_value: number | null;
  unit: string;
  dose_percent: number;
  cumulative_percent: number;
  basis: string;
};

export type BiologicalIncidentSummary = { open_incidents: number; urgent: number; last_90_days: number; followups_due: number };

export type DashboardCell = {
  agent_id: number;
  band: number | null;
  confidence: ConfidenceLevel;
  sample_count: number;
  p95: number | null;
  oel_value: number | null;
  oel_unit: string;
  status: string;
  open_events: number;
} | null;

export type ExposureDashboard = {
  generated_at: string;
  kpis: {
    groups: number;
    agents: number;
    measurements_30d: number;
    open_events: number;
    open_critical: number;
    open_exceeds: number;
    open_action: number;
    overdue_events: number;
    plans_overdue: number;
    plans_due_soon: number;
    calibrations_overdue: number;
    calibrations_due_soon: number;
    reviews_due: number;
    controls_overdue: number;
  };
  bands: Record<string, number>;
  agents: Array<{ uuid: string; code: string; name: string; category: ExposureCategory }>;
  groups: Array<{ uuid: string; code: string; name: string; members: number; cells: DashboardCell[] }>;
  events: ExposureEvent[];
  biological: BiologicalIncidentSummary;
};

export type WorkerProfile = {
  customer_uuid: string;
  groups: ExposureGroup[];
  events: ExposureEvent[];
  doses: WorkerDose[];
  measurements: ExposureMeasurement[];
  incidents: Array<{ uuid: string; type: string; exposed_at: string | null; status: string; triage_band: string }>;
};

export type ExposureReport = {
  from: string;
  to: string;
  measurements: { total: number; over_limit: number; by_agent: Array<{ agent: string; n: number; over_limit: number; max_ratio: number | null }> };
  events: { total: number; by_severity: Record<string, number>; by_status: Record<string, number>; closed: number; mean_days_to_close: number | null };
  controls: { total: number; done: number; verified: number; by_hierarchy: Record<string, number> };
  sampling: { plans: number; overdue: number; up_to_date: number };
  assessments: Record<string, number>;
  biological: BiologicalIncidentSummary & { by_type: Record<string, number> };
};

export type SeriesResponse = {
  group: { uuid: string; name: string };
  agent: ExposureAgent;
  measurements: ExposureMeasurement[];
  assessments: ExposureAssessment[];
};

export type ImportRow = { row: number; ok: boolean; errors: string[]; group: string; agent: string; evaluation: Evaluation | null };
export type ImportResult = { valid: boolean; imported: number; rows: ImportRow[] };
export type SeedResult = { created: number; skipped: number; limits: number; hazards: number };

export type MeasurementInput = {
  group_uuid: string;
  agent_uuid: string;
  instrument_uuid?: string | null;
  customer_uuid?: string | null;
  sample_type: SampleType;
  location?: string;
  sampled_at: string;
  duration_minutes: number;
  result_value: number;
  result_unit: string;
  below_lod?: boolean;
  lod_value?: number | null;
  method?: string;
  lab_name?: string;
  lab_ref?: string;
  sampler?: string;
  status?: "valid" | "pending_lab";
  notes?: string;
};

export type GroupInput = {
  code?: string;
  name?: string;
  employer_uuid?: string | null;
  site?: string;
  department?: string;
  job_title?: string;
  hazard_profile_id?: number | null;
  owner_name?: string;
  description?: string;
  is_active?: boolean;
};
