"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { fetchOverviewHome } from "@/features/overview/services/overview-home.service";
import { useUser } from "@/providers/user-provider";

const OVERVIEW_HOME_STALE_MS = 3 * 60 * 1000;

/** Warms the overview-home cache as soon as the session user is known. */
export function OverviewHomePrefetch() {
  const { userData } = useUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userData) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: ["overview-home"],
      queryFn: fetchOverviewHome,
      staleTime: OVERVIEW_HOME_STALE_MS,
    });
  }, [queryClient, userData]);

  return null;
}
