import { BFF_CLINICAL_IPD_ROUTES as ROUTES } from "@/constants/clinical-ipd-api";
import type {
  IpdBed,
  IpdCensusRow,
  IpdCensusStats,
  IpdDischargeSummary,
  IpdEmarRow,
  IpdHandover,
  IpdStay,
  IpdTheatreBooking,
  IpdWard,
  IpdWardPatient,
  IpdWardRound,
} from "@/features/clinical-ipd/types/clinical-ipd.types";
import { BffError, bffRequest } from "@/lib/bff-client";

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function fetchIpdWards(filters: { clinic?: string; ward_class?: string } = {}) {
  return bffRequest<IpdWard[]>(`${ROUTES.wards}${qs(filters)}`);
}

export function createIpdWard(payload: Record<string, unknown>) {
  return bffRequest<IpdWard>(ROUTES.wards, { method: "POST", body: payload });
}

export function fetchIpdBeds(filters: { ward?: string; status?: string } = {}) {
  return bffRequest<IpdBed[]>(`${ROUTES.beds}${qs(filters)}`);
}

export function createIpdBed(payload: Record<string, unknown>) {
  return bffRequest<IpdBed>(ROUTES.beds, { method: "POST", body: payload });
}

export function updateIpdBed(
  uuid: string,
  payload: Record<string, unknown>,
) {
  return bffRequest<IpdBed>(ROUTES.bed(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function fetchIpdCensus(
  filters: {
    clinic?: string;
    ward?: string;
    ward_class?: string;
    status?: string;
  } = {},
) {
  return bffRequest<IpdCensusRow[]>(`${ROUTES.census}${qs(filters)}`);
}

export function fetchIpdCensusStats(
  filters: { clinic?: string; ward?: string } = {},
) {
  return bffRequest<IpdCensusStats>(`${ROUTES.censusStats}${qs(filters)}`);
}

export function fetchIpdWardPatients(wardUuid: string) {
  return bffRequest<IpdWardPatient[]>(ROUTES.wardPatients(wardUuid));
}

export function fetchIpdStays(
  filters: {
    status?: string;
    ward?: string;
    visit?: string;
    clinic?: string;
    clinician?: string;
    q?: string;
  } = {},
) {
  return bffRequest<IpdStay[]>(`${ROUTES.stays}${qs(filters)}`);
}

export function fetchIpdStay(uuid: string) {
  return bffRequest<IpdStay>(ROUTES.stay(uuid));
}

export function admitIpdStay(payload: Record<string, unknown>) {
  return bffRequest<IpdStay>(ROUTES.admit, { method: "POST", body: payload });
}

export function transferIpdStay(
  uuid: string,
  payload: { bed: string; reason?: string },
) {
  return bffRequest<IpdStay>(ROUTES.transfer(uuid), {
    method: "POST",
    body: payload,
  });
}

export function dischargeIpdStay(
  uuid: string,
  payload: { summary?: string; close_visit?: boolean },
) {
  return bffRequest<IpdStay>(ROUTES.discharge(uuid), {
    method: "POST",
    body: payload,
  });
}

export function fetchIpdDischargeSummary(stayUuid: string) {
  return bffRequest<IpdDischargeSummary>(
    ROUTES.dischargeSummary(stayUuid),
  ).catch((error: unknown) => {
    if (error instanceof BffError && error.status === 404) {
      return null;
    }
    throw error;
  });
}

export function upsertIpdDischargeSummary(
  stayUuid: string,
  payload: Record<string, unknown>,
) {
  return bffRequest<IpdDischargeSummary>(ROUTES.dischargeSummary(stayUuid), {
    method: "POST",
    body: payload,
  });
}

export function fetchIpdHandovers(filters: { ward?: string; stay?: string } = {}) {
  return bffRequest<IpdHandover[]>(`${ROUTES.handovers}${qs(filters)}`);
}

export function createIpdHandover(payload: Record<string, unknown>) {
  return bffRequest<IpdHandover>(ROUTES.handovers, {
    method: "POST",
    body: payload,
  });
}

export function fetchIpdEmar(stayUuid: string) {
  return bffRequest<IpdEmarRow[]>(`${ROUTES.emar}${qs({ stay: stayUuid })}`);
}

export function recordIpdEmar(payload: Record<string, unknown>) {
  return bffRequest<IpdEmarRow>(ROUTES.emar, { method: "POST", body: payload });
}

export function fetchIpdRounds(stayUuid: string) {
  return bffRequest<IpdWardRound[]>(`${ROUTES.rounds}${qs({ stay: stayUuid })}`);
}

export function createIpdRound(payload: Record<string, unknown>) {
  return bffRequest<IpdWardRound>(ROUTES.rounds, {
    method: "POST",
    body: payload,
  });
}

export function fetchIpdTheatre(stayUuid: string) {
  return bffRequest<IpdTheatreBooking[]>(
    `${ROUTES.theatre}${qs({ stay: stayUuid })}`,
  );
}

export function createIpdTheatre(payload: Record<string, unknown>) {
  return bffRequest<IpdTheatreBooking>(ROUTES.theatre, {
    method: "POST",
    body: payload,
  });
}
