"use client";

import type { ReactNode } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import {
  DetailPageHeaderSection,
  DetailPageTitle,
} from "@/features/app-shell/components/page-layout";
import type { CatalogPricelist } from "@/features/catalog/types/catalog.types";

type PricelistDetailHeaderProps = {
  pricelist: CatalogPricelist;
  onUpdate?: () => void;
  actions?: ReactNode;
};

export function PricelistDetailHeader({
  pricelist,
  onUpdate,
  actions,
}: PricelistDetailHeaderProps) {
  const defaultActions = onUpdate ? (
    <PrimaryButton type="button" size="sm" onClick={onUpdate}>
      Update
    </PrimaryButton>
  ) : null;
  const currency = pricelist.currency_code?.trim();

  return (
    <DetailPageHeaderSection>
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <DetailPageTitle className="min-w-0 truncate">
              {pricelist.name}
            </DetailPageTitle>
            {currency ? (
              <>
                <span
                  className="hidden h-4 w-px shrink-0 bg-dash-border sm:block"
                  aria-hidden="true"
                />
                <span className="text-sm font-normal tabular-nums tracking-wide text-dash-muted">
                  {currency}
                </span>
              </>
            ) : null}
            {!pricelist.is_active ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-brand-muted">
                Archived
              </span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0">{actions ?? defaultActions}</div>
      </div>
    </DetailPageHeaderSection>
  );
}
