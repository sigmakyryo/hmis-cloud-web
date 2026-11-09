"use client";

import Link from "next/link";

import { AppIcon, type AppIconName } from "@/components/icons/app-icon";
import { ClientProfileAvatar } from "@/components/client-profile-avatar";
import { SecondaryButton } from "@/components/ui/app-buttons";
import {
  DetailPageAsidePanelSection,
  DetailPageAsideSummaryField,
  DetailPageAsideSummarySection,
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

export function OhEmployeeDetailHeader({ customer }: { customer: Customer }) {
  const name = formatCustomerName(customer);
  const meta = [customer.customer_identifier, customer.gender, formatAdaptiveAge(customer.dob)]
    .filter(Boolean)
    .join(" · ");

  return (
    <DetailPageHeaderSection className="bg-white px-4 py-3 sm:py-3 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            <p className="mt-0.5 text-[12px] text-dash-muted">{meta}</p>
          </div>
        </div>
        <SecondaryButton asChild className="shrink-0">
          <Link href={ROUTES.customerDetail(customer.uuid)}>Open client record</Link>
        </SecondaryButton>
      </div>
    </DetailPageHeaderSection>
  );
}

export function OhEmployeeSummaryAside({
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
  return (
    <DetailPageAsidePanelSection data-testid="oh-employee-summary">
      <DetailPageAsideSummarySection title="Employment" className="border-t-0 pt-0">
        <Fact label="Status" value={episode?.is_active ? "Active" : episode ? "Ended" : "Not recorded"} />
        <Fact label="Employer" value={episode ? names.employers.get(episode.employer) ?? "—" : "—"} />
        <Fact label="Job" value={episode ? names.jobs.get(episode.job_title) ?? "—" : "—"} />
        <Fact label="Department" value={episode?.department_name || "—"} />
        <Fact label="Site" value={episode?.site || "—"} />
        <Fact label="Type" value={episode ? employmentTypeLabel(episode.employment_type) : "—"} />
        <Fact label="Employee number" value={episode?.employee_number || "—"} />
        <Fact label="Started" value={formatRecordDate(episode?.start_date)} />
        <Fact label="Ended" value={formatRecordDate(episode?.end_date)} />
        <Fact label="Fitness required" value={episode ? (episode.requires_fitness ? "Yes" : "No") : "—"} />
      </DetailPageAsideSummarySection>
      <DetailPageAsideSummarySection title="Risk profile">
        <Fact label="Profile" value={profile?.name || customer.oh_hazard_profile_name || "—"} />
        <Fact label="Employee form" value={profile?.employee_form_template_name || "Not attached"} />
        <Fact label="Examination" value={profile?.exam_template_name || "Not attached"} />
        <Fact label="Certificate" value={profile?.cof_template_name || "Not attached"} />
      </DetailPageAsideSummarySection>
      <DetailPageAsideSummarySection title="Client">
        <Fact label="Phone" value={customer.phone_number || "—"} />
        <Fact label="Email" value={customer.email || "—"} />
      </DetailPageAsideSummarySection>
    </DetailPageAsidePanelSection>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <DetailPageAsideSummaryField label={label} value={value} />;
}

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
    <div className="space-y-4" data-testid="oh-employee-employment-tab">
      {episodes.map((episode) => (
        <article key={episode.uuid} className="rounded-xl border border-dash-border/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-brand-navy">
              {names.jobs.get(episode.job_title) ?? "Employment"}
            </h2>
            <span className="text-[12px] text-dash-muted">{episode.is_active ? "Active" : "Ended"}</span>
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <DetailPageAsideSummaryField label="Employer" value={names.employers.get(episode.employer) ?? "—"} />
            <DetailPageAsideSummaryField label="Department" value={episode.department_name || "—"} />
            <DetailPageAsideSummaryField label="Site" value={episode.site || "—"} />
            <DetailPageAsideSummaryField label="Type" value={employmentTypeLabel(episode.employment_type)} />
            <DetailPageAsideSummaryField label="Employee number" value={episode.employee_number || "—"} />
            <DetailPageAsideSummaryField label="Dates" value={`${formatRecordDate(episode.start_date)} – ${formatRecordDate(episode.end_date)}`} />
            <DetailPageAsideSummaryField label="Risk profile" value={names.profiles.get(episode.hazard_profile ?? -1) ?? "—"} />
            <DetailPageAsideSummaryField label="Fitness required" value={episode.requires_fitness ? "Yes" : "No"} />
          </dl>
        </article>
      ))}
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
