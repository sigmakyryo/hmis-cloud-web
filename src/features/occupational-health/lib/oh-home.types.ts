/** Shapes returned by `oh-home/{module}` on the OH service. */

export type OhHomeModuleSlug =
  | "clinic"
  | "immunizations"
  | "drug-alcohol"
  | "fitness"
  | "health-programs"
  | "exposure-management";

export type OhHomeClinic = {
  visits_by_day: Array<{ date: string; visits: number; cancelled: number }>;
  iod: {
    open: number;
    opened_30d: number;
    closed_30d: number;
    lost_days_open: number;
    recent: Array<{ uuid: string; severity: string; body_part: string; mechanism: string; onset_date: string | null; status: string }>;
  };
  certificates: { expiring_30d: number; expired_30d: number };
};

export type OhHomeImmunizations = {
  stock: {
    lots: number;
    expiring_60d: number;
    low_stock: number;
    quarantined: number;
    recalled: number;
    expiring: Array<{ uuid: string; vaccine: string; lot_number: string; expiry_date: string | null; quantity_on_hand: number }>;
  };
  doses_by_week: Array<{ week_start: string; doses: number }>;
  coverage_by_vaccine: Array<{ code: string; name: string; people: number; up_to_date: number; percent: number }>;
};

export type OhHomeDrugAlcohol = {
  month: { tests: number; verified: number; positive: number; refusals: number; cancelled: number; positivity_rate: number | null };
  by_reason: Array<{ reason: string; tests: number; positive: number }>;
  recent: Array<{
    uuid: string;
    customer_initials: string;
    employer_name: string;
    reason: string;
    status: string;
    final_result: string | null;
    created_at: string | null;
  }>;
};

export type OhHomeFitness = {
  expiring: { count: number; rows: Array<{ customer_uuid: string; worker_label: string; employer_name: string; earliest_expiry: string | null }> };
  by_employer: Array<{ employer: string; workers: number; fit: number; restricted: number; not_fit: number; unknown: number }>;
  training_expiring: { count: number; by_course: Array<{ course: string; count: number }> };
};

export type OhHomeHealthPrograms = {
  by_month: Array<{ month: string; total: number; hearing: number; lung: number; vision: number; ergonomics: number; fatigue: number }>;
  outcomes_12m: { fit: number; restricted: number; unfit: number; pending: number };
  referrals: {
    count_60d: number;
    rows: Array<{ uuid: string; customer_uuid: string; program: string; performed_at: string | null; outcome: string | null }>;
  };
};

export type OhHomeExposure = {
  recent_results: Array<{
    uuid: string;
    agent: string;
    group: string;
    sampled_at: string | null;
    evaluation: string | null;
    worst_ratio: number | null;
    below_lod: boolean;
    result_value: number | null;
    result_unit: string;
  }>;
  controls: { open: number; overdue: number; by_hierarchy: Array<{ hierarchy: string; open: number }> };
};

export type OhHomeSummaries = {
  clinic: OhHomeClinic;
  immunizations: OhHomeImmunizations;
  "drug-alcohol": OhHomeDrugAlcohol;
  fitness: OhHomeFitness;
  "health-programs": OhHomeHealthPrograms;
  "exposure-management": OhHomeExposure;
};
