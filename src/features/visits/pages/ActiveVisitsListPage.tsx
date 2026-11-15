"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ListPageBlankState,
  ListPageDataSectionsStack,
  ListPageLayout,
  ListPagePagination,
  ListPageStatsSection,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { useMyClinicalCapabilities } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { clinicalEncounterLandingHref } from "@/features/visits/utils/clinical-encounter-links";
import { InventoryListAccessDenied } from "@/features/inventory/components/list/InventoryListAccessDenied";
import { ActiveVisitsEmptyState } from "@/features/visits/components/ActiveVisitsEmptyState";
import { ActiveVisitsPageHeader } from "@/features/visits/components/ActiveVisitsPageHeader";
import { ActiveVisitsTable } from "@/features/visits/components/tables/active-visits-table";
import { ActiveVisitsTableSkeleton } from "@/features/visits/components/ActiveVisitsTableSkeleton";
import { AddVisitEncounterDialog } from "@/features/visits/components/AddVisitEncounterDialog";
import { VisitDetailDialog } from "@/features/visits/components/VisitDetailDialog";
import { VisitQueueSummaryCards } from "@/features/visits/components/VisitQueueSummaryCards";
import { useVisitsList } from "@/features/visits/hooks/use-visits-list";
import {
  fetchVisitQueueSummary,
  fetchVisits,
} from "@/features/visits/services/visits.service";
import type {
  VisitDetail,
  VisitEncounter,
  VisitQueueSummary,
} from "@/features/visits/types/visit.types";
import {
  countActiveVisitFilters,
  DEFAULT_ACTIVE_VISIT_FILTERS,
  type ActiveVisitListFilterState,
} from "@/features/visits/utils/visit-list-filters";
import { useUser } from "@/providers/user-provider";

export function ActiveVisitsListPage() {
  const router = useRouter();
  const { userData } = useUser();
  const { data: capabilitiesData } = useMyClinicalCapabilities();
  const [selectedVisitUuid, setSelectedVisitUuid] = useState<string | null>(null);
  const [addEncounterVisit, setAddEncounterVisit] = useState<VisitDetail | null>(
    null,
  );
  const [isAddEncounterOpen, setIsAddEncounterOpen] = useState(false);
  const [stats, setStats] = useState<VisitQueueSummary | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [filters, setFilters] = useState<ActiveVisitListFilterState>(
    DEFAULT_ACTIVE_VISIT_FILTERS,
  );
  const extraFilters = useMemo(
    () => ({
      clinicUuid: filters.clinicUuid || undefined,
    }),
    [filters],
  );
  const hasActiveFilters = countActiveVisitFilters(filters) > 0;
  const fetchFn = useCallback(
    (listFilters: Parameters<typeof fetchVisits>[0]) =>
      fetchVisits({ ...listFilters, status: "active", isActive: true }),
    [],
  );

  const {
    items,
    totalCount,
    page,
    pageSize,
    search,
    isLoading,
    isRefreshing,
    error,
    isUnauthorized,
    hasNext,
    hasPrevious,
    hasNoRecords,
    isFilteredEmpty,
    setSearch,
    handleSearchSubmit,
    handleClearSearch,
    reload,
    handlePageChange,
    resetPage,
  } = useVisitsList<VisitDetail>({ fetchFn, extraFilters, hasActiveFilters });

  const reloadStats = useCallback(async () => {
    try {
      const summary = await fetchVisitQueueSummary();
      setStats(summary);
    } catch {
      setStats(null);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const summary = await fetchVisitQueueSummary();
        if (!cancelled) {
          setStats(summary);
        }
      } catch {
        if (!cancelled) {
          setStats(null);
        }
      } finally {
        if (!cancelled) {
          setIsStatsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFiltersApply = useCallback(
    (nextFilters: ActiveVisitListFilterState) => {
      setFilters(nextFilters);
      resetPage();
    },
    [resetPage],
  );

  const handleClearSearchAndFilters = useCallback(() => {
    handleClearSearch();
    handleFiltersApply(DEFAULT_ACTIVE_VISIT_FILTERS);
  }, [handleClearSearch, handleFiltersApply]);

  const handleRowClick = useCallback((visit: VisitDetail) => {
    setSelectedVisitUuid(visit.uuid);
  }, []);

  const handleAddEncounter = useCallback((visit: VisitDetail) => {
    setAddEncounterVisit(visit);
    setIsAddEncounterOpen(true);
  }, []);

  const handleReload = useCallback(async () => {
    await Promise.all([reload(), reloadStats()]);
  }, [reload, reloadStats]);

  const handleEncounterCreated = useCallback(
    async (created: VisitEncounter) => {
      setIsAddEncounterOpen(false);
      setAddEncounterVisit(null);
      await handleReload();

      const landingHref = clinicalEncounterLandingHref(
        created.department_type,
        created.visit,
        created.uuid,
        capabilitiesData?.capabilities ?? [],
        userData?.user_role,
      );
      if (landingHref) {
        router.push(landingHref);
      }
    },
    [
      capabilitiesData?.capabilities,
      handleReload,
      router,
      userData?.user_role,
    ],
  );

  if (isUnauthorized) {
    return <InventoryListAccessDenied />;
  }

  return (
    <>
      <ListPageLayout fill data-testid="active-visits-page">
        {hasNoRecords ? null : (
          <ActiveVisitsPageHeader
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
              <VisitQueueSummaryCards stats={stats} isLoading={isStatsLoading} />
            </ListPageStatsSection>
          ) : null}

          <ListPageTableSection>
            {isLoading ? (
              <ActiveVisitsTableSkeleton rows={8} />
            ) : error ? (
              <ListPageBlankState
                compact
                tone="error"
                icon="file"
                title="Could not load active visits"
                description={error}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg text-[13px]"
                    onClick={() => void handleReload()}
                  >
                    Try again
                  </Button>
                }
              />
            ) : hasNoRecords ? (
              <ActiveVisitsEmptyState />
            ) : isFilteredEmpty ? (
              <ListPageBlankState
                compact
                icon="search"
                title="No matching active visits"
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
                <ActiveVisitsTable
                  visits={items}
                  onRowClick={handleRowClick}
                  onAddEncounter={handleAddEncounter}
                />
                <ListPagePagination
                  page={page}
                  pageSize={pageSize}
                  totalCount={totalCount}
                  hasNext={hasNext}
                  hasPrevious={hasPrevious}
                  isLoading={isRefreshing}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </ListPageTableSection>
        </ListPageDataSectionsStack>
      </ListPageLayout>

      <VisitDetailDialog
        visitUuid={selectedVisitUuid}
        open={Boolean(selectedVisitUuid)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVisitUuid(null);
          }
        }}
        onVisitUpdated={() => void handleReload()}
      />

      {addEncounterVisit ? (
        <AddVisitEncounterDialog
          visit={addEncounterVisit}
          open={isAddEncounterOpen}
          onOpenChange={(open) => {
            setIsAddEncounterOpen(open);
            if (!open) {
              setAddEncounterVisit(null);
            }
          }}
          onCreated={(encounter) => {
            void handleEncounterCreated(encounter);
          }}
        />
      ) : null}
    </>
  );
}
