"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { UserIdenticon } from "@/components/UserIdenticon";
import { ROUTES } from "@/constants/routes";
import { OhVisitPatientChip } from "@/features/occupational-health/components/workspace/OhVisitPatientChip";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import {
  OH_HEADER_ACTIONS,
  OH_REFERRED_VISIT_MESSAGE,
  isNativeOhVisit,
  isReferredOhVisit,
  ohVisitStatusLabel,
  ohVisitStatusTone,
} from "@/features/occupational-health/lib/oh-visit-workspace";
import type { OhVisitEncounter } from "@/features/occupational-health/types";
import { formatAge } from "@/lib/age";

export type OhEncounterHeaderAction = {
  visible: string;
  aria: string;
  title: string;
  pending?: boolean;
  onClick: () => void;
};

export type OhEncounterHeaderJump = {
  label: string;
  description: string;
  onClick: () => void;
};

type OhEncounterHeaderProps = {
  customer: Customer | null;
  encounter: OhVisitEncounter;
  visitTypeName?: string | null;
  /** @deprecated Prefer structured primary / jump / cancel props. Still rendered at the end when provided. */
  actions?: ReactNode;
  jump?: OhEncounterHeaderJump | null;
  primary?: OhEncounterHeaderAction | null;
  cancel?: ReactNode;
  /** Assessment dashboard layout: compact employee strip + outline queue actions. */
  assessmentLayout?: boolean;
};

export function OhEncounterHeader({
  customer,
  encounter,
  visitTypeName,
  actions,
  jump = null,
  primary = null,
  cancel = null,
  assessmentLayout = false,
}: OhEncounterHeaderProps) {
  const visitLabel = visitTypeName?.trim() || null;
  const referred = isReferredOhVisit(encounter) && encounter.is_active;
  const closedLabel = !encounter.is_active
    ? encounter.status === "no_show"
      ? "This visit is marked as did not attend."
      : encounter.status === "cancelled"
        ? "This visit was cancelled."
        : encounter.status === "completed"
          ? "This visit is completed."
          : null
    : null;
  const employeeHref = customer?.uuid
    ? ROUTES.occupationalHealthEmployee(customer.uuid)
    : null;

  return (
    <header
      className="flex shrink-0 flex-col border-b border-dash-border bg-white"
      data-testid="oh-encounter-header"
    >
      <div
        className={
          assessmentLayout
            ? "flex items-start justify-between gap-3 px-4 py-3 sm:px-5"
            : "flex min-h-12 items-center justify-between gap-3 px-4 py-1.5 sm:px-5"
        }
      >
        {assessmentLayout ? (
          <AssessmentIdentity customer={customer} encounter={encounter} visitLabel={visitLabel} />
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <OhVisitPatientChip
              customer={customer}
              encounter={encounter}
              visitTypeName={visitLabel}
            />
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {visitLabel ? (
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[11px] font-medium text-brand-navy"
                  data-testid="oh-encounter-visit-type"
                  title={visitLabel}
                >
                  {visitLabel}
                </Badge>
              ) : null}
              <StatusDotBadge
                tone={ohVisitStatusTone(encounter.status)}
                className="h-5 px-1.5 text-[11px]"
              >
                {ohVisitStatusLabel(encounter.status)}
              </StatusDotBadge>
            </div>
          </div>
        )}
        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2"
          data-testid="oh-header-actions"
        >
          {assessmentLayout ? (
            <>
              <SecondaryButton asChild className="h-8 px-2.5 text-[12px]">
                <Link href={ROUTES.occupationalHealth}>OHS Queue</Link>
              </SecondaryButton>
              {employeeHref ? (
                <SecondaryButton asChild className="h-8 px-2.5 text-[12px]">
                  <Link href={employeeHref}>Go to employee</Link>
                </SecondaryButton>
              ) : null}
              {jump || cancel ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SecondaryButton
                      type="button"
                      className="h-8 px-2.5 text-[12px]"
                      data-testid="oh-header-more"
                    >
                      More
                      <ChevronDown className="size-3.5 opacity-70" aria-hidden />
                    </SecondaryButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44">
                    {jump ? (
                      <DropdownMenuItem
                        onSelect={() => jump.onClick()}
                        data-testid="oh-go-to-current-step"
                      >
                        {jump.label}
                      </DropdownMenuItem>
                    ) : null}
                    {cancel ? (
                      <div className="px-1 py-1" data-testid="oh-header-more-cancel">
                        {cancel}
                      </div>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {primary ? (
                <PrimaryButton
                  type="button"
                  disabled={Boolean(primary.pending)}
                  onClick={primary.onClick}
                  aria-label={primary.aria}
                  title={primary.title}
                  data-testid="oh-visit-primary-action"
                  className="h-8 px-3 text-[12px]"
                >
                  {primary.visible}
                </PrimaryButton>
              ) : null}
            </>
          ) : (
            <>
              <Link
                href={ROUTES.occupationalHealth}
                className="text-[12px] font-medium text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              >
                OHS Queue
              </Link>
              {jump ? (
                <SecondaryButton
                  type="button"
                  onClick={jump.onClick}
                  aria-label={jump.description}
                  title={jump.description}
                  data-testid="oh-go-to-current-step"
                  className="h-8 px-2.5 text-[12px]"
                >
                  {jump.label}
                </SecondaryButton>
              ) : null}
              {cancel}
              {primary ? (
                <PrimaryButton
                  type="button"
                  disabled={Boolean(primary.pending)}
                  onClick={primary.onClick}
                  aria-label={primary.aria}
                  title={primary.title}
                  data-testid="oh-visit-primary-action"
                  className="h-8 px-3 text-[12px]"
                >
                  {primary.visible}
                </PrimaryButton>
              ) : null}
            </>
          )}
          {actions}
        </div>
      </div>
      {referred ? (
        <p
          role="status"
          data-testid="oh-visit-readonly-banner"
          className="border-t border-dash-border bg-amber-50/80 px-4 py-2 text-[12.5px] text-amber-950 sm:px-5"
        >
          {OH_REFERRED_VISIT_MESSAGE}
        </p>
      ) : null}
      {closedLabel && isNativeOhVisit(encounter) ? (
        <p
          role="status"
          data-testid="oh-visit-closed-banner"
          className="border-t border-dash-border bg-slate-50 px-4 py-2 text-[12.5px] text-dash-muted sm:px-5"
        >
          {closedLabel}
        </p>
      ) : null}
    </header>
  );
}

function AssessmentIdentity({
  customer,
  encounter,
  visitLabel,
}: {
  customer: Customer | null;
  encounter: OhVisitEncounter;
  visitLabel: string | null;
}) {
  const name = customer
    ? formatCustomerName(customer)
    : encounter.customer_name?.trim() || "Employee";
  const employeeNumber =
    customer?.customer_identifier?.trim() ||
    encounter.customer_identifier?.trim() ||
    null;
  const gender = formatGender(customer?.gender);
  const age = customer?.dob ? formatAge(customer.dob, { empty: "" }) : "";
  const hazards = encounter.hazard_profile_name?.trim() || null;
  const meta = [
    employeeNumber,
    [gender, age].filter(Boolean).join(", ") || null,
    hazards ? `Hazards: ${hazards}` : null,
  ].filter(Boolean);

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3" data-testid="oh-fit-employee-header">
      <UserIdenticon
        seed={customer?.uuid || encounter.customer_uuid || name}
        name={name}
        fallback="initials"
        className="size-10 shrink-0 rounded-full"
        fallbackClassName="rounded-full bg-teal-100 text-sm font-semibold text-teal-800"
      />
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-[15px] font-semibold text-brand-navy">{name}</h1>
          {visitLabel ? (
            <Badge
              variant="outline"
              className="h-5 border-slate-200 bg-slate-50 px-1.5 text-[11px] font-medium text-slate-600"
              data-testid="oh-encounter-visit-type"
            >
              {visitLabel}
            </Badge>
          ) : null}
        </div>
        {meta.length > 0 ? (
          <p className="text-[12px] leading-snug text-dash-muted">{meta.join(" · ")}</p>
        ) : null}
      </div>
    </div>
  );
}

function formatGender(gender: string | null | undefined): string | null {
  if (!gender?.trim()) return null;
  const lower = gender.trim().toLowerCase();
  if (lower === "male" || lower === "m") return "Male";
  if (lower === "female" || lower === "f") return "Female";
  return gender.trim();
}

export { OH_HEADER_ACTIONS };
