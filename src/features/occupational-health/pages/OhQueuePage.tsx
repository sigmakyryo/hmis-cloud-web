"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { ALL_EMPLOYERS } from "@/features/occupational-health/components/OhQueueFilters";
import { OhQueueBoard } from "@/features/occupational-health/components/OhQueueBoard";
import { OhQueueLeftOpen } from "@/features/occupational-health/components/OhQueueLeftOpen";
import { OhQueuePageHeader, type OhQueueView } from "@/features/occupational-health/components/OhQueuePageHeader";
import { OhQueuePageSkeleton, OhQueueTableSkeleton } from "@/features/occupational-health/components/OhQueuePageSkeleton";
import { OhQueueTable } from "@/features/occupational-health/components/OhQueueTable";
import { buildQueueBoard } from "@/features/occupational-health/lib/oh-queue-board";
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

export function OhQueuePage() {
  const { userData, isLoading: isUserLoading } = useUser();
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim());
  const [status, setStatus] = useState<OhQueueStatusFilter>("all");
  const [employer, setEmployer] = useState(ALL_EMPLOYERS);
  const [page, setPage] = useState(1);
  const { data = [], isLoading, isFetching, error, refetch } = useOhEncounters();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view: OhQueueView = searchParams.get("view") === "list" ? "list" : "board";
  const employers = useMemo(
    () => [...new Set(data.flatMap((row) => (row.employer_name?.trim() ? [row.employer_name.trim()] : [])))].sort((a, b) => a.localeCompare(b)),
    [data],
  );
  const forEmployer = useMemo(
    () => (employer === ALL_EMPLOYERS ? data : data.filter((row) => row.employer_name?.trim() === employer)),
    [data, employer],
  );
  const searched = useMemo(() => forEmployer.filter((row) => encounterMatchesQueue(row, query, "all")), [forEmployer, query]);
  const board = useMemo(() => buildQueueBoard(searched), [searched]);

  function changeView(next: OhQueueView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "board") params.delete("view");
    else params.set("view", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const counts = useMemo(() => countByStatus(forEmployer), [forEmployer]);
  const rows = useMemo(() => forEmployer.filter((row) => encounterMatchesQueue(row, query, status)), [forEmployer, query, status]);

  if (isUserLoading || isLoading) {
    return <OhQueuePageSkeleton />;
  }

  if (!canAccessOccupationalHealth(userData)) {
    return <OhAccessDenied data-testid="oh-queue-page" />;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shown = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const isFiltered = query.length > 0 || employer !== ALL_EMPLOYERS || (view === "list" && status !== "all");
  const nothingMatches = isFiltered && (view === "board" ? searched.length === 0 : rows.length === 0);

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setEmployer(ALL_EMPLOYERS);
    setPage(1);
  }

  return (
    <ListPageLayout data-testid="oh-queue-page">
      <OhQueuePageHeader
        view={view}
        onViewChange={changeView}
        counts={counts}
        employers={employers}
        employer={employer}
        onEmployerChange={(next) => {
          setEmployer(next);
          setPage(1);
        }}
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
        ) : nothingMatches ? (
          <ListPageBlankState
            compact
            icon="search"
            title="Nobody matches"
            description="No visit matches this search and these filters."
            action={
              <Button type="button" variant="outline" className="h-8 rounded-lg text-[13px]" onClick={clearFilters}>
                Show everyone
              </Button>
            }
          />
        ) : view === "board" ? (
          <div className="space-y-6 px-5 pt-5 pb-10 md:px-8">
            <OhQueueLeftOpen rows={board.stale} />
            <OhQueueBoard board={board} />
          </div>
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
