"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchVisitBrief } from "@/features/occupational-health/services/visit-copilot.service";

export function visitBriefQueryKey(visitUuid: string) {
  return ["oh-visit-brief", visitUuid] as const;
}

/** One check per visit. Panel changes reuse this result. */
export function useVisitBrief(visitUuid: string | undefined) {
  return useQuery({
    queryKey: visitBriefQueryKey(visitUuid ?? ""),
    queryFn: () => fetchVisitBrief(visitUuid ?? ""),
    enabled: Boolean(visitUuid),
    staleTime: Infinity,
    retry: false,
  });
}
