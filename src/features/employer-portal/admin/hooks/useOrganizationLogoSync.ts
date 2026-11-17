"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { fetchPortalBranding, syncOrganizationLogo } from "@/features/employer-portal/services/employer-portal.service";

/** Query key shared with the Branding tab. */
export const PORTAL_BRANDING_KEY = ["oh-portal-admin", "branding"] as const;

/** Copies the organization logo into the portal once, when an administrator opens Employers and the portal has no logo. */
export function useOrganizationLogoSync() {
  const client = useQueryClient();
  const branding = useQuery({ queryKey: PORTAL_BRANDING_KEY, queryFn: fetchPortalBranding, retry: false });
  const sync = useMutation({
    mutationFn: syncOrganizationLogo,
    onSuccess: () => client.invalidateQueries({ queryKey: PORTAL_BRANDING_KEY }),
  });
  const attempted = useRef(false);
  const missing = branding.isSuccess && !branding.data.logo_data_uri;
  const { mutate } = sync;

  useEffect(() => {
    if (!missing || attempted.current) {
      return;
    }
    attempted.current = true;
    mutate(undefined, {
      onError: (error) => console.warn("The organization logo was not copied to the company portal.", error),
    });
  }, [missing, mutate]);
}
