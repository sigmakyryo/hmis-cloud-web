"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ListPageBlankState,
  ListPageLayout,
  ListPagePagination,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { PharmacyHistoryEmptyState } from "@/features/dispensation/components/PharmacyHistoryEmptyState";
import { PharmacyHistoryPageHeader } from "@/features/dispensation/components/PharmacyHistoryPageHeader";
import { PharmacyHistoryTable } from "@/features/dispensation/components/PharmacyHistoryTable";
import { PharmacyHistoryTableSkeleton } from "@/features/dispensation/components/PharmacyHistoryTableSkeleton";
import { fetchDispensations } from "@/features/dispensation/services/dispensation.service";
import type { Dispensation } from "@/features/dispensation/types/dispensation.types";

const PAGE_SIZE = 20;

export function PharmacyHistoryPage() {
  const [items, setItems] = useState<Dispensation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextFromPage, setHasNextFromPage] = useState(false);

  const reload = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetchDispensations({
        page,
        page_size: PAGE_SIZE,
        search: activeSearch || undefined,
      });
      const results = response.results ?? [];
      setItems(results);
      setTotalCount(
        response.count ?? (page - 1) * PAGE_SIZE + results.length,
      );
      setHasNextFromPage(
        response.next != null
          ? Boolean(response.next)
          : response.count != null
            ? page * PAGE_SIZE < response.count
            : results.length === PAGE_SIZE,
      );
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load dispensation history.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeSearch, page]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetchDispensations({
          page,
          page_size: PAGE_SIZE,
          search: activeSearch || undefined,
        });
        if (cancelled) {
          return;
        }
        const results = response.results ?? [];
        setItems(results);
        setTotalCount(
          response.count ?? (page - 1) * PAGE_SIZE + results.length,
        );
        setHasNextFromPage(
          response.next != null
            ? Boolean(response.next)
            : response.count != null
              ? page * PAGE_SIZE < response.count
              : results.length === PAGE_SIZE,
        );
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load dispensation history.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSearch, page]);

  function handleSearchSubmit() {
    setIsRefreshing(true);
    setActiveSearch(search.trim());
    setPage(1);
  }

  function handleClearSearch() {
    setIsRefreshing(true);
    setSearch("");
    setActiveSearch("");
    setPage(1);
  }

  const hasActiveQuery = activeSearch.length > 0;
  const isFilteredEmpty =
    !isLoading && !error && items.length === 0 && hasActiveQuery;
  const hasNoRecords =
    !isLoading && !error && items.length === 0 && !hasActiveQuery;
  const hasPrevious = page > 1;

  return (
    <ListPageLayout fill data-testid="pharmacy-history-page">
      <PharmacyHistoryPageHeader
        search={search}
        isLoading={isRefreshing}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
      />

      <ListPageTableSection>
        {isLoading ? (
          <PharmacyHistoryTableSkeleton rows={8} />
        ) : error ? (
          <ListPageBlankState
  compact
  tone="error"
  icon="file"
  title="Could not load dispensation history"
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
          <PharmacyHistoryEmptyState />
        ) : isFilteredEmpty ? (
          <ListPageBlankState
  compact
  icon="search"
  title="No matching dispensations"
  description="Adjust your search and try again."
  action={
    <Button
      type="button"
      variant="outline"
      className="h-8 rounded-lg text-[13px]"
      onClick={handleClearSearch}
    >
      Clear search
    </Button>
  }
/>
        ) : (
          <>
            <PharmacyHistoryTable items={items} />
            <ListPagePagination
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              hasNext={hasNextFromPage}
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
    </ListPageLayout>
  );
}
