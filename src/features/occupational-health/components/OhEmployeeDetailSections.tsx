"use client";

import Link from "next/link";

import { AppIcon, type AppIconName } from "@/components/icons/app-icon";
import { ClientProfileAvatar } from "@/components/client-profile-avatar";
import { SecondaryButton } from "@/components/ui/app-buttons";
import {
  ListPageDataTable,
  ListPageDataTableBody,
  ListPageDataTableCell,
  ListPageDataTableHeader,
  ListPageDataTableHeaderCell,
  ListPageDataTableHeaderRow,
  ListPageDataTableRow,
  DetailPageHeaderSection,
  DetailPageTitle,
} from "@/features/app-shell/components/page-layout";
import type { Customer } from "@/features/customers/types/customer.types";
import {
  formatAdaptiveAge,
  formatCustomerName,
  formatDisplayDate,
} from "@/features/customers/utils/format-customer";
import type { EmploymentEpisode, OhHazardProfile } from "@/features/occupational-health/types";
import { ROUTES } from "@/constants/routes";

type NameMaps = {
  employers: Map<number, string>;
  jobs: Map<number, string>;
  profiles: Map<number, string>;
};

export function OhEmployeeDetailHeader({
  customer,
  episode,
  profile,
  names,
}: {
  customer: Customer;
  episode: EmploymentEpisode | null;
  profile: OhHazardProfile | null;
  names: NameMaps;
}) {
  const name = formatCustomerName(customer);
  const facts = [
    ["Client ID", customer.customer_identifier || "—"],
    ["Gender", customer.gender || "—"],
    ["Age", formatAdaptiveAge(customer.dob) || "—"],
    ["Date of birth", formatRecordDate(customer.dob)],
    ["Phone", customer.phone_number || "—"],
    ["Email", customer.email || "—"],
    ["Employer", episode ? names.employers.get(episode.employer) ?? "—" : "—"],
    ["Job", episode ? names.jobs.get(episode.job_title) ?? "—" : "—"],
    ["Employee number", episode?.employee_number || "—"],
    ["Department", episode?.department_name || "—"],
    ["Site", episode?.site || "—"],
    ["Risk profile", profile?.name || customer.oh_hazard_profile_name || "—"],
    ["Employment", episode?.is_active ? "Active" : episode ? "Ended" : "Not recorded"],
    ["Fitness required", episode ? (episode.requires_fitness ? "Yes" : "No") : "—"],
  ];

  return (
    <DetailPageHeaderSection className="bg-white px-4 py-3 sm:py-3 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ClientProfileAvatar
            seed={customer.uuid || customer.customer_identifier || name}
            name={name}
            photoUrl={customer.photo_url}
            className="size-10 rounded-lg"
            fallbackClassName="text-sm font-semibold"
          />
          <div className="min-w-0">
            <DetailPageTitle className="text-xl">{name}</DetailPageTitle>
            <p className="mt-0.5 text-[12px] text-dash-muted">Occupational health employee</p>
          </div>
        </div>
        <SecondaryButton asChild className="shrink-0">
          <Link href={ROUTES.customerDetail(customer.uuid)}>Open client record</Link>
        </SecondaryButton>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] text-dash-muted">{label}</dt>
            <dd className="truncate text-[13px] font-medium text-brand-navy">{value}</dd>
          </div>
        ))}
      </dl>
    </DetailPageHeaderSection>
  );
}

const EMPLOYMENT_COLUMNS = [
  "Job",
  "Employer",
  "Employee number",
  "Department",
  "Site",
  "Type",
  "Started",
  "Ended",
  "Risk profile",
  "Fitness",
  "Status",
] as const;

export function OhEmployeeEmploymentPanel({
  episodes,
  names,
}: {
  episodes: EmploymentEpisode[];
  names: NameMaps;
}) {
  if (episodes.length === 0) {
    return (
      <p className="text-sm text-dash-muted" data-testid="oh-employee-employment-tab">
        No employment has been recorded for this client.
      </p>
    );
  }

  return (
    <div data-testid="oh-employee-employment-tab">
      <ListPageDataTable>
        <ListPageDataTableHeader>
          <ListPageDataTableHeaderRow>
            {EMPLOYMENT_COLUMNS.map((column) => (
              <ListPageDataTableHeaderCell key={column}>{column}</ListPageDataTableHeaderCell>
            ))}
          </ListPageDataTableHeaderRow>
        </ListPageDataTableHeader>
        <ListPageDataTableBody>
          {episodes.map((episode) => (
            <ListPageDataTableRow key={episode.uuid}>
              <ListPageDataTableCell>
                <p className="font-medium text-brand-navy">{names.jobs.get(episode.job_title) ?? "Employment"}</p>
              </ListPageDataTableCell>
              <ListPageDataTableCell>{names.employers.get(episode.employer) ?? "—"}</ListPageDataTableCell>
              <ListPageDataTableCell className="font-mono">{episode.employee_number || "—"}</ListPageDataTableCell>
              <ListPageDataTableCell>{episode.department_name || "—"}</ListPageDataTableCell>
              <ListPageDataTableCell>{episode.site || "—"}</ListPageDataTableCell>
              <ListPageDataTableCell>{employmentTypeLabel(episode.employment_type)}</ListPageDataTableCell>
              <ListPageDataTableCell>{formatRecordDate(episode.start_date)}</ListPageDataTableCell>
              <ListPageDataTableCell>{formatRecordDate(episode.end_date)}</ListPageDataTableCell>
              <ListPageDataTableCell>{names.profiles.get(episode.hazard_profile ?? -1) ?? "—"}</ListPageDataTableCell>
              <ListPageDataTableCell>{episode.requires_fitness ? "Required" : "Not required"}</ListPageDataTableCell>
              <ListPageDataTableCell>{episode.is_active ? "Active" : "Ended"}</ListPageDataTableCell>
            </ListPageDataTableRow>
          ))}
        </ListPageDataTableBody>
      </ListPageDataTable>
    </div>
  );
}

export function OhEmployeeTabLabel({ icon, label }: { icon: AppIconName; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <AppIcon name={icon} size={14} className="size-3.5" />
      {label}
    </span>
  );
}

function employmentTypeLabel(value: string) {
  if (value === "contractor") return "Contractor";
  if (value === "employee") return "Employee";
  return value || "—";
}

function formatRecordDate(value: string | null | undefined) {
  if (!value) return "—";
  return formatDisplayDate(`${value.slice(0, 10)}T12:00:00`);
}
