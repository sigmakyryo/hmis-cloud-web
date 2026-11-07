"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  LIST_PAGE_INSIGHT_CELL_CLASS,
  LIST_PAGE_INSIGHT_LABEL_CLASS,
  LIST_PAGE_INSIGHT_VALUE_CLASS,
} from "@/features/app-shell/components/page-layout";
import type { PricelistProductSummaryStats } from "@/features/catalog/services/catalog.service";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/utils/format-compact-number";

/** Detail-tab strip: bottom hairline only; tabs nav supplies the top rule. */
const PRICELIST_PRODUCT_INSIGHT_STRIP_CLASS =
  "grid grid-cols-2 divide-y divide-dash-border/60 border-b border-dash-border/80 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x";

type PricelistProductSummaryStatsCardsProps = {
  stats: PricelistProductSummaryStats | null;
  isLoading?: boolean;
  className?: string;
};

export function PricelistProductSummaryStatsCards({
  stats,
  isLoading = false,
  className,
}: PricelistProductSummaryStatsCardsProps) {
  if (isLoading) {
    return (
      <div
        className={cn(PRICELIST_PRODUCT_INSIGHT_STRIP_CLASS, className)}
        data-testid="pricelist-product-summary-stats"
        aria-busy="true"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={LIST_PAGE_INSIGHT_CELL_CLASS}>
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-2 h-6 w-14" />
            <Skeleton className="mt-1.5 h-3 w-28" />
          </div>
        ))}
      </div>
    );
  }

  const totalProducts = stats?.totalProducts ?? 0;
  const medicines = stats?.medicines ?? 0;
  const services = stats?.services ?? 0;
  const procedures = stats?.procedures ?? 0;

  return (
    <dl
      className={cn(PRICELIST_PRODUCT_INSIGHT_STRIP_CLASS, className)}
      data-testid="pricelist-product-summary-stats"
    >
      <div className={LIST_PAGE_INSIGHT_CELL_CLASS}>
        <dt className={LIST_PAGE_INSIGHT_LABEL_CLASS}>Total products</dt>
        <dd className={LIST_PAGE_INSIGHT_VALUE_CLASS}>
          {formatCompactNumber(totalProducts)}
        </dd>
        <p className="mt-0.5 text-xs text-brand-muted">Active on this pricelist</p>
      </div>

      <div className={LIST_PAGE_INSIGHT_CELL_CLASS}>
        <dt className={LIST_PAGE_INSIGHT_LABEL_CLASS}>Medicines</dt>
        <dd className={LIST_PAGE_INSIGHT_VALUE_CLASS}>
          {formatCompactNumber(medicines)}
        </dd>
        <p className="mt-0.5 text-xs text-brand-muted">Stockable / drug products</p>
      </div>

      <div className={LIST_PAGE_INSIGHT_CELL_CLASS}>
        <dt className={LIST_PAGE_INSIGHT_LABEL_CLASS}>Services</dt>
        <dd className={LIST_PAGE_INSIGHT_VALUE_CLASS}>
          {formatCompactNumber(services)}
        </dd>
        <p className="mt-0.5 text-xs text-brand-muted">Non-procedure services</p>
      </div>

      <div className={LIST_PAGE_INSIGHT_CELL_CLASS}>
        <dt className={LIST_PAGE_INSIGHT_LABEL_CLASS}>Procedures</dt>
        <dd className={LIST_PAGE_INSIGHT_VALUE_CLASS}>
          {formatCompactNumber(procedures)}
        </dd>
        <p className="mt-0.5 text-xs text-brand-muted">Procedure products</p>
      </div>
    </dl>
  );
}
