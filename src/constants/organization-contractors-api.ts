/** Django DRF v1 organization-contractor endpoints (relative to HMIS_API_URL). */
export const ORGANIZATION_CONTRACTORS_API_PATHS = {
  list: "/organization-contractors/",
  detail: (uuid: string) => `/organization-contractors/${uuid}/`,
} as const;
