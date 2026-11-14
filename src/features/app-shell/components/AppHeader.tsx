"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppCommandMenu } from "@/features/app-shell/components/AppCommandMenu";
import { AppHeaderNotifications } from "@/features/app-shell/components/AppHeaderNotifications";
import { MemberVisitAutomationStatus } from "@/features/customers/components/MemberVisitAutomationStatus";

export function AppHeader() {
  return (
    <header
      data-testid="app-header"
      className="flex h-12 shrink-0 items-center gap-3 border-b border-dash-border bg-white px-3"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <AppCommandMenu />
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1">
        <MemberVisitAutomationStatus />
        <AppHeaderNotifications />
      </div>
    </header>
  );
}
