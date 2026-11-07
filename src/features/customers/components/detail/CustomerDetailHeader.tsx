"use client";

import type { ReactNode } from "react";

import { UserIdenticon } from "@/components/UserIdenticon";
import {
  DetailPageHeaderSection,
  DetailPageTitle,
} from "@/features/app-shell/components/page-layout";
import type { Customer } from "@/features/customers/types/customer.types";
import { isCustomerVisitActive } from "@/features/customers/utils/customer-visit-status";
import { formatCustomerName } from "@/features/customers/utils/format-customer";

type CustomerDetailHeaderProps = {
  customer: Customer;
  actions?: ReactNode;
  onManageTagsClick?: () => void;
};

export function CustomerDetailHeader({
  customer,
  actions,
}: CustomerDetailHeaderProps) {
  const fullName = formatCustomerName(customer);
  const hasActiveVisit = isCustomerVisitActive(customer.visit_status);
  const identiconSeed =
    customer.uuid || customer.customer_identifier || fullName;

  return (
    <DetailPageHeaderSection className="bg-white px-4 py-3 sm:py-3 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserIdenticon
            seed={identiconSeed}
            name={fullName}
            className="size-10 shrink-0 rounded-lg"
            fallbackClassName="text-sm font-semibold"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <DetailPageTitle className="text-xl">{fullName}</DetailPageTitle>
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
            <p className="mt-0.5 font-mono text-[12px] tracking-wide text-dash-muted">
              {customer.customer_identifier}
            </p>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </DetailPageHeaderSection>
  );
}
