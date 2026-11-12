const upstream = (path: string) => `/ipd/${path}`;
const bff = (path: string) => `/api/ipd/${path}`;

/** Django DRF v1 IPD endpoints (relative to HMIS_API_URL). */
export const CLINICAL_IPD_API_PATHS = {
  wards: upstream("wards/"),
  ward: (uuid: string) => upstream(`wards/${uuid}/`),
  wardPatients: (uuid: string) => upstream(`wards/${uuid}/patients/`),
  beds: upstream("beds/"),
  bed: (uuid: string) => upstream(`beds/${uuid}/`),
  census: upstream("census/"),
  censusStats: upstream("census/stats/"),
  stays: upstream("stays/"),
  stay: (uuid: string) => upstream(`stays/${uuid}/`),
  admit: upstream("stays/admit/"),
  transfer: (uuid: string) => upstream(`stays/${uuid}/transfer/`),
  discharge: (uuid: string) => upstream(`stays/${uuid}/discharge/`),
  cancel: (uuid: string) => upstream(`stays/${uuid}/cancel/`),
  dischargeSummary: (uuid: string) =>
    upstream(`stays/${uuid}/discharge-summary/`),
  handovers: upstream("handovers/"),
  emar: upstream("emar/"),
  rounds: upstream("rounds/"),
  theatre: upstream("theatre/"),
  theatreStatus: (uuid: string) => upstream(`theatre/${uuid}/status/`),
} as const;

/** Browser-facing BFF IPD routes. */
export const BFF_CLINICAL_IPD_ROUTES = {
  wards: bff("wards"),
  ward: (uuid: string) => bff(`wards/${uuid}`),
  wardPatients: (uuid: string) => bff(`wards/${uuid}/patients`),
  beds: bff("beds"),
  bed: (uuid: string) => bff(`beds/${uuid}`),
  census: bff("census"),
  censusStats: bff("census/stats"),
  stays: bff("stays"),
  stay: (uuid: string) => bff(`stays/${uuid}`),
  admit: bff("stays/admit"),
  transfer: (uuid: string) => bff(`stays/${uuid}/transfer`),
  discharge: (uuid: string) => bff(`stays/${uuid}/discharge`),
  cancel: (uuid: string) => bff(`stays/${uuid}/cancel`),
  dischargeSummary: (uuid: string) => bff(`stays/${uuid}/discharge-summary`),
  handovers: bff("handovers"),
  emar: bff("emar"),
  rounds: bff("rounds"),
  theatre: bff("theatre"),
  theatreStatus: (uuid: string) => bff(`theatre/${uuid}/status`),
} as const;
