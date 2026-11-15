"use client";

import { useDeferredValue, useMemo, useState } from "react";

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
import { OhQueuePageSkeleton, OhQueueTableSkeleton } from "@/features/occupational-health/components/OhQueuePageSkeleton";
import { OhQueueTable, queueWaitingMinutes } from "@/features/occupational-health/components/OhQueueTable";
import { useOhEncounters } from "@/features/occupational-health/hooks/use-occupational-health";
import {
  encounterMatchesQueue,
  OH_QUEUE_STATUS_FILTERS,
  type OhQueueStatusFilter,
} from "@/features/occupational-health/lib/oh-visit-workspace";
import type { OhVisitEncounter } from "@/features/occupational-health/types";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { useUser } from "@/providers/user-provider";

const PAGE_SIZE = 20;

function countByStatus(rows: OhVisitEncounter[]): Record<OhQueueStatusFilter, number> {
  const counts = Object.fromEntries(OH_QUEUE_STATUS_FILTERS.map((item) => [item.id, 0])) as Record<OhQueueStatusFilter, number>;
  counts.all = rows.length;
  for (const row of rows) {
    if (row.status in counts && row.status !== "all") {
      counts[row.status as OhQueueStatusFilter] += 1;
    }
  }
  return counts;
}

function longestWait(rows: OhVisitEncounter[]): number | null {
  const waits = rows.filter((row) => row.status === "waiting").flatMap((row) => queueWaitingMinutes(row) ?? []);
  return waits.length > 0 ? Math.max(...waits) : null;
}

export function OhQueuePage() {
  const { userData, isLoading: isUserLoading } = useUser();
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim());
  const [status, setStatus] = useState<OhQueueStatusFilter>("all");
  const [page, setPage] = useState(1);
  const { data = [], isLoading, isFetching, error, refetch } = useOhEncounters();

  const counts = useMemo(() => countByStatus(data), [data]);
  const rows = useMemo(() => data.filter((row) => encounterMatchesQueue(row, query, status)), [data, query, status]);

  if (isUserLoading || isLoading) {
    return <OhQueuePageSkeleton />;
  }

  if (!canAccessOccupationalHealth(userData)) {
    return <OhAccessDenied data-testid="oh-queue-page" />;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shown = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const isFiltered = query.length > 0 || status !== "all";

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setPage(1);
  }

  return (
    <ListPageLayout data-testid="oh-queue-page">
      <OhQueuePageHeader
        total={data.length}
        longestWait={longestWait(data)}
        counts={counts}
        search={search}
        status={status}
        isRefreshing={isFetching}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onClearSearch={() => {
          setSearch("");
          setPage(1);
        }}
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
            title="Could not load the queue"
            description="The occupational health visits did not load."
            action={
              <Button type="button" variant="outline" className="h-8 rounded-lg text-[13px]" onClick={() => void refetch()}>
                Try again
              </Button>
            }
          />
        ) : data.length === 0 ? (
          <OhQueueEmptyState onRefresh={() => void refetch()} />
        ) : rows.length === 0 && isFiltered ? (
          <ListPageBlankState
            compact
            icon="search"
            title="Nobody matches"
            description="No visit matches this search or status."
            action={
              <Button type="button" variant="outline" className="h-8 rounded-lg text-[13px]" onClick={clearFilters}>
                Show everyone
              </Button>
            }
          />
        ) : (
          <>
            <OhQueueTable encounters={shown} />
            {rows.length > PAGE_SIZE ? (
              <ListPagePagination
                page={currentPage}
                pageSize={PAGE_SIZE}
                totalCount={rows.length}
                hasNext={currentPage < totalPages}
                hasPrevious={currentPage > 1}
                isLoading={isFetching}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </ListPageTableSection>
    </ListPageLayout>
  );
}
