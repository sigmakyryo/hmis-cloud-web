"use client";

import { Calendar, Hash, Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { UserIdenticon } from "@/components/UserIdenticon";
import {
  DetailPageHeaderSection,
  DetailPageTitle,
  PAGE_STAT_LABEL_CLASS,
} from "@/features/app-shell/components/page-layout";
import type { Customer } from "@/features/customers/types/customer.types";
import { isCustomerVisitActive } from "@/features/customers/utils/customer-visit-status";
import {
  formatAdaptiveAge,
  formatCustomerName,
  formatDisplayDate,
} from "@/features/customers/utils/format-customer";
import { TagBadgeList } from "@/features/tags/components/TagBadgeList";

type CustomerDetailHeaderProps = {
  customer: Customer;
  actions?: ReactNode;
  onManageTagsClick?: () => void;
};

function IdentityFact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className={PAGE_STAT_LABEL_CLASS}>{label}</dt>
      <dd className="mt-1 truncate text-[13px] font-medium text-brand-navy">
        {children}
      </dd>
    </div>
  );
}

export function CustomerDetailHeader({
  customer,
  actions,
  onManageTagsClick,
}: CustomerDetailHeaderProps) {
  const fullName = formatCustomerName(customer);
  const ageDisplay = formatAdaptiveAge(customer.dob);
  const hasActiveVisit = isCustomerVisitActive(customer.visit_status);
  const identiconSeed =
    customer.uuid || customer.customer_identifier || fullName;

  return (
    <DetailPageHeaderSection className="bg-white px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <UserIdenticon
            seed={identiconSeed}
            name={fullName}
            className="size-14 shrink-0 rounded-lg"
            fallbackClassName="text-lg font-semibold"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <DetailPageTitle className="text-2xl">{fullName}</DetailPageTitle>
              {hasActiveVisit ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-2 py-0.5 text-[12px] font-medium text-brand-primary">
                  <span className="size-1.5 rounded-full bg-brand-primary" />
                  Active visit
                </span>
              ) : null}
              {!customer.is_active ? (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[12px] font-medium text-red-700">
                  Inactive
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-[12px] tracking-wide text-dash-muted">
              {customer.customer_identifier}
            </p>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-dash-border pt-4 sm:grid-cols-4">
        <IdentityFact label="Age">
          {ageDisplay}
          {customer.dob_is_estimated ? " (est.)" : ""}
        </IdentityFact>
        <IdentityFact label="Gender">{customer.gender}</IdentityFact>
        <IdentityFact label="Born">{formatDisplayDate(customer.dob)}</IdentityFact>
        <IdentityFact label="Phone">
          {customer.phone_number ? (
            <a
              href={`tel:${customer.phone_number}`}
              className="inline-flex items-center gap-1.5 hover:text-brand-primary"
            >
              <Phone className="size-3.5 text-dash-muted" aria-hidden="true" />
              {customer.phone_number}
            </a>
          ) : (
            "—"
          )}
        </IdentityFact>
        <IdentityFact label="Email">
          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="inline-flex max-w-full items-center gap-1.5 hover:text-brand-primary"
            >
              <Mail className="size-3.5 shrink-0 text-dash-muted" aria-hidden="true" />
              <span className="truncate">{customer.email}</span>
            </a>
          ) : (
            "—"
          )}
        </IdentityFact>
        <IdentityFact label="Reference">
          {customer.internal_reference ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
              <Hash className="size-3.5 text-dash-muted" aria-hidden="true" />
              {customer.internal_reference}
            </span>
          ) : (
            "—"
          )}
        </IdentityFact>
        <IdentityFact label="Registered">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5 text-dash-muted" aria-hidden="true" />
            {formatDisplayDate(customer.created_at)}
          </span>
        </IdentityFact>
      </dl>

      {(customer.tags?.length ?? 0) > 0 ? (
        <div className="mt-4">
          <TagBadgeList tags={customer.tags} onTagClick={onManageTagsClick} />
        </div>
      ) : null}
    </DetailPageHeaderSection>
  );
}
