"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import {
  ListPageBlankState,
  ListPageDataSectionsStack,
  ListPageLayout,
  ListPagePagination,
  ListPageStatsSection,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { useListThenStats } from "@/features/app-shell/hooks/use-list-then-stats";
import { InvoicesEmptyState } from "@/features/invoices/components/InvoicesEmptyState";
import { InvoiceSummaryStatsCards } from "@/features/invoices/components/InvoiceSummaryStatsCards";
import { InvoicesPageHeader } from "@/features/invoices/components/InvoicesPageHeader";
import { InvoicesTable } from "@/features/invoices/components/InvoicesTable";
import { InvoicesTableSkeleton } from "@/features/invoices/components/InvoicesTableSkeleton";
import {
  fetchInvoiceSummaryStats,
  fetchInvoices,
} from "@/features/invoices/services/invoices.service";
import type { Invoice } from "@/features/invoices/types/invoice.types";
import {
  buildInvoiceListFilters,
  countActiveInvoiceFilters,
  DEFAULT_INVOICE_LIST_FILTERS,
  type InvoiceListFilterState,
} from "@/features/invoices/utils/invoice-list-filters";
const DEFAULT_PAGE_SIZE = 20;

export function InvoicesListPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [filters, setFilters] = useState<InvoiceListFilterState>(
    DEFAULT_INVOICE_LIST_FILTERS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedListStatsKey, setCompletedListStatsKey] = useState<string | null>(
    null,
  );

  const statsKey = useMemo(
    () => JSON.stringify({ search: activeSearch, filters }),
    [activeSearch, filters],
  );

  const listFilters = useMemo(
    () =>
      buildInvoiceListFilters({
        search: activeSearch,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        filters,
      }),
    [activeSearch, filters, page],
  );

  const statsFilters = useMemo(
    () =>
      buildInvoiceListFilters({
        search: activeSearch,
        filters,
      }),
    [activeSearch, filters],
  );

  const hasNext = page * DEFAULT_PAGE_SIZE < totalCount;
  const hasPrevious = page > 1;

  const fetchStats = useCallback(
    () => fetchInvoiceSummaryStats(statsFilters),
    [statsFilters],
  );

  const { stats, isStatsLoading } = useListThenStats({
    statsKey,
    listCompletedKey: completedListStatsKey,
    fetchStats,
  });

  const reloadInvoices = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetchInvoices(listFilters);
      setInvoices(response.results);
      setTotalCount(response.pagination?.count ?? response.results.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setCompletedListStatsKey(statsKey);
    }
  }, [listFilters, statsKey]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setError(null);
        const response = await fetchInvoices(listFilters);
        if (cancelled) {
          return;
        }
        setInvoices(response.results);
        setTotalCount(response.pagination?.count ?? response.results.length);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load invoices.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
          setCompletedListStatsKey(statsKey);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listFilters, statsKey]);

  const handleSearchSubmit = useCallback(() => {
    setIsRefreshing(true);
    setActiveSearch(search.trim());
    setPage(1);
  }, [search]);

  const handleClearSearch = useCallback(() => {
    setIsRefreshing(true);
    setSearch("");
    setActiveSearch("");
    setPage(1);
  }, []);

  const handleClearSearchAndFilters = useCallback(() => {
    setIsRefreshing(true);
    setSearch("");
    setActiveSearch("");
    setFilters(DEFAULT_INVOICE_LIST_FILTERS);
    setPage(1);
  }, []);

  const handleFiltersApply = useCallback((nextFilters: InvoiceListFilterState) => {
    setIsRefreshing(true);
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const activeFilterCount = countActiveInvoiceFilters(filters);
  const hasActiveQuery = activeSearch.length > 0 || activeFilterCount > 0;
  const isFilteredEmpty =
    !isLoading && !error && invoices.length === 0 && hasActiveQuery;
  const hasNoRecords =
    !isLoading && !error && totalCount === 0 && !hasActiveQuery;

  return (
    <ListPageLayout
      data-testid="invoices-page"
      className="space-y-0 bg-white px-0 pt-0 md:px-0"
    >
      {hasNoRecords ? null : (
      <InvoicesPageHeader
        search={search}
        filters={filters}
        isLoading={isRefreshing}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onFiltersApply={handleFiltersApply}
      />
      )}

      <ListPageDataSectionsStack className="space-y-0">
        {!hasNoRecords ? (
          <ListPageStatsSection>
            <InvoiceSummaryStatsCards stats={stats} isLoading={isStatsLoading} />
          </ListPageStatsSection>
        ) : null}

        <ListPageTableSection>
          {isLoading ? (
            <InvoicesTableSkeleton rows={8} />
          ) : error ? (
            <ListPageBlankState
              compact
              tone="error"
              icon="file"
              title="Could not load invoices"
              description={error}
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg text-[13px]"
                  onClick={() => void reloadInvoices()}
                >
                  Try again
                </Button>
              }
            />
          ) : hasNoRecords ? (
            <InvoicesEmptyState />
          ) : isFilteredEmpty ? (
            <ListPageBlankState
              compact
              icon="search"
              title="No matching invoices"
              description="Adjust your search or filters and try again."
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg text-[13px]"
                  onClick={handleClearSearchAndFilters}
                >
                  Clear search and filters
                </Button>
              }
            />
          ) : (
            <>
              <InvoicesTable
                invoices={invoices}
                onRowClick={(invoice) => router.push(ROUTES.invoiceDetail(invoice.uuid))}
              />
              <ListPagePagination
                page={page}
                pageSize={DEFAULT_PAGE_SIZE}
                totalCount={totalCount}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                isLoading={isRefreshing}
                onPageChange={(nextPage) => {
                  setIsRefreshing(true);
                  setPage(nextPage);
                }}
              />
            </>
          )}
        </ListPageTableSection>
      </ListPageDataSectionsStack>
    </ListPageLayout>
  );
}
