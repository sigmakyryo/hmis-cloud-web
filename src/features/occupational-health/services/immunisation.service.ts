import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

export type OhVaccine = {
  uuid: string;
  code: string;
  name: string;
  cvx_code: string;
  atc_code: string;
  brand: string;
  manufacturer: string;
  route: string;
  site: string;
  dose_volume_ml: number | null;
  contraindications: string[];
  billing_product_uuid: string | null;
  active: boolean;
};

export type OhVaccineLot = {
  uuid: string;
  vaccine_uuid: string | null;
  vaccine_code: string | null;
  lot_number: string;
  expiry_date: string | null;
  quantity_on_hand: number;
  recalled: boolean;
  recall_reason: string;
  expired: boolean;
  warning: "recalled" | "expired" | "low_stock" | null;
};

export type OhImmSchedule = {
  uuid: string;
  code: string;
  name: string;
  category: string;
  description: string;
  is_example: boolean;
  published_version: {
    uuid: string;
    number: number;
    status: string;
    snapshot: {
      disclaimer?: string;
      series?: Array<Record<string, unknown>>;
      assignment?: Record<string, unknown>;
    };
    published_at: string | null;
  } | null;
};

export type OhImmStatus = {
  uuid: string;
  customer_uuid: string;
  vaccine_uuid: string | null;
  vaccine_code: string;
  vaccine_name: string | null;
  status: string;
  doses_received: number;
  doses_required: number | null;
  next_due_date: string | null;
  last_dose_date: string | null;
};

export type OhImmDose = {
  uuid: string;
  customer_uuid: string;
  vaccine_uuid: string | null;
  vaccine_code: string;
  vaccine_name: string | null;
  lot_number: string | null;
  dose_number: number | null;
  route: string;
  site: string;
  source: string;
  given_by_name: string;
  administered_at: string | null;
  billing_key: string | null;
  status: string;
  notes: string;
};

export type OhImmPatientRecord = {
  customer_uuid: string;
  statuses: OhImmStatus[];
  doses: OhImmDose[];
  exemptions: Array<Record<string, unknown>>;
  aefi: Array<Record<string, unknown>>;
};

type ListEnvelope<T> = { results: T[]; pagination: unknown };

async function list<T>(path: string): Promise<T[]> {
  const response = await bffRequest<ListEnvelope<T> | T[]>(path);
  if (Array.isArray(response)) return response;
  return response.results ?? [];
}

export function fetchOhImmVaccines() {
  return list<OhVaccine>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmVaccines);
}

export function createOhImmVaccine(payload: Record<string, unknown>) {
  return bffRequest<OhVaccine>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmVaccines, {
    method: "POST",
    body: payload,
  });
}

export function fetchOhImmLots(vaccineUuid?: string) {
  const query = vaccineUuid
    ? `?vaccine_uuid=${encodeURIComponent(vaccineUuid)}`
    : "";
  return list<OhVaccineLot>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmLots}${query}`);
}

export function createOhImmLot(payload: Record<string, unknown>) {
  return bffRequest<OhVaccineLot>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmLots, {
    method: "POST",
    body: payload,
  });
}

export function fetchOhImmSchedules() {
  return list<OhImmSchedule>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmSchedules);
}

export function seedOhImmExamples() {
  return bffRequest<{ seeded: unknown[] }>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmSeedExamples,
    { method: "POST", body: {} },
  );
}

export function publishOhImmSchedule(
  uuid: string,
  snapshot?: Record<string, unknown>,
) {
  return bffRequest(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPublishSchedule(uuid),
    { method: "POST", body: snapshot ? { snapshot } : {} },
  );
}

export function createOhImmSchedule(payload: Record<string, unknown>) {
  return bffRequest<OhImmSchedule>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmSchedules,
    { method: "POST", body: payload },
  );
}

export function fetchOhImmPatient(customerUuid: string) {
  return bffRequest<OhImmPatientRecord>(
    BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmPatient(customerUuid),
  );
}

export function administerOhImmDose(payload: Record<string, unknown>) {
  return bffRequest<{
    dose: OhImmDose;
    status: OhImmStatus;
    warnings: string[];
  }>(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmAdminister, {
    method: "POST",
    body: payload,
  });
}

export function createOhImmExemption(payload: Record<string, unknown>) {
  return bffRequest(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmExemptions, {
    method: "POST",
    body: payload,
  });
}

export function createOhImmAefi(payload: Record<string, unknown>) {
  return bffRequest(BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmAefi, {
    method: "POST",
    body: payload,
  });
}

export function fetchOhImmDue(withinDays = 7) {
  return list<OhImmStatus>(
    `${BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmDue}?within_days=${withinDays}`,
  );
}
