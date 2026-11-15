export type OutsideHospital = {
  uuid: string;
  name: string;
  town: string;
  phone: string;
};

export type ExternalReferenceKind = {
  uuid: string;
  label: string;
  scope: "visit" | "encounter";
};

export type ExternalCareDocument = {
  uuid: string;
  file_name: string;
  file_mime_type: string;
  file_size: number;
};

export type ExternalHospitalTransfer = {
  uuid: string;
  direction: "inbound" | "outbound";
  hospital: OutsideHospital;
  their_reference: string;
  reason: string;
  contact: string;
  occurred_at: string;
  notes: string;
  encounter_uuid: string;
  documents: ExternalCareDocument[];
};

export type ExternalReference = {
  uuid: string;
  kind: ExternalReferenceKind;
  value: string;
  hospital: OutsideHospital | null;
  documents: ExternalCareDocument[];
};

export type HospitalChoiceInput = {
  hospital_uuid?: string | null;
  hospital_name?: string;
  town?: string;
  phone?: string;
};

export type CreateTransferInput = HospitalChoiceInput & {
  direction: "inbound" | "outbound";
  their_reference?: string;
  reason: string;
  contact?: string;
  occurred_at?: string | null;
  notes?: string;
};

export type CreateReferenceInput = HospitalChoiceInput & {
  kind_uuid: string;
  value: string;
};
