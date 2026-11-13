"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { ROUTES } from "@/constants/routes";
import { OhVisitPatientChip } from "@/features/occupational-health/components/workspace/OhVisitPatientChip";
import type { Customer } from "@/features/customers/types/customer.types";
import {
  OH_HEADER_ACTIONS,
  OH_REFERRED_VISIT_MESSAGE,
  isNativeOhVisit,
  isReferredOhVisit,
  ohVisitStatusLabel,
  ohVisitStatusTone,
} from "@/features/occupational-health/lib/oh-visit-workspace";
import type { OhVisitEncounter } from "@/features/occupational-health/types";

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
};

export function OhEncounterHeader({
  customer,
  encounter,
  visitTypeName,
  actions,
  jump = null,
  primary = null,
  cancel = null,
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

  return (
    <header
      className="flex shrink-0 flex-col border-b border-dash-border bg-white"
      data-testid="oh-encounter-header"
    >
      <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-1.5 sm:px-5">
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
        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2"
          data-testid="oh-header-actions"
        >
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

export { OH_HEADER_ACTIONS };
