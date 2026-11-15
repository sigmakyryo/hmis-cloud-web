"use client";

import { useQuery } from "@tanstack/react-query";

import {
  OH_WORKSPACE_AREAS,
  type OhWorkspaceArea,
} from "@/features/occupational-health/lib/oh-workspace-layout";
import { fetchOhWorkspaceLayout } from "@/features/occupational-health/services/oh-workspace-layout.service";

export const OH_WORKSPACE_LAYOUT_QUERY_KEY = ["oh-workspace-layout"] as const;

/**
 * Clinic inclusion list. Until the request succeeds, callers keep every area
 * visible so a slow response does not flash an empty rail or header.
 */
export function useOhWorkspaceLayout(): {
  included: readonly OhWorkspaceArea[];
  isReady: boolean;
  isLoading: boolean;
  isError: boolean;
} {
  const query = useQuery({
    queryKey: OH_WORKSPACE_LAYOUT_QUERY_KEY,
    queryFn: fetchOhWorkspaceLayout,
    staleTime: 60_000,
  });

  return {
    included: query.data?.included ?? OH_WORKSPACE_AREAS,
    isReady: query.isSuccess,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
