"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { OhEmployeeFormsTab } from "@/features/occupational-health/components/OhEmployeeFormsTab";
import { OhWorkforceEmptyPage } from "@/features/occupational-health/pages/OhWorkforceEmptyPage";
import {
  DetailPageHeaderSection,
  DetailPageLayout,
  DetailPageTabNavItem,
  DetailPageTabsNavSection,
  DetailPageTabsSection,
} from "@/features/app-shell/components/page-layout";
import { useEmploymentEpisodes, useOhEmploymentLookups } from "@/features/occupational-health/hooks/use-occupational-health";
import { fetchCustomer } from "@/features/customers/services/customers.service";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { ROUTES } from "@/constants/routes";

const TABS = [
  { id: "employment", label: "Employment" },
  { id: "forms", label: "Forms" },
  { id: "immunizations", label: "Immunizations" },
  { id: "drug-alcohol", label: "Drug & alcohol" },
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
  const lookups = useOhEmploymentLookups(true);
  const active = (episodes.data ?? []).find((episode) => episode.is_active) ?? episodes.data?.[0];
  const name = customer.data ? formatCustomerName(customer.data) : "Employee";

  return (
    <DetailPageLayout data-testid="oh-employee-detail">
      <DetailPageHeaderSection>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">{name}</h1>
            <p className="text-[13px] text-dash-muted">Occupational record linked to the client.</p>
          </div>
          <Link className="text-[13px] font-medium text-brand-primary" href={ROUTES.customerDetail(customerUuid)}>
            Open client record
          </Link>
        </div>
      </DetailPageHeaderSection>
      <DetailPageTabsSection>
        <DetailPageTabsNavSection aria-label="Employee">
          {TABS.map((item) => (
            <DetailPageTabNavItem key={item.id} isActive={tab === item.id} onClick={() => setTab(item.id)}>
              {item.label}
            </DetailPageTabNavItem>
          ))}
        </DetailPageTabsNavSection>
        {tab === "employment" ? (
          <dl className="grid gap-3 p-5 text-[13px] sm:grid-cols-2" data-testid="oh-employee-employment-tab">
            <div><dt className="text-dash-muted">Employer</dt><dd className="text-brand-navy">{active ? lookups.employerNames.get(active.employer) ?? "—" : "—"}</dd></div>
            <div><dt className="text-dash-muted">Job</dt><dd className="text-brand-navy">{active ? lookups.jobTitleNames.get(active.job_title) ?? "—" : "—"}</dd></div>
            <div><dt className="text-dash-muted">Site</dt><dd className="text-brand-navy">{active?.site || "—"}</dd></div>
            <div><dt className="text-dash-muted">Risk profile</dt><dd className="text-brand-navy">{customer.data?.oh_hazard_profile_name || "—"}</dd></div>
          </dl>
        ) : null}
        {tab === "forms" ? <OhEmployeeFormsTab customerUuid={customerUuid} /> : null}
        {tab === "immunizations" ? <OhWorkforceEmptyPage title="Immunizations" testId="oh-employee-immunizations" /> : null}
        {tab === "drug-alcohol" ? <OhWorkforceEmptyPage title="Drug & alcohol" testId="oh-employee-drug-alcohol" /> : null}
      </DetailPageTabsSection>
    </DetailPageLayout>
  );
}
