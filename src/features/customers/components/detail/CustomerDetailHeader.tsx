"use client";

import { Camera } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ClientProfileAvatar } from "@/components/client-profile-avatar";
import { Button } from "@/components/ui/button";
import {
  DetailPageHeaderSection,
  DetailPageTitle,
} from "@/features/app-shell/components/page-layout";
import { CustomerPhotoDialog } from "@/features/customers/components/detail/CustomerPhotoDialog";
import type { Customer } from "@/features/customers/types/customer.types";
import { isCustomerVisitActive } from "@/features/customers/utils/customer-visit-status";
import { formatCustomerName } from "@/features/customers/utils/format-customer";

type CustomerDetailHeaderProps = {
  customer: Customer;
  actions?: ReactNode;
  onManageTagsClick?: () => void;
  onCustomerUpdated?: (customer: Customer) => void;
};

export function CustomerDetailHeader({
  customer,
  actions,
  onCustomerUpdated,
}: CustomerDetailHeaderProps) {
  const fullName = formatCustomerName(customer);
  const hasActiveVisit = isCustomerVisitActive(customer.visit_status);
  const identiconSeed =
    customer.uuid || customer.customer_identifier || fullName;
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  return (
    <DetailPageHeaderSection className="bg-white px-4 py-3 sm:py-3 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <ClientProfileAvatar
              seed={identiconSeed}
              name={fullName}
              photoUrl={customer.photo_url}
              className="size-10 rounded-lg"
              fallbackClassName="text-sm font-semibold"
            />
            {onCustomerUpdated ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -bottom-1 -right-1 size-6 rounded-full border-dash-border bg-white shadow-sm"
                aria-label="Update client photo"
                onClick={() => setPhotoDialogOpen(true)}
                data-testid="customer-photo-camera-button"
              >
                <Camera className="size-3" />
              </Button>
            ) : null}
          </div>
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

      {onCustomerUpdated ? (
        <CustomerPhotoDialog
          customer={customer}
          open={photoDialogOpen}
          onOpenChange={setPhotoDialogOpen}
          onUpdated={onCustomerUpdated}
        />
      ) : null}
    </DetailPageHeaderSection>
  );
}
