"use client";

import type { ReactNode } from "react";

import { UserIdenticon } from "@/components/UserIdenticon";
import { OpdEncounterStatusBadge } from "@/features/clinical-opd/components/OpdEncounterStatusBadge";
import type { OhVisitEncounter } from "@/features/occupational-health/types";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatVisitElapsed } from "@/features/customers/utils/format-visit-elapsed";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { formatAge } from "@/lib/age";

type OhEncounterHeaderProps = {
  customer: Customer | null;
  encounter: OhVisitEncounter;
  visitTypeName?: string | null;
  actions?: ReactNode;
};

function formatStartedLabel(startedAt: string | null | undefined): string {
  if (!startedAt) {
    return "Not started";
  }
  const elapsed = formatVisitElapsed(startedAt);
  if (!elapsed) {
    return "Not started";
  }
  return elapsed === "Just now" ? "Started just now" : `Started ${elapsed} ago`;
}

export function OhEncounterHeader({
  customer,
  encounter,
  visitTypeName,
  actions,
}: OhEncounterHeaderProps) {
  const fullName = customer ? formatCustomerName(customer) : "OH encounter";
  const identiconSeed = customer?.uuid || customer?.customer_identifier || fullName;
  const visitLabel = visitTypeName?.trim() || null;

  const facts = [
    customer?.customer_identifier,
    customer ? formatAge(customer.dob, { empty: "" }) || null : null,
    customer?.gender,
    encounter.department_name,
    encounter.location_name,
    encounter.clinician_name,
    formatStartedLabel(encounter.started_at),
  ].filter((value): value is string => Boolean(value));

  return (
    <header
      className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-dash-border bg-white px-5 py-2.5"
      data-testid="oh-encounter-header"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserIdenticon
          seed={identiconSeed}
          name={fullName}
          className="size-8 shrink-0 rounded-full"
          fallbackClassName="rounded-full text-xs font-semibold"
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-brand-navy">
              {fullName}
            </h1>
            <OpdEncounterStatusBadge status={encounter.status} />
            {visitLabel ? (
              <span
                className="truncate text-[12px] font-semibold text-brand-primary"
                data-testid="oh-encounter-visit-type"
                title={visitLabel}
              >
                {visitLabel}
              </span>
            ) : null}
          </div>
          {facts.length > 0 ? (
            <p className="mt-0.5 truncate text-[12px] text-dash-muted">
              {facts.map((fact, index) => (
                <span key={`${fact}-${index}`}>
                  {index > 0 ? <span aria-hidden> · </span> : null}
                  <span
                    data-testid={
                      fact === encounter.department_name
                        ? "oh-encounter-fact-department"
                        : fact === encounter.location_name
                          ? "oh-encounter-fact-location"
                          : fact === encounter.clinician_name
                            ? "oh-encounter-fact-clinician"
                            : fact === formatStartedLabel(encounter.started_at)
                              ? "oh-encounter-fact-started"
                              : undefined
                    }
                  >
                    {fact}
                  </span>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0 self-center">{actions}</div> : null}
    </header>
  );
}
