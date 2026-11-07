"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DetailPageAsidePanelSection,
  DetailPageAsideSummarySection,
} from "@/features/app-shell/components/page-layout";
import { CustomerAccountSummaryCard } from "@/features/customers/components/detail/CustomerAccountSummaryCard";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatDisplayDate } from "@/features/customers/utils/format-customer";
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
  return (
    <DetailPageAsidePanelSection className={className}>
      <CustomerAccountSummaryCard
        customer={customer}
        refreshKey={billingRefreshKey}
        onOpeningBalanceUpdated={onOpeningBalanceUpdated}
        onBillingUpdated={onBillingUpdated}
      />

      <DetailPageAsideSummarySection
        title="Profile"
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
        {null}
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
        <RecordLine label="Last updated" value={formatDisplayDate(customer.updated_at)} />
      </DetailPageAsideSummarySection>
    </DetailPageAsidePanelSection>
  );
}
