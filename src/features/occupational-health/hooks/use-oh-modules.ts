"use client";

import { useMemo } from "react";

import { buildOhModules, type OhModule } from "@/features/occupational-health/lib/oh-modules";
import { useUser } from "@/providers/user-provider";

/** OH-family modules the signed-in user may open. */
export function useOhModules(): { modules: OhModule[]; isLoading: boolean } {
  const { userData, isLoading } = useUser();
  const groups = userData?.groups;
  const enabledModules = userData?.enabled_modules;
  const isAdmin = Boolean(userData?.is_admin);

  const modules = useMemo(
    () =>
      buildOhModules(groups ?? [], {
        isTenantAdmin: isAdmin,
        enabledModules: enabledModules ?? [],
      }),
    [enabledModules, groups, isAdmin],
  );

  return { modules, isLoading };
}
