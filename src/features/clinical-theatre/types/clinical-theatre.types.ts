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
  created_at: string;
  updated_at: string;
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
