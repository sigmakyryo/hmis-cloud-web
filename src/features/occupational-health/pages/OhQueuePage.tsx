"use client";

import { useState } from "react";

import type { OhQueueStatusFilter } from "@/features/occupational-health/lib/oh-visit-workspace";

import { Button } from "@/components/ui/button";
import {
  ListPageBlankState,
  ListPageLayout,
  ListPagePagination,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { OhAccessDenied } from "@/features/occupational-health/components/OhAccessDenied";
import { OhQueueEmptyState } from "@/features/occupational-health/components/OhQueueEmptyState";
import { OhQueuePageHeader } from "@/features/occupational-health/components/OhQueuePageHeader";
import { OhQueuePageSkeleton } from "@/features/occupational-health/components/OhQueuePageSkeleton";
import { OhQueueTableSkeleton } from "@/features/occupational-health/components/OhQueuePageSkeleton";
import { OhQueueTable } from "@/features/occupational-health/components/OhQueueTable";
import { useOhEncounters } from "@/features/occupational-health/hooks/use-occupational-health";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { useUser } from "@/providers/user-provider";

const DEFAULT_PAGE_SIZE = 20;

export function OhQueuePage() {
  const { userData, isLoading: isUserLoading } = useUser();
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [status, setStatus] = useState<OhQueueStatusFilter>("all");
  const [page, setPage] = useState(1);

  const {
    data = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useOhEncounters(activeSearch, status);

  const hasAccess = canAccessOccupationalHealth(userData);

  const totalCount = data.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * DEFAULT_PAGE_SIZE;
  const paginated = data.slice(pageStart, pageStart + DEFAULT_PAGE_SIZE);

  const hasActiveQuery = activeSearch.length > 0 || status !== "all";
  const hasNoRecords =
    !isLoading && !error && data.length === 0 && !hasActiveQuery;
  const isFilteredEmpty =
    !isLoading && !error && data.length === 0 && hasActiveQuery;

  function handleSearchSubmit() {
    setActiveSearch(search.trim());
    setPage(1);
  }

  function handleClearSearch() {
    setSearch("");
    setActiveSearch("");
    setStatus("all");
    setPage(1);
  }

  if (isUserLoading || isLoading) {
    return <OhQueuePageSkeleton />;
  }

  if (!hasAccess) {
    return <OhAccessDenied data-testid="oh-queue-page" />;
  }

  return (
    <ListPageLayout data-testid="oh-queue-page">
      <OhQueuePageHeader
        search={search}
        status={status}
        isLoading={isFetching}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onStatusChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
        onRefresh={() => void refetch()}
      />

      <ListPageTableSection>
        {isFetching && data.length === 0 ? (
          <OhQueueTableSkeleton rows={8} />
        ) : error ? (
          <ListPageBlankState
            compact
            tone="error"
            icon="file"
            title="Could not load OHS Queue"
            description="Failed to load occupational health encounters."
            action={
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg text-[13px]"
                onClick={() => void refetch()}
              >
                Try again
              </Button>
            }
          />
        ) : hasNoRecords ? (
          <OhQueueEmptyState onRefresh={() => void refetch()} />
        ) : isFilteredEmpty ? (
          <ListPageBlankState
            compact
            icon="search"
            title="No matching encounters"
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
            <OhQueueTable encounters={paginated} />
            <ListPagePagination
              page={currentPage}
              pageSize={DEFAULT_PAGE_SIZE}
              totalCount={totalCount}
              hasNext={currentPage < totalPages}
              hasPrevious={currentPage > 1}
              isLoading={isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </ListPageTableSection>
    </ListPageLayout>
  );
}
