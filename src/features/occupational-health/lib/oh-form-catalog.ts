export const OH_VISIT_TYPES = [
  { value: "pre_employment", label: "Pre-employment", description: "Before the person starts work" },
  { value: "periodic", label: "Periodic", description: "Scheduled review during employment" },
  { value: "change_of_function", label: "Change of function", description: "When the job or exposures change" },
  { value: "return_to_work", label: "Return to work", description: "After absence or illness" },
  { value: "injury_on_duty", label: "Injury on duty", description: "After a workplace injury" },
  { value: "exit", label: "Exit", description: "When employment ends" },
] as const;

export const OH_FORM_SYSTEM_TYPES = [
  { value: "employee_form", label: "Employee form", description: "Filled on the employee record from the risk profile" },
  { value: "examination", label: "Examination", description: "Filled on the occupational health visit" },
  { value: "certificate", label: "Certificate of fitness", description: "Filled on the visit after the examination" },
  ...OH_VISIT_TYPES,
] as const;

export const OH_FORM_FAMILIES = [
  { value: "occupational_health", label: "Occupational health" },
  { value: "custom", label: "Custom" },
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
    parent?: "opd" | "ipd";
    trigger?: "stage" | "transition";
    stage?: string | null;
    from?: string | null;
    to?: string | null;
    required?: boolean;
  } | null;
  template_kind: "employee" | "exam" | "certificate" | null;
  template_uuid: string | null;
};
