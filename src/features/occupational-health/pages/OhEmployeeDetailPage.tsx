"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  PAGE_CONTENT_LOADER_BELOW_PAGE_CHROME_CLASS,
  PageLoader,
} from "@/components/page-loader";
import {
  DetailPageLayout,
  DetailPageNotFound,
  DetailPageTabNavItem,
  DetailPageTabsNavSection,
  DetailPageTabsSection,
} from "@/features/app-shell/components/page-layout";
import { useAppBreadcrumb } from "@/features/app-shell/hooks/use-app-breadcrumb";
import { fetchCustomer } from "@/features/customers/services/customers.service";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { OhEmployeeDetailProvider } from "@/features/occupational-health/components/oh-employee-detail-context";
import {
  OhEmployeeDetailHeader,
  OhEmployeeTabLabel,
} from "@/features/occupational-health/components/OhEmployeeDetailSections";
import { useEmploymentEpisodes } from "@/features/occupational-health/hooks/use-occupational-health";
import {
  OH_EMPLOYEE_DETAIL_TABS,
  ohEmployeeDetailHref,
  ohEmployeeDetailTabFromPathname,
} from "@/features/occupational-health/lib/oh-employee-detail-tabs";
import {
  fetchOhEmployers,
  fetchOhHazardProfiles,
  fetchOhJobTitles,
} from "@/features/occupational-health/services/oh.service";

type OhEmployeeDetailPageProps = {
  customerUuid: string;
  children: ReactNode;
};

export function OhEmployeeDetailPage({ customerUuid, children }: OhEmployeeDetailPageProps) {
  const pathname = usePathname();
  const customer = useQuery({
    queryKey: ["customer", customerUuid],
    queryFn: () => fetchCustomer(customerUuid),
  });
  const episodes = useEmploymentEpisodes(customerUuid);
  const employers = useQuery({ queryKey: ["oh-employers"], queryFn: fetchOhEmployers, staleTime: 5 * 60_000 });
  const jobs = useQuery({ queryKey: ["oh-job-titles"], queryFn: () => fetchOhJobTitles(), staleTime: 5 * 60_000 });
  const active = (episodes.data ?? []).find((episode) => episode.is_active) ?? episodes.data?.[0] ?? null;
  const profiles = useQuery({
    queryKey: ["oh-hazard-profiles", active?.employer ?? "none"],
    queryFn: () => fetchOhHazardProfiles(active?.employer),
    enabled: Boolean(active?.employer),
  });
  const profile = profiles.data?.find((item) => item.id === active?.hazard_profile) ?? null;
  const employer = employers.data?.find((item) => item.id === active?.employer) ?? null;
  const names = {
    employers: new Map((employers.data ?? []).map((item) => [item.id, item.name])),
    jobs: new Map((jobs.data ?? []).map((item) => [item.id, item.title])),
    profiles: new Map((profiles.data ?? []).map((item) => [item.id, item.name])),
  };
  const name = customer.data ? formatCustomerName(customer.data) : null;
  const activeTab = ohEmployeeDetailTabFromPathname(pathname, customerUuid);
  useAppBreadcrumb(name);

  if (customer.isLoading || episodes.isLoading) {
    return <PageLoader message="Loading employee..." className={PAGE_CONTENT_LOADER_BELOW_PAGE_CHROME_CLASS} />;
  }

  if (customer.isError || !customer.data) {
    return (
      <DetailPageNotFound
        title="Employee not found"
        message="This occupational record could not be loaded."
      />
    );
  }

  return (
    <OhEmployeeDetailProvider
      value={{
        customer: customer.data,
        episodes: episodes.data ?? [],
        names,
        activeEpisode: active,
        employer,
        profile,
      }}
    >
      <DetailPageLayout data-testid="oh-employee-detail">
        <OhEmployeeDetailHeader
          customer={customer.data}
          episode={active}
          profile={profile}
          names={names}
        />
        <DetailPageTabsSection>
          <DetailPageTabsNavSection aria-label="Employee">
            {OH_EMPLOYEE_DETAIL_TABS.map((item) => (
              <DetailPageTabNavItem
                key={item.id}
                href={ohEmployeeDetailHref(customerUuid, item.id)}
                isActive={activeTab === item.id}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-[13px]"
              >
                <OhEmployeeTabLabel icon={item.icon} label={item.label} />
              </DetailPageTabNavItem>
            ))}
          </DetailPageTabsNavSection>
          <div className="min-w-0 flex-1 px-4 py-4 md:px-6">{children}</div>
        </DetailPageTabsSection>
      </DetailPageLayout>
    </OhEmployeeDetailProvider>
  );
}
