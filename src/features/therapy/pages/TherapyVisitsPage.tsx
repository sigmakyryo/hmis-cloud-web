"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/constants/routes";
import {
  ListPageBlankState,
  ListPageDataSectionsStack,
  ListPageHeaderMobileSearch,
  ListPageHeaderSection,
  ListPageHeaderTitleBlock,
  ListPageHeaderTopRow,
  ListPageLayout,
  ListPagePagination,
  ListPageStatsSection,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import {
  ACTIVE_CLINIC_CHANGE_EVENT,
  readActiveClinicId,
} from "@/features/app-shell/utils/active-clinic";
import {
  type TherapyQueueTab,
} from "@/features/therapy/components/TherapyQueueTabs";
import { TherapyVisitSummaryCards } from "@/features/therapy/components/TherapyVisitSummaryCards";
import { TherapyVisitsTable } from "@/features/therapy/components/TherapyVisitsTable";
import { TherapyVisitsToolbar } from "@/features/therapy/components/TherapyVisitsToolbar";
import {
  fetchTherapyDepartments,
  fetchTherapyVisits,
} from "@/features/therapy/services/therapy.service";
import { fetchVisitQueueSummary } from "@/features/visits/services/visits.service";
import type {
  TherapyDepartment,
  TherapyDiscipline,
  TherapyVisit,
  TherapyVisitQueueStats,
} from "@/features/therapy/types/therapy.types";
import {
  canAccessTherapyDiscipline,
  THERAPY_DISCIPLINE_CONFIG,
} from "@/features/therapy/utils/therapy-access";
import { useUser } from "@/providers/user-provider";

const DEFAULT_PAGE_SIZE = 20;

export function TherapyVisitsPage({
  discipline,
}: {
  discipline: TherapyDiscipline;
}) {
  const { userData, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const [activeClinicId, setActiveClinicId] = useState<number | null>(() =>
    readActiveClinicId(),
  );
  const [departments, setDepartments] = useState<TherapyDepartment[]>([]);
  const [departmentUuid, setDepartmentUuid] = useState("");
  const [visits, setVisits] = useState<TherapyVisit[]>([]);
  const [stats, setStats] = useState<TherapyVisitQueueStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TherapyQueueTab>("active");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const config = THERAPY_DISCIPLINE_CONFIG[discipline];
  const hasAccess = canAccessTherapyDiscipline(
    userData?.groups ?? [],
    discipline,
  );

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    let cancelled = false;
    async function applyClinic() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      const fallbackClinicId =
        userData?.clinics?.find((clinic) => clinic.is_primary && clinic.is_active)
          ?.clinic ??
        userData?.clinics?.find((clinic) => clinic.is_active)?.clinic ??
        userData?.primary_clinic?.id ??
        null;

      setActiveClinicId((current) => current ?? fallbackClinicId);
    }

    void applyClinic();
    return () => {
      cancelled = true;
    };
  }, [isUserLoading, userData]);

  useEffect(() => {
    function handleClinicChange(event: Event) {
      const clinicId = (event as CustomEvent<number>).detail;
      setActiveClinicId(clinicId);
    }

    window.addEventListener(ACTIVE_CLINIC_CHANGE_EVENT, handleClinicChange);
    return () => {
      window.removeEventListener(ACTIVE_CLINIC_CHANGE_EVENT, handleClinicChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDepartments() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      if (isUserLoading || !hasAccess || !activeClinicId) {
        setDepartments([]);
        setDepartmentUuid("");
        setIsLoadingDepartments(false);
        return;
      }

      setIsLoadingDepartments(true);
      setError(null);
      setVisits([]);
      setStats(null);
      setPage(1);
      setTotalCount(0);
      setHasNext(false);
      setHasPrevious(false);
      setDepartmentUuid("");

      try {
        const records = await fetchTherapyDepartments(discipline, activeClinicId);
        if (cancelled) {
          return;
        }
        setDepartments(records);
        setDepartmentUuid((current) => current || records[0]?.uuid || "");
      } catch (fetchError: unknown) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Could not load therapy departments.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDepartments(false);
        }
      }
    }

    void loadDepartments();
    return () => {
      cancelled = true;
    };
  }, [activeClinicId, discipline, hasAccess, isUserLoading]);

  useEffect(() => {
    let cancelled = false;

    async function loadVisits() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      if (!hasAccess || !activeClinicId || !departmentUuid) {
        setVisits([]);
        return;
      }

      setIsLoadingVisits(true);
      setError(null);

      try {
        const response = await fetchTherapyVisits({
          discipline,
          activeClinicId,
          departmentUuid,
          page,
          pageSize: DEFAULT_PAGE_SIZE,
          search: activeSearch,
          status: activeTab === "active" ? "active" : "all",
        });
        if (cancelled) {
          return;
        }
        setVisits(response.results);
        setTotalCount(response.pagination?.count ?? response.results.length);
        setHasNext(Boolean(response.pagination?.next));
        setHasPrevious(Boolean(response.pagination?.previous));
      } catch (fetchError: unknown) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Could not load therapy visits.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingVisits(false);
        }
      }
    }

    void loadVisits();
    return () => {
      cancelled = true;
    };
  }, [
    activeClinicId,
    activeTab,
    activeSearch,
    departmentUuid,
    discipline,
    hasAccess,
    page,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      if (!hasAccess || !departmentUuid) {
        setStats(null);
        return;
      }

      setIsStatsLoading(true);

      try {
        const summary = await fetchVisitQueueSummary({ departmentUuid });
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
    }

    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [departmentUuid, hasAccess]);

  if (isUserLoading) {
    return <PageLoader message={`Loading ${config.label}...`} />;
  }

  if (!hasAccess) {
    return (
      <ListPageLayout data-testid="therapy-access-denied">
        <ListPageBlankState
          compact
          icon="shield"
          title="Access denied"
          description={`You must belong to the ${config.group} group to access ${config.label}.`}
          action={
            <Button asChild variant="outline" className="h-8 rounded-lg text-[13px]">
              <Link href={ROUTES.settingsAccount}>Back to account</Link>
            </Button>
          }
        />
      </ListPageLayout>
    );
  }

  function handleSearchSubmit() {
    setPage(1);
    setActiveSearch(search.trim());
  }

  function handleClearSearch() {
    setPage(1);
    setSearch("");
    setActiveSearch("");
  }

  function handleTabChange(tab: TherapyQueueTab) {
    setPage(1);
    setActiveTab(tab);
  }

  return (
    <ListPageLayout data-testid={`therapy-${discipline}-visits`}>
      <ListPageHeaderSection>
        <ListPageHeaderTopRow>
          <ListPageHeaderTitleBlock
            title={config.queueLabel}
            description={config.description}
          />
        </ListPageHeaderTopRow>
        <ListPageHeaderMobileSearch>
          <Input
            type="search"
            aria-label="Search visits"
            placeholder="Search visits..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearchSubmit();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoadingVisits}
            onClick={handleSearchSubmit}
          >
            Search
          </Button>
          {search ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoadingVisits}
              onClick={handleClearSearch}
            >
              Clear
            </Button>
          ) : null}
        </ListPageHeaderMobileSearch>
      </ListPageHeaderSection>

      <ListPageDataSectionsStack>
        <ListPageStatsSection>
          <TherapyVisitSummaryCards stats={stats} isLoading={isStatsLoading} />
        </ListPageStatsSection>
        {departments.length > 0 ? (
          <TherapyVisitsToolbar
            search={search}
            activeTab={activeTab}
            isLoading={isLoadingVisits}
            onSearchChange={setSearch}
            onSearchSubmit={handleSearchSubmit}
            onClearSearch={handleClearSearch}
            onTabChange={handleTabChange}
          />
        ) : null}
      </ListPageDataSectionsStack>

      <ListPageTableSection>
        {isLoadingDepartments || isLoadingVisits ? (
          <PageLoader message="Loading therapy visits..." />
        ) : error ? (
          <ListPageBlankState
            compact
            tone="error"
            icon="file"
            title="Could not load therapy visits"
            description={error}
          />
        ) : departments.length === 0 ? (
          <ListPageBlankState
            compact
            icon="calendar"
            title={`No ${config.label.toLowerCase()} queue available`}
            description={`The active clinic does not have an available ${config.label.toLowerCase()} department.`}
          />
        ) : visits.length > 0 ? (
          <div className="space-y-4">
            <TherapyVisitsTable
              visits={visits}
              onRowClick={(visit) =>
                router.push(ROUTES.therapyVisitDetail(discipline, visit.uuid))
              }
            />
            <ListPagePagination
              page={page}
              pageSize={DEFAULT_PAGE_SIZE}
              totalCount={totalCount}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              isLoading={isLoadingVisits}
              onPageChange={setPage}
            />
          </div>
        ) : (
          <ListPageBlankState
            compact
            icon={activeSearch ? "search" : "calendar"}
            title={
              activeSearch
                ? "No visits found"
                : activeTab === "active"
                  ? "No active visits"
                  : "No visits yet"
            }
            description={
              activeSearch
                ? `No visits match "${activeSearch}". Try a different search.`
                : activeTab === "active"
                  ? `There are no active ${config.label.toLowerCase()} visits in this clinic.`
                  : `${config.label} visits will appear here when they are created.`
            }
          />
        )}
      </ListPageTableSection>
    </ListPageLayout>
  );
}
