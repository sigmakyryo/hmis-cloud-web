import { BFF_CLINICAL_THEATRE_ROUTES as ROUTES } from "@/constants/clinical-theatre-api";
import type {
  CreateTheatreCasePayload,
  CreateTheatreRoomPayload,
  TheatreCase,
  TheatreCaseFilters,
  TheatreCaseStatus,
  TheatreRoom,
  TheatreRoomFilters,
  UpdateTheatreRoomPayload,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { bffRequest } from "@/lib/bff-client";

export function theatreQueryString(
  params: Record<string, string | boolean | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function fetchTheatreRooms(filters: TheatreRoomFilters = {}) {
  return bffRequest<TheatreRoom[]>(
    `${ROUTES.rooms}${theatreQueryString(filters)}`,
  );
}

export function createTheatreRoom(payload: CreateTheatreRoomPayload) {
  return bffRequest<TheatreRoom>(ROUTES.rooms, {
    method: "POST",
    body: payload,
  });
}

export function updateTheatreRoom(uuid: string, payload: UpdateTheatreRoomPayload) {
  return bffRequest<TheatreRoom>(ROUTES.room(uuid), {
    method: "PATCH",
    body: payload,
  });
}

export function fetchTheatreCases(filters: TheatreCaseFilters = {}) {
  return bffRequest<TheatreCase[]>(
    `${ROUTES.cases}${theatreQueryString(filters)}`,
  );
}

export function fetchTheatreCase(uuid: string) {
  return bffRequest<TheatreCase>(ROUTES.case(uuid));
}

export function createTheatreCase(payload: CreateTheatreCasePayload) {
  return bffRequest<TheatreCase>(ROUTES.cases, {
    method: "POST",
    body: payload,
  });
}

export function transitionTheatreCase(
  uuid: string,
  payload: { status: TheatreCaseStatus; reason?: string },
) {
  return bffRequest<TheatreCase>(ROUTES.transition(uuid), {
    method: "POST",
    body: payload,
  });
}

export function rescheduleTheatreCase(
  uuid: string,
  payload: { scheduled_start: string; scheduled_end?: string | null },
) {
  return bffRequest<TheatreCase>(ROUTES.reschedule(uuid), {
    method: "POST",
    body: payload,
  });
}

export function assignTheatreCaseRoom(uuid: string, room: string) {
  return bffRequest<TheatreCase>(ROUTES.assignRoom(uuid), {
    method: "POST",
    body: { room },
  });
}
