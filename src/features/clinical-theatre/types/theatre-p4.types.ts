/** Pro P4: monitor devices, device vital review and the family status board. */

export type TheatreDeviceStatus = "online" | "stale" | "offline" | "never" | "revoked";

export type TheatreMonitorDevice = {
  uuid: string;
  name: string;
  notes: string;
  room_uuid: string | null;
  room_name: string;
  key_id: string;
  secret_hint: string;
  require_signature: boolean;
  status: TheatreDeviceStatus;
  last_seen_at: string | null;
  last_error: string;
  last_error_at: string | null;
  observations_received: number;
  rotated_at: string | null;
  revoked_at: string | null;
  created_at: string;
  /** Only present right after create / rotate. */
  secret?: string;
};

export type TheatreMonitorDevicePayload = {
  name?: string;
  room_uuid?: string;
  notes?: string;
  require_signature?: boolean;
};

export type TheatreCaseDeviceStatus = {
  uuid: string;
  name: string;
  status: TheatreDeviceStatus;
  last_seen_at: string | null;
  last_error: string;
};

export type TheatreCaseDevices = {
  room_name: string;
  server_time: string;
  devices: TheatreCaseDeviceStatus[];
};

export type TheatreVitalReviewPayload = {
  action: "validate" | "reject";
  vital_ids?: string[];
  scope?: "" | "pending_clean" | "pending_artefacts";
  note?: string;
};

export type TheatreFamilyStage =
  | "checked_in"
  | "pre_op"
  | "in_theatre"
  | "in_recovery"
  | "ready"
  | "returned_to_ward";

export type TheatreFamilyCodeMode = "initials_digits" | "tracking_code";

export type TheatrePublicFamilyEntry = {
  code: string;
  stage: TheatreFamilyStage;
  stage_label: string;
};

export type TheatrePublicFamilyBoard = {
  title: string;
  refresh_seconds: number;
  generated_at: string;
  entries: TheatrePublicFamilyEntry[];
};

export type TheatreStaffFamilyEntry = TheatrePublicFamilyEntry & {
  case_uuid: string;
  patient_name: string;
  patient_identifier: string;
  room_name: string;
  tracking_code: string;
  scheduled_start: string | null;
};

export type TheatreStaffFamilyBoard = {
  title: string;
  code_mode: TheatreFamilyCodeMode;
  refresh_seconds: number;
  entries: TheatreStaffFamilyEntry[];
};

export type TheatreFamilyCode = {
  tracking_code: string;
  display_code: string;
  code_mode: TheatreFamilyCodeMode;
  title: string;
};

export type TheatreFamilyBoardLink = {
  uuid: string;
  label: string;
  room_uuid: string | null;
  room_name: string;
  clinic_uuid: string | null;
  clinic_name: string;
  token_hint: string;
  last_used_at: string | null;
  rotated_at: string | null;
  revoked_at: string | null;
  created_at: string;
  /** Only present right after create / rotate. */
  token?: string;
};

export type TheatreFamilyBoardLinkPayload = {
  label: string;
  room_uuid?: string | null;
  clinic_uuid?: string | null;
};
