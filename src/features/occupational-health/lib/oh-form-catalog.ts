export const OH_FORM_FAMILIES = [
  { value: "occupational_health", label: "Occupational health" },
  { value: "custom", label: "Custom" },
] as const;

export const OH_PREDEFINED_FORM_TYPES = [
  { value: "employee_form", label: "Employee form" },
  { value: "examination", label: "Examination" },
  { value: "certificate", label: "Certificate of fitness" },
] as const;

export const OPD_FORM_STAGES = [
  { value: "registered", label: "Registered" },
  { value: "triaged", label: "Ready" },
  { value: "with_clinician", label: "With doctor" },
  { value: "completed", label: "Completed" },
] as const;

export type ClinicalFormRecord = {
  uuid: string;
  name: string;
  family: "occupational_health" | "custom";
  system_type: string | null;
  placement: {
    parent?: "opd" | "ipd" | "registration";
    trigger?: "stage" | "transition" | "onboarding";
    stage?: string | null;
    from?: string | null;
    to?: string | null;
    required?: boolean;
  } | null;
  group: { uuid: string; name: string } | null;
  template_kind: "employee" | "exam" | "certificate" | null;
  template_uuid: string | null;
  active?: boolean;
  published_version_number?: number | null;
  published_version_status?: string | null;
};

export type OhVisitTypeRecord = {
  uuid: string;
  code: string;
  name: string;
  description: string;
  is_default: boolean;
  forms: Array<{ uuid: string; name: string; system_type?: string | null }>;
};

export type FormGroupRecord = {
  uuid: string;
  name: string;
};
