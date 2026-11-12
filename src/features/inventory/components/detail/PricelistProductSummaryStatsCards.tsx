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

/**
 * Full-bleed under the detail-tab nav: cancel main padding so the bottom
 * hairline runs edge-to-edge, then restore content padding and breathing room.
 */
const PRICELIST_PRODUCT_INSIGHT_STRIP_CLASS =
  "-mx-4 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-dash-border px-4 py-4 sm:-mx-6 sm:px-6";

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
            <Skeleton className="h-3.5 w-10" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-28" />
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
        <p>Active on this pricelist</p>
      </div>

      <div className={LIST_PAGE_INSIGHT_CELL_CLASS}>
        <dt className={LIST_PAGE_INSIGHT_LABEL_CLASS}>Medicines</dt>
        <dd className={LIST_PAGE_INSIGHT_VALUE_CLASS}>
          {formatCompactNumber(medicines)}
        </dd>
        <p>Stockable / drug products</p>
      </div>

      <div className={LIST_PAGE_INSIGHT_CELL_CLASS}>
        <dt className={LIST_PAGE_INSIGHT_LABEL_CLASS}>Services</dt>
        <dd className={LIST_PAGE_INSIGHT_VALUE_CLASS}>
          {formatCompactNumber(services)}
        </dd>
        <p>Non-procedure services</p>
      </div>

      <div className={LIST_PAGE_INSIGHT_CELL_CLASS}>
        <dt className={LIST_PAGE_INSIGHT_LABEL_CLASS}>Procedures</dt>
        <dd className={LIST_PAGE_INSIGHT_VALUE_CLASS}>
          {formatCompactNumber(procedures)}
        </dd>
        <p>Procedure products</p>
      </div>
    </dl>
  );
}
