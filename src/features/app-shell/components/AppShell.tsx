"use client";

import { Suspense, useEffect } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/features/app-shell/components/AppHeader";
import { WorkspaceSetupBanner } from "@/features/app-shell/components/WorkspaceSetupBanner";
import { ModuleAccessGate } from "@/features/app-shell/components/ModuleAccessGate";
import { PageActivityBar } from "@/features/app-shell/components/PageActivityBar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import { AppBreadcrumbProvider } from "@/features/app-shell/providers/app-breadcrumb-provider";
import { OverviewHomePrefetch } from "@/features/overview/components/OverviewHomePrefetch";
import { WorkspaceUsageRecorder } from "@/features/overview/components/WorkspaceUsageRecorder";

const AUTHENTICATED_SHELL_CLASS = "app-authenticated-shell";

/**
 * Authenticated app shell. White sidebar and header, flush page body.
 * Record wells inside a page use the gray canvas; the shell itself stays flat.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(AUTHENTICATED_SHELL_CLASS);
    return () => {
      root.classList.remove(AUTHENTICATED_SHELL_CLASS);
    };
  }, []);

  return (
    <div className={`${AUTHENTICATED_SHELL_CLASS} flex h-full min-h-0 w-full flex-col overflow-hidden bg-white`}>
      <WorkspaceSetupBanner />
      <SidebarProvider className="min-h-0 w-full flex-1 overflow-hidden bg-white">
        <Suspense fallback={null}>
          <PageActivityBar />
        </Suspense>
        <WorkspaceUsageRecorder />
        <OverviewHomePrefetch />
        <AppSidebar />
        <SidebarInset className="min-h-0 overflow-hidden bg-white">
          <AppBreadcrumbProvider>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <AppHeader />
              <div className="relative flex min-h-0 flex-1 flex-col overflow-auto bg-white">
                <ModuleAccessGate>{children}</ModuleAccessGate>
              </div>
            </div>
          </AppBreadcrumbProvider>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
