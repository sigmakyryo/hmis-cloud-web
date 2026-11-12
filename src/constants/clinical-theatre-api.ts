const upstream = (path: string) => `/theatre/${path}`;
const bff = (path: string) => `/api/theatre/${path}`;

/** Django DRF v1 theatre endpoints (relative to HMIS_API_URL). */
export const CLINICAL_THEATRE_API_PATHS = {
  rooms: upstream("rooms/"),
  room: (uuid: string) => upstream(`rooms/${uuid}/`),
  cases: upstream("cases/"),
  case: (uuid: string) => upstream(`cases/${uuid}/`),
  transition: (uuid: string) => upstream(`cases/${uuid}/transition/`),
  reschedule: (uuid: string) => upstream(`cases/${uuid}/reschedule/`),
  assignRoom: (uuid: string) => upstream(`cases/${uuid}/assign-room/`),
} as const;

/** Browser-facing BFF theatre routes. */
export const BFF_CLINICAL_THEATRE_ROUTES = {
  rooms: bff("rooms"),
  room: (uuid: string) => bff(`rooms/${uuid}`),
  cases: bff("cases"),
  case: (uuid: string) => bff(`cases/${uuid}`),
  transition: (uuid: string) => bff(`cases/${uuid}/transition`),
  reschedule: (uuid: string) => bff(`cases/${uuid}/reschedule`),
  assignRoom: (uuid: string) => bff(`cases/${uuid}/assign-room`),
} as const;
