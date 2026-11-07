"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  LIST_PAGE_INSIGHT_CELL_CLASS,
  LIST_PAGE_INSIGHT_LABEL_CLASS,
  LIST_PAGE_INSIGHT_STRIP_CLASS,
  LIST_PAGE_INSIGHT_VALUE_CLASS,
} from "@/features/app-shell/components/page-layout";
import type { PricelistProductSummaryStats } from "@/features/catalog/services/catalog.service";
import { formatCompactNumber } from "@/utils/format-compact-number";

type PricelistProductSummaryStatsCardsProps = {
  stats: PricelistProductSummaryStats | null;
  isLoading?: boolean;
};

export function PricelistProductSummaryStatsCards({
  stats,
  isLoading = false,
}: PricelistProductSummaryStatsCardsProps) {
  if (isLoading) {
    return (
      <div
        className={LIST_PAGE_INSIGHT_STRIP_CLASS}
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
  const timeLimited = stats?.timeLimited ?? 0;
  const addedThisMonth = stats?.addedThisMonth ?? 0;

  return (
    <dl
      className={LIST_PAGE_INSIGHT_STRIP_CLASS}
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
        <p className="mt-0.5 text-xs text-brand-muted">Drug products</p>
      </div>

      <div className={LIST_PAGE_INSIGHT_CELL_CLASS}>
        <dt className={LIST_PAGE_INSIGHT_LABEL_CLASS}>Time-limited</dt>
        <dd className={LIST_PAGE_INSIGHT_VALUE_CLASS}>
          {formatCompactNumber(timeLimited)}
        </dd>
        <p className="mt-0.5 text-xs text-brand-muted">Have an end date</p>
      </div>

      <div className={LIST_PAGE_INSIGHT_CELL_CLASS}>
        <dt className={LIST_PAGE_INSIGHT_LABEL_CLASS}>Added this month</dt>
        <dd className={LIST_PAGE_INSIGHT_VALUE_CLASS}>
          {formatCompactNumber(addedThisMonth)}
        </dd>
        <p className="mt-0.5 text-xs text-brand-muted">New memberships</p>
      </div>
    </dl>
  );
}
