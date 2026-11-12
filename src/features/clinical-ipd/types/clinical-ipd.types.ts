export type IpdWardClass = "general" | "icu" | "maternity" | "other";

export type IpdBedStatus =
  | "available"
  | "occupied"
  | "blocked"
  | "maintenance"
  | "reserved"
  | "cleaning";

export type IpdStayStatus =
  | "planned"
  | "admitted"
  | "transferred"
  | "discharged"
  | "cancelled";

export type IpdWard = {
  uuid: string;
  name: string;
  code: string;
  ward_class: IpdWardClass;
  description: string;
  is_active: boolean;
  clinic_uuid: string;
  department_uuid: string;
};

export type IpdBed = {
  uuid: string;
  code: string;
  label: string;
  bed_class: string;
  gender_restriction: string;
  status: IpdBedStatus;
  is_active: boolean;
  ward_uuid: string;
  ward_name: string;
};

export type IpdStay = {
  uuid: string;
  status: IpdStayStatus;
  admission_source: "direct" | "opd_transfer";
  admitted_at: string;
  discharged_at: string | null;
  presenting_complaint: string;
  discharge_summary: string;
  customer_uuid: string;
  customer_name: string;
  clinic_uuid: string;
  visit_uuid: string;
  encounter_uuid: string;
  current_ward_uuid: string | null;
  current_ward_name: string | null;
  current_bed_uuid: string | null;
  current_bed_code: string | null;
  admitting_clinician_name: string;
};

export type IpdCensusRow = {
  bed_uuid: string;
  bed_code: string;
  bed_label: string;
  bed_status: IpdBedStatus;
  bed_class: string;
  gender_restriction: string;
  ward_uuid: string;
  ward_name: string;
  ward_code: string;
  ward_class: IpdWardClass;
  clinic_uuid: string;
  stay: {
    uuid: string;
    status: IpdStayStatus;
    admission_source: string;
    admitted_at: string;
    visit_uuid: string | null;
    encounter_uuid: string | null;
    customer: {
      uuid: string;
      display_name: string;
      file_number: string;
    } | null;
    clinician_name: string;
  } | null;
};

export type IpdCensusStats = {
  beds_total: number;
  by_status: Partial<Record<IpdBedStatus, number>>;
  active_stays: number;
  admitted_today: number;
};

export type IpdWardPatient = {
  stay_uuid: string;
  status: IpdStayStatus;
  admitted_at: string;
  hours_since_admission: number;
  bed_uuid: string | null;
  bed_code: string | null;
  visit_uuid: string;
  encounter_uuid: string;
  customer: {
    uuid: string;
    display_name: string;
    file_number: string;
  };
  clinician_name: string;
};

export type IpdDischargeSummary = {
  uuid: string;
  stay_uuid: string;
  diagnosis_text: string;
  procedures: unknown;
  medications_text: string;
  follow_up: string;
  narrative: string;
  signed_at: string | null;
  signed_by_name: string;
  is_signed: boolean;
  created_at: string;
  updated_at: string;
};

export type IpdHandover = {
  uuid: string;
  ward_uuid: string;
  stay_uuid: string | null;
  shift: "morning" | "afternoon" | "night";
  handed_over_at: string;
  summary: string;
  outstanding_tasks: string;
  alerts: string;
  created_at: string;
};

export type IpdEmarRow = {
  uuid: string;
  stay_uuid: string;
  prescription_uuid: string;
  product_name: string;
  status: string;
  administered_at: string;
  dose_given: string;
  notes: string;
};

export type IpdWardRound = {
  uuid: string;
  stay_uuid: string;
  rounded_at: string;
  clinician_name: string;
  notes: string;
  plan: string;
  is_bed_day_charge: boolean;
};

export type IpdTheatreBooking = {
  uuid: string;
  stay_uuid: string;
  theatre_name: string;
  scheduled_start: string;
  scheduled_end: string | null;
  status: string;
  procedure_description: string;
  notes: string;
};
