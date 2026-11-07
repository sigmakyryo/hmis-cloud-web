"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DetailPageAsidePanelSection,
  DetailPageAsideSummarySection,
} from "@/features/app-shell/components/page-layout";
import { CustomerAccountSummaryCard } from "@/features/customers/components/detail/CustomerAccountSummaryCard";
import type { Customer } from "@/features/customers/types/customer.types";
import {
  formatAdaptiveAge,
  formatCustomerName,
  formatDisplayDate,
} from "@/features/customers/utils/format-customer";
import { TagBadgeList } from "@/features/tags/components/TagBadgeList";
import type { Tag } from "@/features/tags/types/tag.types";

type CustomerSummaryPanelProps = {
  customer: Customer;
  onUpdateClick: () => void;
  onTagsUpdated?: (tags: Tag[]) => void;
  onManageTagsClick?: () => void;
  billingRefreshKey?: number;
  onOpeningBalanceUpdated?: (customer: Customer) => void;
  onBillingUpdated?: () => void;
  className?: string;
};

function RecordLine({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dash-border/70 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[12px] text-dash-muted">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-medium text-brand-navy">
        {value}
      </dd>
    </div>
  );
}

export function CustomerSummaryPanel({
  customer,
  onUpdateClick,
  onManageTagsClick,
  billingRefreshKey = 0,
  onOpeningBalanceUpdated,
  onBillingUpdated,
  className,
}: CustomerSummaryPanelProps) {
  const fullName = formatCustomerName(customer);
  const ageDisplay = formatAdaptiveAge(customer.dob);

  return (
    <DetailPageAsidePanelSection className={className}>
      <CustomerAccountSummaryCard
        customer={customer}
        refreshKey={billingRefreshKey}
        onOpeningBalanceUpdated={onOpeningBalanceUpdated}
        onBillingUpdated={onBillingUpdated}
      />

      <DetailPageAsideSummarySection
        title="Personal"
        layout="ledger"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-brand-muted hover:text-brand-navy"
            onClick={onUpdateClick}
            data-testid="update-customer-button"
          >
            Edit details
          </Button>
        }
      >
        <RecordLine label="Name" value={fullName} />
        <RecordLine
          label="Client ID"
          value={
            <span className="font-mono text-[12px]">{customer.customer_identifier}</span>
          }
        />
        <RecordLine
          label="Internal reference"
          value={
            customer.internal_reference ? (
              <span className="font-mono text-[12px]">{customer.internal_reference}</span>
            ) : (
              "—"
            )
          }
        />
        <RecordLine
          label="Phone"
          value={
            customer.phone_number ? (
              <a
                href={`tel:${customer.phone_number}`}
                className="hover:text-brand-primary"
              >
                {customer.phone_number}
              </a>
            ) : (
              "—"
            )
          }
        />
        <RecordLine
          label="Email"
          value={
            customer.email ? (
              <a
                href={`mailto:${customer.email}`}
                className="break-all hover:text-brand-primary"
              >
                {customer.email}
              </a>
            ) : (
              "—"
            )
          }
        />
        <RecordLine label="Gender" value={customer.gender} />
        <RecordLine
          label="Date of birth"
          value={
            <>
              {formatDisplayDate(customer.dob)}
              {customer.dob_is_estimated ? (
                <span className="ml-1 font-normal text-dash-muted">(estimated)</span>
              ) : null}
            </>
          }
        />
        <RecordLine label="Age" value={ageDisplay} />
      </DetailPageAsideSummarySection>

      <DetailPageAsideSummarySection
        title="Tags"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-brand-muted hover:text-brand-navy"
            onClick={onManageTagsClick}
            data-testid="manage-customer-tags-button"
          >
            Manage tags
          </Button>
        }
      >
        <TagBadgeList
          tags={customer.tags}
          emptyLabel="No tags assigned."
          onTagClick={onManageTagsClick}
        />
      </DetailPageAsideSummarySection>

      <DetailPageAsideSummarySection title="System" layout="ledger">
        <RecordLine
          label="Patient UUID"
          value={
            <span className="break-all font-mono text-[11px] font-normal text-dash-muted">
              {customer.patient_uuid}
            </span>
          }
        />
        <RecordLine label="Registered" value={formatDisplayDate(customer.created_at)} />
        <RecordLine label="Last updated" value={formatDisplayDate(customer.updated_at)} />
      </DetailPageAsideSummarySection>
    </DetailPageAsidePanelSection>
  );
}
