"use client";

import { useQuery } from "@tanstack/react-query";
import { FileWarning } from "lucide-react";
import { useState } from "react";

import {
  PAGE_CONTENT_LOADER_BELOW_PAGE_CHROME_CLASS,
  PageLoader,
} from "@/components/page-loader";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DetailPageLayout,
  DetailPageMainAsideGrid,
  DetailPageMainSection,
  DetailPageNotFound,
  DetailPageTabNavItem,
  DetailPageTabsNavSection,
  DetailPageTabsSection,
} from "@/features/app-shell/components/page-layout";
import { useAppBreadcrumb } from "@/features/app-shell/hooks/use-app-breadcrumb";
import { fetchCustomer } from "@/features/customers/services/customers.service";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { OhEmployeeFormsTab } from "@/features/occupational-health/components/OhEmployeeFormsTab";
import {
  OhEmployeeDetailHeader,
  OhEmployeeEmploymentPanel,
  OhEmployeeSummaryAside,
  OhEmployeeTabLabel,
} from "@/features/occupational-health/components/OhEmployeeDetailSections";
import { useEmploymentEpisodes } from "@/features/occupational-health/hooks/use-occupational-health";
import {
  fetchOhEmployers,
  fetchOhHazardProfiles,
  fetchOhJobTitles,
} from "@/features/occupational-health/services/oh.service";

const TABS = [
  { id: "employment", label: "Employment", icon: "building" },
  { id: "forms", label: "Forms", icon: "file" },
  { id: "immunizations", label: "Immunizations", icon: "shield" },
  { id: "drug-alcohol", label: "Drug & alcohol", icon: "flask" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type OhEmployeeDetailPageProps = {
  customerUuid: string;
};

export function OhEmployeeDetailPage({ customerUuid }: OhEmployeeDetailPageProps) {
  const [tab, setTab] = useState<TabId>("employment");
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
    <DetailPageLayout data-testid="oh-employee-detail">
      <OhEmployeeDetailHeader customer={customer.data} />
      <DetailPageTabsSection>
        <DetailPageTabsNavSection aria-label="Employee">
          {TABS.map((item) => (
            <DetailPageTabNavItem
              key={item.id}
              isActive={tab === item.id}
              onClick={() => setTab(item.id)}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-[13px]"
            >
              <OhEmployeeTabLabel icon={item.icon} label={item.label} />
            </DetailPageTabNavItem>
          ))}
        </DetailPageTabsNavSection>
        <DetailPageMainAsideGrid>
          <DetailPageMainSection>
            {tab === "employment" ? (
              <OhEmployeeEmploymentPanel episodes={episodes.data ?? []} names={names} />
            ) : null}
            {tab === "forms" ? (
              <OhEmployeeFormsTab
                customerUuid={customerUuid}
                employerId={active?.employer ?? null}
                employerUuid={employer?.uuid ?? profile?.employer_uuid ?? null}
                employerName={employer?.name ?? null}
                hazardProfileId={active?.hazard_profile ?? null}
              />
            ) : null}
            {tab === "immunizations" ? (
              <EmptyState
                icon={FileWarning}
                title="Immunizations are not recorded here yet"
                description="Infectious-disease records for this employee will appear in this tab."
                data-testid="oh-employee-immunizations"
              />
            ) : null}
            {tab === "drug-alcohol" ? (
              <EmptyState
                icon={FileWarning}
                title="Drug and alcohol testing is not recorded here yet"
                description="Test results for this employee will appear in this tab."
                data-testid="oh-employee-drug-alcohol"
              />
            ) : null}
          </DetailPageMainSection>
          <OhEmployeeSummaryAside
            customer={customer.data}
            episode={active}
            profile={profile}
            names={names}
          />
        </DetailPageMainAsideGrid>
      </DetailPageTabsSection>
    </DetailPageLayout>
  );
}
