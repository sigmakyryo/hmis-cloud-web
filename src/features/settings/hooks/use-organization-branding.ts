import { useQuery } from "@tanstack/react-query";

import { fetchOrganizationBranding } from "@/features/settings/services/settings.service";

export const organizationBrandingQueryKey = [
  "settings",
  "organization-branding",
] as const;

export function useOrganizationBranding(enabled = true) {
  return useQuery({
    queryKey: organizationBrandingQueryKey,
    queryFn: fetchOrganizationBranding,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
