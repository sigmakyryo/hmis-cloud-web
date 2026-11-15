"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  ListPageBlankState,
  ListPageLayout,
  ListPagePagination,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { OpdQueueBoard } from "@/features/clinical-opd/components/OpdQueueBoard";
import { OpdQueueEmptyState } from "@/features/clinical-opd/components/OpdQueueEmptyState";
import { OpdQueueList } from "@/features/clinical-opd/components/OpdQueueList";
import { OpdQueuePageHeader } from "@/features/clinical-opd/components/OpdQueuePageHeader";
import { OpdQueuePageSkeleton } from "@/features/clinical-opd/components/OpdQueuePageSkeleton";
import { OpdQueueTableSkeleton } from "@/features/clinical-opd/components/OpdQueueTableSkeleton";
import { OpdQueueTable } from "@/features/clinical-opd/components/tables/OpdQueueTable";
import { useMyClinicalCapabilities } from "@/features/clinical-opd/hooks/use-clinical-opd";
import type { OpdQueueEncounter } from "@/features/clinical-opd/types/clinical-opd.types";
import { sortOpdQueueNewestFirst } from "@/features/clinical-opd/utils/opd-queue-stage";
import {
  DEFAULT_OPD_QUEUE_VIEW_MODE,
  readClinicalQueueViewMode,
  subscribeClinicalQueueView,
  writeClinicalQueueViewMode,
  type OpdQueueViewMode,
} from "@/features/clinical-opd/utils/opd-queue-views";
import { ClinicalDepartmentSwitcher } from "@/features/clinical-workspace/components/ClinicalDepartmentSwitcher";
import { ClinicalNoDepartmentsState } from "@/features/clinical-workspace/components/ClinicalNoDepartmentsState";
import {
  useMemberDepartments,
  useSpecialtyQueue,
} from "@/features/clinical-workspace/hooks/use-clinical-departments";
import { useSelectedDepartment } from "@/features/clinical-workspace/hooks/use-selected-department";
import type { ClinicalWorkspaceRouting } from "@/features/clinical-workspace/types/clinical-workspace.types";
import { workspaceLandingHref } from "@/features/clinical-workspace/utils/workspace-tabs";
import { useUser } from "@/providers/user-provider";

const DEFAULT_PAGE_SIZE = 20;

type ClinicalQueuePageProps = {
  routing: ClinicalWorkspaceRouting;
};

/** Queue of the user's departments of one specialty (OPD, Dental, ...). */
export function ClinicalQueuePage({ routing }: ClinicalQueuePageProps) {
  const { specialty } = routing;
  const { userData, isLoading: isUserLoading } = useUser();
  const { data: capabilitiesData } = useMyClinicalCapabilities();
  const departmentsQuery = useMemberDepartments(specialty.code);
  const departments = departmentsQuery.data ?? [];
  const { selectedDepartment, selectDepartment } =
    useSelectedDepartment(departments);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const viewMode = useSyncExternalStore(
    subscribeClinicalQueueView,
    () => readClinicalQueueViewMode(specialty.code),
    () => DEFAULT_OPD_QUEUE_VIEW_MODE,
  );

  const {
    data = [],
    isLoading: isQueueLoading,
    isFetching,
    error,
    refetch,
  } = useSpecialtyQueue(
    specialty.code,
    {
      departmentUuid: selectedDepartment?.uuid ?? null,
      search: activeSearch || undefined,
    },
    departments.length > 0,
  );

  const landingHref = (encounter: OpdQueueEncounter) =>
    workspaceLandingHref(
      routing,
      encounter.visit_uuid,
      encounter.encounter_uuid,
      capabilitiesData?.capabilities ?? [],
      userData?.user_role,
    );

  const hasAccess = (userData?.groups ?? []).includes(specialty.accessGroup);
  const isLoading = departmentsQuery.isLoading || isQueueLoading;

  const sortedEncounters = sortOpdQueueNewestFirst(data);
  const totalCount = sortedEncounters.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * DEFAULT_PAGE_SIZE;
  const paginatedEncounters = sortedEncounters.slice(
    pageStart,
    pageStart + DEFAULT_PAGE_SIZE,
  );
  const hasNext = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  const hasActiveQuery = activeSearch.length > 0;
  const hasNoRecords = !isLoading && !error && data.length === 0 && !hasActiveQuery;
  const isFilteredEmpty =
    !isLoading && !error && data.length === 0 && hasActiveQuery;

  function handleSearchSubmit() {
    setActiveSearch(search.trim());
    setPage(1);
  }

  function handleClearSearch() {
    setSearch("");
    setActiveSearch("");
    setPage(1);
  }

  function handleViewModeChange(nextMode: OpdQueueViewMode) {
    writeClinicalQueueViewMode(specialty.code, nextMode);
    setPage(1);
  }

  function handleDepartmentChange(departmentUuid: string | null) {
    selectDepartment(departmentUuid);
    setPage(1);
  }

  if (isUserLoading || (hasAccess && isLoading && departments.length === 0)) {
    return <OpdQueuePageSkeleton />;
  }

  if (!hasAccess) {
    return (
      <ListPageLayout data-testid="opd-queue-page">
        <ListPageBlankState
  compact
  icon="shield"
  title="Access denied"
  description={`You do not have access to the ${specialty.label} module.`}
/>
      </ListPageLayout>
    );
  }

  if (departmentsQuery.isSuccess && departments.length === 0) {
    return (
      <ListPageLayout data-testid="opd-queue-page">
        <ClinicalNoDepartmentsState specialtyLabel={specialty.label} />
      </ListPageLayout>
    );
  }

  return (
    <ListPageLayout
      fill={viewMode === "table"}
      data-testid="opd-queue-page"
      className={viewMode === "board" ? "overflow-hidden pb-3" : undefined}
    >
      <OpdQueuePageHeader
        search={search}
        viewMode={viewMode}
        isLoading={isFetching}
        departmentSwitcher={
          <ClinicalDepartmentSwitcher
            departments={departments}
            value={selectedDepartment?.uuid ?? null}
            onChange={handleDepartmentChange}
            specialtyLabel={specialty.label}
          />
        }
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onViewModeChange={handleViewModeChange}
        onRefresh={() => void refetch()}
      />

      <ListPageTableSection
        className={
          viewMode === "board" ? "flex min-h-0 flex-1 flex-col" : undefined
        }
      >
        {isLoading ? (
          <OpdQueueTableSkeleton rows={8} />
        ) : error ? (
          <ListPageBlankState
  compact
  tone="error"
  icon="file"
  title={`Could not load ${specialty.label} queue`}
  description={`Failed to load ${specialty.label} queue.`}
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
          <OpdQueueEmptyState
            onRefresh={() => void refetch()}
            title={`No ${specialty.label} encounters in queue`}
            description={specialty.queueEmptyDescription}
          />
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
            {viewMode === "board" ? (
              <OpdQueueBoard
                encounters={sortedEncounters}
                encounterHref={landingHref}
              />
            ) : viewMode === "list" ? (
              <OpdQueueList encounters={data} encounterHref={landingHref} />
            ) : (
              <OpdQueueTable
                encounters={paginatedEncounters}
                encounterHref={landingHref}
              />
            )}
            {viewMode === "table" ? (
              <ListPagePagination
                page={currentPage}
                pageSize={DEFAULT_PAGE_SIZE}
                totalCount={totalCount}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
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
