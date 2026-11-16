"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchWorkspace } from "@/features/employer-portal/services/employer-portal-public.service";

/** The clinic behind a portal address: name and organisation logo. Missing or failing lookups just return nothing. */
export function usePortalWorkspace(key?: string) {
  return useQuery({
    queryKey: ["employer-portal", "workspace", key],
    queryFn: () => fetchWorkspace(key ?? ""),
    enabled: Boolean(key),
    retry: false,
    staleTime: 5 * 60_000,
  });
}
