import { BFF_CLINICAL_IPD_ROUTES as ROUTES } from "@/constants/clinical-ipd-api";
import type {
  IpdBed,
  IpdCensusRow,
  IpdEmarRow,
  IpdStay,
  IpdTheatreBooking,
  IpdWard,
  IpdWardRound,
} from "@/features/clinical-ipd/types/clinical-ipd.types";
import { bffRequest } from "@/lib/bff-client";

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

export function fetchIpdStays(filters: { status?: string; ward?: string } = {}) {
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
