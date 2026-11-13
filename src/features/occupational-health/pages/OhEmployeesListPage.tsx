"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CustomerSummaryStatsCards } from "@/features/customers/components/CustomerSummaryStats";
import type { Customer } from "@/features/customers/types/customer.types";
import {
  buildCustomerListFilters,
  countActiveCustomerFilters,
  type CustomerListFilterState,
} from "@/features/customers/utils/customer-list-filters";
import type { CustomerSummaryStats as CustomerSummaryStatsData } from "@/features/customers/utils/customer-stats";
import {
  fetchOhEmployeeSummary,
  fetchOhEmployees,
} from "@/features/occupational-health/services/oh.service";
import { AddEmploymentEpisodeDialog } from "@/features/occupational-health/components/AddEmploymentEpisodeDialog";
import { OhEmployeesEmptyState } from "@/features/occupational-health/components/OhEmployeesEmptyState";
import { OhEmployeesPageHeader } from "@/features/occupational-health/components/OhEmployeesPageHeader";
import { OhEmployeesTable } from "@/features/occupational-health/components/OhEmployeesTable";
import { OhEmployeesTableSkeleton } from "@/features/occupational-health/components/OhEmployeesTableSkeleton";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import {
  OH_EMPLOYEE_GENDER_PARAM,
  OH_EMPLOYEE_ORDER_PARAM,
  OH_EMPLOYEE_PAGE_PARAM,
  OH_EMPLOYEE_SEARCH_PARAM,
  OH_EMPLOYEE_STATUS_PARAM,
  ohEmployeesHref,
  parseCustomerGender,
  parseCustomerOrdering,
  parseCustomerStatus,
  parseListPage,
} from "@/features/occupational-health/utils/oh-employee-list-url";
import { ROUTES } from "@/constants/routes";
import {
  ListPageBlankState,
  ListPageDataSectionsStack,
  ListPageLayout,
  ListPagePagination,
  ListPageStatsSection,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { useUser } from "@/providers/user-provider";

const DEFAULT_PAGE_SIZE = 20;

export function OhEmployeesListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData, isLoading: isUserLoading } = useUser();
  const hasAccess = canAccessOccupationalHealth(userData);

  const urlSearch = searchParams.get(OH_EMPLOYEE_SEARCH_PARAM) ?? "";
  const page = parseListPage(searchParams.get(OH_EMPLOYEE_PAGE_PARAM));
  const gender = parseCustomerGender(
    searchParams.get(OH_EMPLOYEE_GENDER_PARAM),
  );
  const activeStatus = parseCustomerStatus(
    searchParams.get(OH_EMPLOYEE_STATUS_PARAM),
  );
  const ordering = parseCustomerOrdering(
    searchParams.get(OH_EMPLOYEE_ORDER_PARAM),
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employmentCustomer, setEmploymentCustomer] = useState<Customer | null>(
    null,
  );
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [search, setSearch] = useState(urlSearch);
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  const [stats, setStats] = useState<CustomerSummaryStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const filters = useMemo(
    () => ({
      gender,
      activeStatus,
      ordering,
      tags: [] as string[],
    }),
    [activeStatus, gender, ordering],
  );

  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  const listFilters = useMemo(
    () =>
      buildCustomerListFilters({
        search: urlSearch,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        hasEmploymentEpisode: true,
        ...filters,
      }),
    [filters, page, urlSearch],
  );

  const replaceList = useCallback(
    (next: {
      search?: string;
      page?: number;
      gender?: CustomerListFilterState["gender"];
      activeStatus?: CustomerListFilterState["activeStatus"];
      ordering?: CustomerListFilterState["ordering"];
    }) => {
      router.replace(
        ohEmployeesHref({
          search: next.search ?? urlSearch,
          page: next.page ?? page,
          gender: next.gender ?? filters.gender,
          activeStatus: next.activeStatus ?? filters.activeStatus,
          ordering: next.ordering ?? filters.ordering,
        }),
      );
    },
    [filters, page, router, urlSearch],
  );

  const reloadCustomers = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    setIsUnauthorized(false);

    try {
      const response = await fetchOhEmployees(listFilters);
      setCustomers(response.results);
      setTotalCount(response.pagination?.count ?? response.results.length);
      setHasNext(Boolean(response.pagination?.next));
      setHasPrevious(Boolean(response.pagination?.previous));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load employees.";

      if (message.toLowerCase().includes("not authenticated")) {
        setIsUnauthorized(true);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [listFilters]);

  useEffect(() => {
    if (isUserLoading || !hasAccess) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setError(null);
        setIsUnauthorized(false);

        const response = await fetchOhEmployees(listFilters);
        if (cancelled) {
          return;
        }

        setCustomers(response.results);
        setTotalCount(response.pagination?.count ?? response.results.length);
        setHasNext(Boolean(response.pagination?.next));
        setHasPrevious(Boolean(response.pagination?.previous));
      } catch (err) {
        if (cancelled) {
          return;
        }

        const message =
          err instanceof Error ? err.message : "Failed to load employees.";

        if (message.toLowerCase().includes("not authenticated")) {
          setIsUnauthorized(true);
        } else {
          setError(message);
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
  }, [hasAccess, isUserLoading, listFilters]);

  useEffect(() => {
    if (isUserLoading || !hasAccess) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const summary = await fetchOhEmployeeSummary();
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
  }, [hasAccess, isUserLoading]);

  function handleSearchSubmit() {
    setIsRefreshing(true);
    replaceList({ search: search.trim(), page: 1 });
  }

  function handleClearSearch() {
    setIsRefreshing(true);
    setSearch("");
    replaceList({ search: "", page: 1 });
  }

  function handleFiltersApply(
    nextFilters: Pick<
      CustomerListFilterState,
      "gender" | "activeStatus" | "ordering" | "tags"
    >,
  ) {
    setIsRefreshing(true);
    replaceList({
      page: 1,
      gender: nextFilters.gender,
      activeStatus: nextFilters.activeStatus,
      ordering: nextFilters.ordering,
    });
  }

  function handlePageChange(nextPage: number) {
    setIsRefreshing(true);
    replaceList({ page: nextPage });
  }

  function handleRowClick(customer: Customer) {
    router.push(ROUTES.occupationalHealthEmployee(customer.uuid));
  }

  if (isUserLoading) {
    return (
      <ListPageLayout data-testid="oh-employees-page">
        <ListPageTableSection>
          <OhEmployeesTableSkeleton rows={10} />
        </ListPageTableSection>
      </ListPageLayout>
    );
  }

  if (!hasAccess || isUnauthorized) {
    return (
      <ListPageLayout data-testid="oh-employees-page">
        <ListPageBlankState
          compact
          icon="shield"
          title="Access denied"
          description="You do not have access to occupational health. Ask an administrator to add you to the OccupationalHealth group."
          action={
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-lg text-[13px]"
              onClick={() => router.push(ROUTES.auth)}
            >
              Go to sign in
            </Button>
          }
        />
      </ListPageLayout>
    );
  }

  const activeFilterCount = countActiveCustomerFilters(filters);
  const hasActiveQuery = urlSearch.length > 0 || activeFilterCount > 0;
  const hasNoEmployeeRecords =
    !isLoading && !error && totalCount === 0 && !hasActiveQuery;
  const isFilteredEmpty =
    !isLoading && !error && customers.length === 0 && hasActiveQuery;

  return (
    <ListPageLayout data-testid="oh-employees-page">
      {hasNoEmployeeRecords ? null : (
        <OhEmployeesPageHeader
          search={search}
          filters={filters}
          isLoading={isRefreshing}
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          onClearSearch={handleClearSearch}
          onFiltersApply={handleFiltersApply}
        />
      )}
      {!hasNoEmployeeRecords ? (
        <ListPageDataSectionsStack className="space-y-0">
          <ListPageStatsSection>
            <CustomerSummaryStatsCards
              stats={stats}
              isLoading={isStatsLoading}
              countLabel="Employees"
            />
          </ListPageStatsSection>

          <ListPageTableSection>
            {isLoading ? (
              <OhEmployeesTableSkeleton rows={10} />
            ) : error ? (
              <ListPageBlankState
                compact
                tone="error"
                icon="users"
                title="Could not load employees"
                description={error}
                action={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg text-[13px]"
                    onClick={() => void reloadCustomers()}
                  >
                    Try again
                  </Button>
                }
              />
            ) : isFilteredEmpty ? (
              <ListPageBlankState
                compact
                icon="search"
                title="No matching employees"
                description="Adjust your search or filters and try again."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg text-[13px]"
                    onClick={handleClearSearch}
                  >
                    Clear search and filters
                  </Button>
                }
              />
            ) : (
              <>
                <OhEmployeesTable
                  customers={customers}
                  onRowClick={handleRowClick}
                  onAddEmployment={setEmploymentCustomer}
                />
                <ListPagePagination
                  page={page}
                  pageSize={DEFAULT_PAGE_SIZE}
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
      ) : (
        <ListPageTableSection>
          <OhEmployeesEmptyState />
        </ListPageTableSection>
      )}
      {employmentCustomer ? (
        <AddEmploymentEpisodeDialog
          customer={employmentCustomer}
          open={Boolean(employmentCustomer)}
          onOpenChange={(open) => {
            if (!open) {
              setEmploymentCustomer(null);
            }
          }}
          onCreated={() => {
            setEmploymentCustomer(null);
            void reloadCustomers();
          }}
        />
      ) : null}
    </ListPageLayout>
  );
}
