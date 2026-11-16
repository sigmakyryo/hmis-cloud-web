"use client";

import { memo, useMemo, type ComponentProps } from "react";
import { usePathname } from "next/navigation";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { AppHeaderNotifications } from "@/features/app-shell/components/AppHeaderNotifications";
import { buildSidebarNavItems } from "@/features/app-shell/utils/build-sidebar-nav";
import { useOhWorkspaceLayout } from "@/features/occupational-health/hooks/use-oh-workspace-layout";
import { useUser } from "@/providers/user-provider";

const SidebarTeamSwitcher = memo(function SidebarTeamSwitcher() {
  return (
    <SidebarHeader className="gap-0 px-2 pb-1 pt-3">
      <TeamSwitcher />
    </SidebarHeader>
  );
});

const SidebarAccount = memo(function SidebarAccount() {
  return (
    <SidebarFooter className="gap-0.5 px-2 pb-2 pt-1">
      <SidebarMenu>
        <AppHeaderNotifications />
      </SidebarMenu>
      <NavUser />
    </SidebarFooter>
  );
});

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { userData } = useUser();
  const userGroups = useMemo(() => userData?.groups ?? [], [userData?.groups]);
  const isPlatformAdmin = Boolean(userData?.is_superuser && userData.tenant === null);

  const layout = useOhWorkspaceLayout();
  const navItems = buildSidebarNavItems(
    userGroups,
    pathname,
    Boolean(userData?.is_admin),
    isPlatformAdmin,
    userData?.enabled_modules ?? [],
    layout.isReady ? layout.included : undefined,
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-dash-border" {...props}>
      <SidebarTeamSwitcher />
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarAccount />
    </Sidebar>
  );
}
