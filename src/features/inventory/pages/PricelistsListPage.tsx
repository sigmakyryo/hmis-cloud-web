"use client";

import { Receipt } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { FabButton } from "@/components/ui/fab-button";
import { ROUTES } from "@/constants/routes";
import {
  ListPageBlankState,
  ListPageLayout,
  ListPagePagination,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { fetchCatalogPricelists } from "@/features/catalog/services/catalog.service";
import type { CatalogPricelist } from "@/features/catalog/types/catalog.types";
import { InventoryListAccessDenied } from "@/features/inventory/components/list/InventoryListAccessDenied";
import { InventoryListEmptyState } from "@/features/inventory/components/list/InventoryListEmptyState";
import { PricelistsPageHeader } from "@/features/inventory/components/PricelistsPageHeader";
import { PricelistsTable } from "@/features/inventory/components/tables/pricelists-table";
import { PricelistsTableSkeleton } from "@/features/inventory/components/tables/PricelistsTableSkeleton";
import { useInventoryListFilters } from "@/features/inventory/hooks/use-inventory-list-filters";
import type { InventoryListFilters } from "@/features/inventory/types/inventory.types";
import { isOnboardingReturn } from "@/features/overview/utils/onboarding-return";
import { AddPricelistDialog } from "@/features/settings/components/AddPricelistDialog";
import type { OrganizationPricelist } from "@/features/settings/types/settings.types";
import type { PaginatedListResponse } from "@/types/api.types";

const DEFAULT_SHEET_FILTERS = { include_inactive: false } as const;

function buildPricelistListFilters() {
  return {};
}

function countPricelistSheetFilters() {
  return 0;
}

async function fetchPricelists(
  filters: InventoryListFilters,
): Promise<PaginatedListResponse<CatalogPricelist>> {
  return fetchCatalogPricelists({
    page: filters.page,
    pageSize: filters.pageSize,
    search: filters.search,
    include_inactive: DEFAULT_SHEET_FILTERS.include_inactive,
  });
}

export function PricelistsListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromOnboarding = isOnboardingReturn(searchParams);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("add") !== "pricelist") {
      return;
    }

    let cancelled = false;
    async function openCreate() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      setCreateOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("add");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }

    void openCreate();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);
  const fetchFn = useCallback(
    (filters: InventoryListFilters) => fetchPricelists(filters),
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
  } = useInventoryListFilters({
    fetchFn,
    defaultSheetFilters: DEFAULT_SHEET_FILTERS,
    buildExtraFilters: buildPricelistListFilters,
    countActiveSheetFilters: countPricelistSheetFilters,
  });

  const handleCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const handlePricelistCreated = useCallback(
    (pricelist: OrganizationPricelist, meta?: { addAnother: boolean }) => {
      void reload();
      if (meta?.addAnother || fromOnboarding) {
        return;
      }
      router.push(ROUTES.inventoryPricelistDetail(pricelist.uuid));
    },
    [fromOnboarding, reload, router],
  );

  const handleRowClick = useCallback(
    (pricelist: CatalogPricelist) =>
      router.push(ROUTES.inventoryPricelistDetail(pricelist.uuid)),
    [router],
  );

  if (isUnauthorized) {
    return <InventoryListAccessDenied />;
  }

  return (
    <ListPageLayout fill data-testid="inventory-pricelists-page">
      <AddPricelistDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handlePricelistCreated}
      />

      {hasNoRecords ? null : (
      <PricelistsPageHeader
        search={search}
        isLoading={isRefreshing}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onNewPricelist={handleCreate}
      />
      )}

      <FabButton
        label="New pricelist"
        onClick={handleCreate}
        data-testid="add-pricelist-fab"
      />

      <ListPageTableSection>
        {isLoading ? (
          <PricelistsTableSkeleton rows={8} />
        ) : error ? (
          <ListPageBlankState
  compact
  tone="error"
  icon="file"
  title="Could not load pricelists"
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
          <InventoryListEmptyState
            icon={Receipt}
            title="No pricelists found"
            description="Create a pricelist to start assigning product prices."
            actionLabel="New pricelist"
            onAction={handleCreate}
          />
        ) : isFilteredEmpty ? (
          <ListPageBlankState
  compact
  icon="search"
  title="No matching pricelists"
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
            <PricelistsTable pricelists={items} onRowClick={handleRowClick} />
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
    </ListPageLayout>
  );
}
