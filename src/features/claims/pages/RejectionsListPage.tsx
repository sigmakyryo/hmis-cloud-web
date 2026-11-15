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
import { RejectionsEmptyState } from "@/features/claims/components/RejectionsEmptyState";
import { RejectionsPageHeader } from "@/features/claims/components/RejectionsPageHeader";
import { RejectionSummaryStatsCards } from "@/features/claims/components/RejectionSummaryStatsCards";
import { RejectionsTable } from "@/features/claims/components/RejectionsTable";
import { RejectionsTableSkeleton } from "@/features/claims/components/RejectionsTableSkeleton";
import {
  fetchRemittanceRejections,
  fetchRemittanceRejectionSummaryStats,
} from "@/features/claims/services/rejections.service";
import type { RemittanceRejectionRow } from "@/features/claims/types/remittances.types";
import {
  buildRejectionListFilters,
  countActiveRejectionFilters,
  DEFAULT_REJECTION_LIST_FILTERS,
  type RejectionListFilterState,
} from "@/features/claims/utils/rejection-list-filters";
const DEFAULT_PAGE_SIZE = 20;

export function RejectionsListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<RemittanceRejectionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [filters, setFilters] = useState<RejectionListFilterState>(
    DEFAULT_REJECTION_LIST_FILTERS,
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
      buildRejectionListFilters({
        search: activeSearch,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        filters,
      }),
    [activeSearch, filters, page],
  );

  const statsFilters = useMemo(
    () =>
      buildRejectionListFilters({
        search: activeSearch,
        filters,
      }),
    [activeSearch, filters],
  );

  const hasNext = page * DEFAULT_PAGE_SIZE < totalCount;
  const hasPrevious = page > 1;

  const fetchStats = useCallback(
    () => fetchRemittanceRejectionSummaryStats(statsFilters),
    [statsFilters],
  );

  const { stats, isStatsLoading } = useListThenStats({
    statsKey,
    listCompletedKey: completedListStatsKey,
    fetchStats,
  });

  const reload = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetchRemittanceRejections(listFilters);
      setRows(response.results);
      setTotalCount(response.pagination?.count ?? response.results.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rejections.");
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
        const response = await fetchRemittanceRejections(listFilters);
        if (cancelled) {
          return;
        }
        setRows(response.results);
        setTotalCount(response.pagination?.count ?? response.results.length);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load rejections.");
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
    setFilters(DEFAULT_REJECTION_LIST_FILTERS);
    setPage(1);
  }, []);

  const handleFiltersApply = useCallback((nextFilters: RejectionListFilterState) => {
    setIsRefreshing(true);
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const activeFilterCount = countActiveRejectionFilters(filters);
  const hasActiveQuery = activeSearch.length > 0 || activeFilterCount > 0;
  const isFilteredEmpty =
    !isLoading && !error && rows.length === 0 && hasActiveQuery;
  const hasNoRecords =
    !isLoading && !error && totalCount === 0 && !hasActiveQuery;

  return (
    <ListPageLayout fill data-testid="rejections-list-page">
      <RejectionsPageHeader
        search={search}
        filters={filters}
        isLoading={isRefreshing}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onFiltersApply={handleFiltersApply}
      />

      <ListPageDataSectionsStack className="space-y-0">
        {!hasNoRecords ? (
          <ListPageStatsSection>
            <RejectionSummaryStatsCards stats={stats} isLoading={isStatsLoading} />
          </ListPageStatsSection>
        ) : null}

        <ListPageTableSection>
          {isLoading ? (
            <RejectionsTableSkeleton rows={8} />
          ) : error ? (
            <ListPageBlankState
              compact
              tone="error"
              icon="file"
              title="Could not load rejections"
              description={error}
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg text-[13px]"
                  onClick={() => void reload()}
                >
                  Try again
                </Button>
              }
            />
          ) : hasNoRecords ? (
            <RejectionsEmptyState />
          ) : isFilteredEmpty ? (
            <ListPageBlankState
              compact
              icon="search"
              title="No matching rejections"
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
              <RejectionsTable
                rows={rows}
                onRowClick={(row) =>
                  router.push(ROUTES.remittanceDetail(row.batch_uuid))
                }
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
