import {
  BFF_CLINICAL_THEATRE_ROUTES as ROUTES,
  BFF_PUBLIC_THEATRE_BOARD,
} from "@/constants/clinical-theatre-api";
import { planningQuery } from "@/features/clinical-theatre/services/theatre-planning.service";
import type {
  TheatreCaseDevices,
  TheatreFamilyBoardLink,
  TheatreFamilyBoardLinkPayload,
  TheatreFamilyCode,
  TheatreMonitorDevice,
  TheatreMonitorDevicePayload,
  TheatrePublicFamilyBoard,
  TheatreStaffFamilyBoard,
  TheatreVitalReviewPayload,
} from "@/features/clinical-theatre/types/theatre-p4.types";
import { bffRequest } from "@/lib/bff-client";

// --- monitor devices ---------------------------------------------------------

export function fetchTheatreMonitorDevices(includeRevoked = false) {
  return bffRequest<TheatreMonitorDevice[]>(
    `${ROUTES.monitorDevices}${planningQuery({ include_revoked: includeRevoked })}`,
  );
}

export function saveTheatreMonitorDevice(payload: TheatreMonitorDevicePayload, uuid?: string) {
  return bffRequest<TheatreMonitorDevice>(uuid ? ROUTES.monitorDevice(uuid) : ROUTES.monitorDevices, {
    method: uuid ? "PATCH" : "POST",
    body: payload,
  });
}

export function rotateTheatreMonitorDevice(uuid: string) {
  return bffRequest<TheatreMonitorDevice>(ROUTES.monitorDeviceRotate(uuid), { method: "POST" });
}

export function revokeTheatreMonitorDevice(uuid: string) {
  return bffRequest<TheatreMonitorDevice>(ROUTES.monitorDeviceRevoke(uuid), { method: "POST" });
}

export function fetchTheatreCaseDevices(caseUuid: string) {
  return bffRequest<TheatreCaseDevices>(ROUTES.anaesthesiaDevices(caseUuid));
}

export function reviewTheatreDeviceVitals(caseUuid: string, payload: TheatreVitalReviewPayload) {
  return bffRequest<{ changed: number }>(ROUTES.anaesthesiaVitalsReview(caseUuid), {
    method: "POST",
    body: payload,
  });
}

// --- family board ----------------------------------------------------------

export function fetchTheatreFamilyBoard(filters: { room?: string; clinic?: string } = {}) {
  return bffRequest<TheatreStaffFamilyBoard>(`${ROUTES.familyBoard}${planningQuery(filters)}`);
}

export function fetchTheatreFamilyCode(caseUuid: string, regenerate = false) {
  return bffRequest<TheatreFamilyCode>(ROUTES.familyCode(caseUuid), {
    method: "POST",
    body: { regenerate },
  });
}

export function fetchTheatreFamilyBoardLinks(includeRevoked = false) {
  return bffRequest<TheatreFamilyBoardLink[]>(
    `${ROUTES.familyBoardLinks}${planningQuery({ include_revoked: includeRevoked })}`,
  );
}

export function createTheatreFamilyBoardLink(payload: TheatreFamilyBoardLinkPayload) {
  return bffRequest<TheatreFamilyBoardLink>(ROUTES.familyBoardLinks, {
    method: "POST",
    body: payload,
  });
}

export function rotateTheatreFamilyBoardLink(uuid: string) {
  return bffRequest<TheatreFamilyBoardLink>(ROUTES.familyBoardLinkRotate(uuid), {
    method: "POST",
  });
}

export function revokeTheatreFamilyBoardLink(uuid: string) {
  return bffRequest<TheatreFamilyBoardLink>(ROUTES.familyBoardLinkRevoke(uuid), {
    method: "POST",
  });
}

/** Public kiosk feed; plain fetch so a 401 never triggers the login redirect. */
export async function fetchPublicTheatreBoard(token: string): Promise<TheatrePublicFamilyBoard> {
  const response = await fetch(BFF_PUBLIC_THEATRE_BOARD(token), {
    cache: "no-store",
    credentials: "omit",
  });
  if (!response.ok) {
    const error = new Error(response.status === 429 ? "rate_limited" : "not_found");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return (await response.json()) as TheatrePublicFamilyBoard;
}
