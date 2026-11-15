"use client";

import { useMemo } from "react";

import { useOhWorkspaceLayout } from "@/features/occupational-health/hooks/use-oh-workspace-layout";
import { buildOhModules, type OhModule } from "@/features/occupational-health/lib/oh-modules";
import { useUser } from "@/providers/user-provider";

/** OH-family modules the signed-in user may open. */
export function useOhModules(): { modules: OhModule[]; isLoading: boolean } {
  const { userData, isLoading } = useUser();
  const layout = useOhWorkspaceLayout();
  const groups = userData?.groups;
  const enabledModules = userData?.enabled_modules;
  const isAdmin = Boolean(userData?.is_admin);
  const included = layout.isReady ? layout.included : undefined;

  const modules = useMemo(
    () =>
      buildOhModules(
        groups ?? [],
        {
          isTenantAdmin: isAdmin,
          enabledModules: enabledModules ?? [],
        },
        included,
      ),
    [enabledModules, groups, included, isAdmin],
  );

  return { modules, isLoading };
}
