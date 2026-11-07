"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
import { ClaimsEmptyState } from "@/features/claims/components/ClaimsEmptyState";
import { ClaimsPageHeader } from "@/features/claims/components/ClaimsPageHeader";
import { ClaimSummaryStatsCards } from "@/features/claims/components/ClaimSummaryStatsCards";
import { ClaimsTable } from "@/features/claims/components/ClaimsTable";
import { ClaimsTableSkeleton } from "@/features/claims/components/ClaimsTableSkeleton";
import {
  fetchClaimSummaryStats,
  fetchClaims,
} from "@/features/claims/services/claims.service";
import type { ClaimListItem } from "@/features/claims/types/claims.types";
import {
  buildClaimListFilters,
  countActiveClaimFilters,
  DEFAULT_CLAIM_LIST_FILTERS,
  type ClaimListFilterState,
} from "@/features/claims/utils/claim-list-filters";
const DEFAULT_PAGE_SIZE = 20;

function isClaimStatusFilter(
  value: string | null,
): value is ClaimListFilterState["status"] {
  return (
    value === "draft" ||
    value === "submitted" ||
    value === "approved" ||
    value === "rejected" ||
    value === "cancelled"
  );
}

function filtersFromSearchParams(
  params: URLSearchParams,
): ClaimListFilterState {
  const status = params.get("status");
  const attention = params.get("attention");
  return {
    status: isClaimStatusFilter(status) ? status : "all",
    attention:
      attention === "ready" || attention === "needs_attention"
        ? attention
        : "all",
  };
}

export function ClaimsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [claims, setClaims] = useState<ClaimListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [pageForQuery, setPageForQuery] = useState(searchParams.toString());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedListStatsKey, setCompletedListStatsKey] = useState<string | null>(
    null,
  );
  const queryKey = searchParams.toString();
  const filters = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );
  const currentPage = pageForQuery === queryKey ? page : 1;

  const statsKey = useMemo(
    () => JSON.stringify({ search: activeSearch, filters }),
    [activeSearch, filters],
  );

  const listFilters = useMemo(
    () =>
      buildClaimListFilters({
        search: activeSearch,
        page: currentPage,
        pageSize: DEFAULT_PAGE_SIZE,
        filters,
      }),
    [activeSearch, currentPage, filters],
  );

  const statsFilters = useMemo(
    () =>
      buildClaimListFilters({
        search: activeSearch,
        filters,
      }),
    [activeSearch, filters],
  );

  const hasNext = currentPage * DEFAULT_PAGE_SIZE < totalCount;
  const hasPrevious = currentPage > 1;

  const replaceFilterParams = useCallback(
    (nextFilters: ClaimListFilterState) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextFilters.status === "all") {
        params.delete("status");
      } else {
        params.set("status", nextFilters.status);
      }
      if (nextFilters.attention === "all") {
        params.delete("attention");
      } else {
        params.set("attention", nextFilters.attention);
      }
      const query = params.toString();
      router.replace(query ? `${ROUTES.claims}?${query}` : ROUTES.claims);
    },
    [router, searchParams],
  );

  const fetchStats = useCallback(
    () => fetchClaimSummaryStats(statsFilters),
    [statsFilters],
  );

  const { stats, isStatsLoading } = useListThenStats({
    statsKey,
    listCompletedKey: completedListStatsKey,
    fetchStats,
  });

  const reloadClaims = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetchClaims(listFilters);
      setClaims(response.results);
      setTotalCount(response.pagination?.count ?? response.results.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claims.");
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
        const response = await fetchClaims(listFilters);
        if (cancelled) {
          return;
        }
        setClaims(response.results);
        setTotalCount(response.pagination?.count ?? response.results.length);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load claims.");
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
    setPageForQuery(queryKey);
  }, [queryKey, search]);

  const handleClearSearch = useCallback(() => {
    setIsRefreshing(true);
    setSearch("");
    setActiveSearch("");
    setPage(1);
    setPageForQuery(queryKey);
  }, [queryKey]);

  const handleClearSearchAndFilters = useCallback(() => {
    setIsRefreshing(true);
    setSearch("");
    setActiveSearch("");
    setPage(1);
    replaceFilterParams(DEFAULT_CLAIM_LIST_FILTERS);
  }, [replaceFilterParams]);

  const handleFiltersApply = useCallback((nextFilters: ClaimListFilterState) => {
    setIsRefreshing(true);
    setPage(1);
    replaceFilterParams(nextFilters);
  }, [replaceFilterParams]);

  const activeFilterCount = countActiveClaimFilters(filters);
  const hasActiveQuery = activeSearch.length > 0 || activeFilterCount > 0;
  const isFilteredEmpty =
    !isLoading && !error && claims.length === 0 && hasActiveQuery;
  const hasNoRecords =
    !isLoading && !error && totalCount === 0 && !hasActiveQuery;

  return (
    <ListPageLayout data-testid="claims-list-page">
      <ClaimsPageHeader
        search={search}
        filters={filters}
        isLoading={isRefreshing}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onFiltersApply={handleFiltersApply}
      />

      {!hasNoRecords ? (
        <ListPageDataSectionsStack className="space-y-0">
          <ListPageStatsSection>
            <ClaimSummaryStatsCards stats={stats} isLoading={isStatsLoading} />
          </ListPageStatsSection>

          <ListPageTableSection>
            {isLoading ? (
              <ClaimsTableSkeleton rows={8} />
            ) : error ? (
              <ListPageBlankState
                compact
                tone="error"
                icon="file"
                title="Could not load claims"
                description={error}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg text-[13px]"
                    onClick={() => void reloadClaims()}
                  >
                    Try again
                  </Button>
                }
              />
            ) : isFilteredEmpty ? (
              <ListPageBlankState
                compact
                icon="search"
                title="No matching claims"
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
                <ClaimsTable
                  claims={claims}
                  onRowClick={(claim) => router.push(ROUTES.claimDetail(claim.uuid))}
                />
                <ListPagePagination
                  page={currentPage}
                  pageSize={DEFAULT_PAGE_SIZE}
                  totalCount={totalCount}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  isLoading={isRefreshing}
                  onPageChange={(nextPage) => {
                    setIsRefreshing(true);
                    setPage(nextPage);
                    setPageForQuery(queryKey);
                  }}
                />
              </>
            )}
          </ListPageTableSection>
        </ListPageDataSectionsStack>
      ) : (
        <ListPageTableSection>
          {isLoading ? (
            <ClaimsTableSkeleton rows={8} />
          ) : error ? (
            <ListPageBlankState
  compact
  tone="error"
  icon="file"
  title="Could not load claims"
  description={error}
  action={
    <Button
      type="button"
      variant="outline"
      className="h-8 rounded-lg text-[13px]"
      onClick={() => void reloadClaims()}
    >
      Try again
    </Button>
  }
/>
          ) : (
            <ClaimsEmptyState />
          )}
        </ListPageTableSection>
      )}
    </ListPageLayout>
  );
}
