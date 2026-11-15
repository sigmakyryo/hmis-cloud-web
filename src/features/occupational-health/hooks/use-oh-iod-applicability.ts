"use client";

import { useQuery } from "@tanstack/react-query";

import {
  IOD_APPLICABILITY_NONE,
  type OhIodApplicability,
} from "@/features/occupational-health/lib/oh-iod-applicability";
import { fetchOhIodApplicability } from "@/features/occupational-health/services/oh-iod-applicability.service";

export const OH_IOD_APPLICABILITY_QUERY_KEY = ["oh-iod-applicability"] as const;

/**
 * Clinic rule for the fitness readiness row. Until the request succeeds the
 * row stays hidden, so a slow response does not show injury on duty where it
 * is not allowed.
 */
export function useOhIodApplicability(): {
  setting: OhIodApplicability;
  isReady: boolean;
} {
  const query = useQuery({
    queryKey: OH_IOD_APPLICABILITY_QUERY_KEY,
    queryFn: fetchOhIodApplicability,
    staleTime: 60_000,
  });

  return {
    setting: query.data ?? IOD_APPLICABILITY_NONE,
    isReady: query.isSuccess,
  };
}
