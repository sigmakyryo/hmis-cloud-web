"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SettingsContentSkeleton } from "@/features/settings/components/SettingsContentSkeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SettingsNavigation } from "@/features/settings/components/SettingsNavigation";
import {
  buildSettingsNavigation,
  resolveSettingsBreadcrumbLabel,
} from "@/features/settings/constants/settings-navigation-config";
import { ROUTES } from "@/constants/routes";
import { fetchOhEmployer } from "@/features/occupational-health/services/oh.service";
import { occupationalHealthEmployerUuidFromPath } from "@/features/settings/components/modules/occupational-health/OhEmployerSettingsPage";
import { useUser } from "@/providers/user-provider";

type SettingsWorkspaceLayoutProps = {
  children: ReactNode;
};

export function SettingsWorkspaceLayout({ children }: SettingsWorkspaceLayoutProps) {
  const { userData, isLoading } = useUser();
  const isTenantAdmin = Boolean(userData?.is_admin);

  if (isLoading) {
    return (
      <div className="absolute inset-0 overflow-y-auto px-5 pt-8 md:px-10 lg:px-14">
        <SettingsContentSkeleton />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex w-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-brand-border px-5 py-4 md:px-8">
        <Suspense fallback={<SettingsBreadcrumbFallback isTenantAdmin={isTenantAdmin} />}>
          <SettingsBreadcrumb isTenantAdmin={isTenantAdmin} />
        </Suspense>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="shrink-0 px-5 pt-6 lg:px-8 lg:pt-8">
          <Suspense fallback={<div className="h-10 w-full lg:h-64 lg:w-56" />}>
            <SettingsNavigation isTenantAdmin={isTenantAdmin} />
          </Suspense>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 pb-12 pt-6 md:px-10 lg:px-14 lg:pt-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function SettingsBreadcrumbFallback({ isTenantAdmin }: { isTenantAdmin: boolean }) {
  const pathname = usePathname();
  return <SettingsBreadcrumbTrail currentPage={pageLabel(pathname, isTenantAdmin)} />;
}

function SettingsBreadcrumb({ isTenantAdmin }: { isTenantAdmin: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const employerUuid =
    occupationalHealthEmployerUuidFromPath(pathname) ??
    (pathname === ROUTES.settingsModuleOccupationalHealth
      ? searchParams.get("employer")
      : null);
  const employerQuery = useQuery({
    queryKey: ["oh-employers", "detail", employerUuid],
    queryFn: () => fetchOhEmployer(employerUuid ?? ""),
    enabled: Boolean(employerUuid),
  });

  if (!employerUuid) {
    return <SettingsBreadcrumbTrail currentPage={pageLabel(pathname, isTenantAdmin)} />;
  }

  return (
    <SettingsBreadcrumbTrail
      currentPage={employerQuery.data?.name ?? "Employer"}
      parent={{
        href: ROUTES.settingsModuleOccupationalHealth,
        label: "Occupational Health Services",
      }}
    />
  );
}

function pageLabel(pathname: string, isTenantAdmin: boolean) {
  return resolveSettingsBreadcrumbLabel(pathname, buildSettingsNavigation(isTenantAdmin));
}

function SettingsBreadcrumbTrail({
  currentPage,
  parent,
}: {
  currentPage: string;
  parent?: { href: string; label: string };
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList className="text-[13px] text-slate-400 sm:gap-1.5">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              href={ROUTES.settings}
              className="font-semibold text-brand-navy hover:text-brand-navy"
            >
              Settings
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="text-slate-300 [&>svg]:hidden">
          <span aria-hidden="true">&gt;</span>
        </BreadcrumbSeparator>
        {parent ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={parent.href} className="font-normal text-slate-400 hover:text-brand-navy">
                  {parent.label}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-slate-300 [&>svg]:hidden">
              <span aria-hidden="true">&gt;</span>
            </BreadcrumbSeparator>
          </>
        ) : null}
        <BreadcrumbItem>
          <BreadcrumbPage className="font-normal text-slate-400">
            {currentPage}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
