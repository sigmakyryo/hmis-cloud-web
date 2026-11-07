"use client";

import { useCallback, useEffect, useState } from "react";

import {
  PAGE_STAT_LABEL_CLASS,
  PAGE_STAT_VALUE_CLASS,
} from "@/features/app-shell/components/page-layout";
import {
  CustomerActivityTimeline,
} from "@/features/customers/components/detail/CustomerActivityTimeline";
import { CustomerTabSkeleton } from "@/features/customers/components/detail/CustomerTabSkeleton";
import {
  extractCustomerBillingCounts,
  fetchCustomerBillingSummary,
} from "@/features/customers/services/customer-billing.service";
import { fetchCustomerEncounters } from "@/features/customers/services/customer-encounters.service";
import {
  countCustomerVisits,
  fetchCustomerVisits,
} from "@/features/customers/services/customer-visits.service";
import type { CustomerEncounter } from "@/features/customers/types/customer-encounter.types";
import type { Customer } from "@/features/customers/types/customer.types";
import {
  formatCompactAmount,
  formatCompactNumber,
} from "@/utils/format-compact-number";
import { cn } from "@/lib/utils";
import type { CustomerBillingTotals } from "@/features/customers/types/customer-billing.types";

const ACTIVITY_PAGE_SIZE = 20;

type CustomerDetailSummaryTabProps = {
  customer: Customer;
  isActive: boolean;
  billingRefreshKey?: number;
};

type SummaryStats = {
  visits: number;
  salesOrders: number | null;
  invoices: number | null;
  totals: CustomerBillingTotals | null;
  billingUnavailable: boolean;
  isBillingLoading: boolean;
};

function RecordStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-6">
      <dt className={PAGE_STAT_LABEL_CLASS}>{label}</dt>
      <dd className={cn(PAGE_STAT_VALUE_CLASS, "text-xl", accent && "text-brand-primary")}>
        {value}
      </dd>
    </div>
  );
}

function parseBillingAmount(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function CustomerDetailSummaryTab({
  customer,
  isActive,
  billingRefreshKey = 0,
}: CustomerDetailSummaryTabProps) {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [encounters, setEncounters] = useState<CustomerEncounter[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalCount, setActivityTotalCount] = useState(0);
  const [hasNextActivity, setHasNextActivity] = useState(false);
  const [hasPreviousActivity, setHasPreviousActivity] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isActivityRefreshing, setIsActivityRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadActivityPage = useCallback(
    async (page: number, options?: { quiet?: boolean }) => {
      if (!options?.quiet) {
        setIsActivityRefreshing(true);
      }

      try {
        const response = await fetchCustomerEncounters({
          customerId: customer.id,
          page,
          pageSize: ACTIVITY_PAGE_SIZE,
        });

        setEncounters(response.results);
        setActivityPage(page);
        setActivityTotalCount(
          response.pagination?.count ?? response.results.length,
        );
        setHasNextActivity(Boolean(response.pagination?.next));
        setHasPreviousActivity(Boolean(response.pagination?.previous));
        setLoadError(null);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load activity.",
        );
      } finally {
        setIsActivityRefreshing(false);
      }
    },
    [customer.id],
  );

  useEffect(() => {
    if (!isActive || hasLoaded) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [visits, encountersResponse] = await Promise.all([
          fetchCustomerVisits(customer.uuid, { limit: 100 }),
          fetchCustomerEncounters({
            customerId: customer.id,
            page: 1,
            pageSize: ACTIVITY_PAGE_SIZE,
          }),
        ]);

        if (cancelled) {
          return;
        }

        setStats({
          visits: countCustomerVisits(visits),
          salesOrders: null,
          invoices: null,
          totals: null,
          billingUnavailable: false,
          isBillingLoading: true,
        });
        setEncounters(encountersResponse.results);
        setActivityPage(1);
        setActivityTotalCount(
          encountersResponse.pagination?.count ??
            encountersResponse.results.length,
        );
        setHasNextActivity(Boolean(encountersResponse.pagination?.next));
        setHasPreviousActivity(
          Boolean(encountersResponse.pagination?.previous),
        );
        setHasLoaded(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLoadError(
          error instanceof Error ? error.message : "Failed to load summary.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customer.id, customer.uuid, hasLoaded, isActive]);

  useEffect(() => {
    if (!isActive || !hasLoaded || !stats?.isBillingLoading) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const billingResult = await fetchCustomerBillingSummary(customer.uuid).catch(
        () => null,
      );

      if (cancelled) {
        return;
      }

      const billingCounts = billingResult
        ? extractCustomerBillingCounts(billingResult)
        : null;

      setStats((current) =>
        current
          ? {
              ...current,
              salesOrders: billingCounts?.salesOrders ?? null,
              invoices: billingCounts?.invoices ?? null,
              totals: billingResult?.totals ?? null,
              billingUnavailable: billingResult === null,
              isBillingLoading: false,
            }
          : current,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [customer.uuid, hasLoaded, isActive, stats?.isBillingLoading]);

  useEffect(() => {
    if (!isActive || !hasLoaded || billingRefreshKey === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const billingResult = await fetchCustomerBillingSummary(customer.uuid).catch(
        () => null,
      );

      if (cancelled || !billingResult) {
        return;
      }

      const billingCounts = extractCustomerBillingCounts(billingResult);
      setStats((current) =>
        current
          ? {
              ...current,
              salesOrders: billingCounts.salesOrders,
              invoices: billingCounts.invoices,
              totals: billingResult.totals,
              billingUnavailable: false,
              isBillingLoading: false,
            }
          : current,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [billingRefreshKey, customer.uuid, hasLoaded, isActive]);

  if (!isActive) {
    return null;
  }

  if (isLoading && !hasLoaded) {
    return <CustomerTabSkeleton statCards={4} rows={5} />;
  }

  if (loadError && !hasLoaded) {
    return (
      <p className="px-1 py-6 text-sm text-red-700" role="alert">
        {loadError}
      </p>
    );
  }

  const dueAmount = parseBillingAmount(stats?.totals?.total_due);
  const hasDue = dueAmount > 0;
  const isBillingLoading = Boolean(stats?.isBillingLoading);

  return (
    <div className="space-y-0" data-testid="customer-detail-summary-tab">
      <dl
        className="-mx-4 -mt-4 grid grid-cols-2 border-b border-dash-border sm:-mx-6 sm:grid-cols-4 sm:divide-x sm:divide-dash-border"
        data-testid="customer-detail-stats"
        aria-label="Client activity"
      >
        <RecordStat
          label="Visits"
          value={stats?.visits != null ? formatCompactNumber(stats.visits) : "—"}
        />
        <RecordStat
          label="Ordered"
          value={isBillingLoading ? "…" : formatCompactAmount(stats?.totals?.total_sales)}
        />
        <RecordStat
          label="Invoiced"
          value={isBillingLoading ? "…" : formatCompactAmount(stats?.totals?.total_invoiced)}
        />
        <RecordStat
          label={hasDue ? "Outstanding" : "Due"}
          value={isBillingLoading ? "…" : formatCompactAmount(stats?.totals?.total_due)}
          accent={hasDue && !isBillingLoading}
        />
      </dl>

      <div className="pt-4">
        <CustomerActivityTimeline
          encounters={encounters}
          pagination={{
            page: activityPage,
            pageSize: ACTIVITY_PAGE_SIZE,
            totalCount: activityTotalCount,
            hasPrevious: hasPreviousActivity,
            hasNext: hasNextActivity,
            onPageChange: (page) => {
              void loadActivityPage(page);
            },
            isLoading: isActivityRefreshing,
          }}
        />

        {loadError && hasLoaded ? (
          <p className="mt-2 text-xs text-red-600">{loadError}</p>
        ) : null}
      </div>
    </div>
  );
}
