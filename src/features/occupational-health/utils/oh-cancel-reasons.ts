/** Structured reasons for a cancelled or did-not-attend OH visit (mirrors OhVisit::CANCEL_REASON_CODES in OHS). */
export const OH_CANCEL_REASON_CODES = [
  { code: "worker_request", label: "Worker asked to cancel" },
  { code: "employer_request", label: "Employer asked to cancel" },
  { code: "clinic_reschedule", label: "Clinic rescheduled" },
  { code: "worker_unwell", label: "Worker unwell / unable to attend" },
  { code: "duplicate", label: "Duplicate or opened in error" },
  { code: "wrong_worker", label: "Opened for the wrong worker" },
  { code: "did_not_attend", label: "Did not attend (no-show)" },
  { code: "other", label: "Other" },
] as const;

export type OhCancelReasonCode = (typeof OH_CANCEL_REASON_CODES)[number]["code"];
