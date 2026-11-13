"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { UserIdenticon } from "@/components/UserIdenticon";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ROUTES } from "@/constants/routes";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { formatVisitElapsed } from "@/features/customers/utils/format-visit-elapsed";
import {
  isNativeOhVisit,
  ohVisitStatusLabel,
  ohVisitStatusTone,
} from "@/features/occupational-health/lib/oh-visit-workspace";
import type { OhVisitEncounter } from "@/features/occupational-health/types";
import { formatAge } from "@/lib/age";
import { cn } from "@/lib/utils";

type OhVisitPatientChipProps = {
  customer: Customer | null;
  encounter: OhVisitEncounter;
  visitTypeName?: string | null;
};

function formatSexShort(gender: string | null | undefined): string | null {
  if (!gender) {
    return null;
  }
  const normalized = gender.trim();
  if (!normalized) {
    return null;
  }
  const lower = normalized.toLowerCase();
  if (lower === "female" || lower === "f") {
    return "F";
  }
  if (lower === "male" || lower === "m") {
    return "M";
  }
  return normalized;
}

function formatStartedValue(startedAt: string | null | undefined): string {
  if (!startedAt) {
    return "Not started";
  }
  const elapsed = formatVisitElapsed(startedAt);
  if (!elapsed) {
    return "Not started";
  }
  return elapsed === "Just now" ? "Just now" : `${elapsed} ago`;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-[12px] text-dash-muted">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-medium text-brand-navy">
        {value}
      </dd>
    </div>
  );
}

export function buildOhIdentityLine(customer: Customer | null): string {
  if (!customer) {
    return "";
  }
  const parts = [
    customer.customer_identifier?.trim() || null,
    formatAge(customer.dob, { empty: "" }) || null,
    formatSexShort(customer.gender),
  ].filter((value): value is string => Boolean(value));
  return parts.join(" · ");
}

/** Compact identity in the visit header. Click opens visit and employment details. Status is not repeated on the trigger. */
export function OhVisitPatientChip({
  customer,
  encounter,
  visitTypeName,
}: OhVisitPatientChipProps) {
  const [open, setOpen] = useState(false);
  const fullName = customer
    ? formatCustomerName(customer)
    : encounter.customer_name?.trim() || "OH encounter";
  const identiconSeed =
    customer?.uuid ||
    customer?.customer_identifier ||
    encounter.customer_uuid ||
    fullName;
  const identityLine =
    buildOhIdentityLine(customer) || encounter.customer_identifier || "";
  const employer = encounter.employer_name?.trim() || null;
  const riskProfile = encounter.hazard_profile_name?.trim() || null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-testid="oh-visit-patient-chip"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-md py-0.5 pr-1.5 text-left",
            "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
          )}
          aria-label={`Visit details for ${fullName}`}
          title="Open visit details"
        >
          <UserIdenticon
            seed={identiconSeed}
            name={fullName}
            className="size-7 shrink-0 rounded-full"
            fallbackClassName="rounded-full text-[10px] font-semibold"
          />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-tight text-brand-navy">
              {fullName}
            </span>
            {identityLine ? (
              <span className="block truncate text-[11px] leading-tight text-dash-muted">
                {identityLine}
              </span>
            ) : null}
          </span>
          <ChevronDown
            className="size-3.5 shrink-0 text-dash-muted"
            aria-hidden
          />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-2 border-b border-dash-border px-5 py-4 pr-12 text-left">
          <div className="flex items-center gap-3">
            <UserIdenticon
              seed={identiconSeed}
              name={fullName}
              className="size-10 shrink-0 rounded-full"
              fallbackClassName="rounded-full text-sm font-semibold"
            />
            <div className="min-w-0">
              <SheetTitle className="truncate text-[16px] font-semibold tracking-tight text-brand-navy">
                {fullName}
              </SheetTitle>
              <SheetDescription className="text-[13px] text-dash-muted">
                {identityLine || "Occupational health visit"}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusDotBadge tone={ohVisitStatusTone(encounter.status)}>
              {ohVisitStatusLabel(encounter.status)}
            </StatusDotBadge>
            {visitTypeName ? (
              <span className="text-[12px] font-medium text-brand-primary">
                {visitTypeName}
              </span>
            ) : null}
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          <dl className="divide-y divide-dash-border/80">
            {employer ? <Fact label="Employer" value={employer} /> : null}
            {riskProfile ? (
              <Fact label="Risk profile" value={riskProfile} />
            ) : null}
            {encounter.department_name ? (
              <Fact label="Department" value={encounter.department_name} />
            ) : null}
            {encounter.location_name ? (
              <Fact label="Clinic" value={encounter.location_name} />
            ) : null}
            {encounter.clinician_name ? (
              <Fact label="Clinician" value={encounter.clinician_name} />
            ) : null}
            <Fact
              label="Started"
              value={formatStartedValue(encounter.started_at)}
            />
            {encounter.visit_date ? (
              <Fact
                label="Visit date"
                value={encounter.visit_date.slice(0, 10)}
              />
            ) : null}
            {encounter.billing_mode ? (
              <Fact
                label="Billing"
                value={encounter.billing_mode.replaceAll("_", " ")}
              />
            ) : null}
            <Fact
              label="Origin"
              value={
                isNativeOhVisit(encounter)
                  ? "Occupational Health"
                  : "Main clinic"
              }
            />
          </dl>
          <div className="mt-4 flex flex-col gap-2 border-t border-dash-border pt-4">
            {customer?.uuid ? (
              <Link
                href={ROUTES.occupationalHealthEmployee(customer.uuid)}
                className="text-[13px] font-medium text-brand-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                Open employee file
              </Link>
            ) : null}
            <Link
              href={ROUTES.occupationalHealth}
              className="text-[13px] font-medium text-brand-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              OHS Queue
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
