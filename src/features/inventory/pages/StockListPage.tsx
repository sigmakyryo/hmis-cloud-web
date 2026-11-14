"use client";

import { Store } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ListPageBlankState,
  ListPageDataSectionsStack,
  ListPageLayout,
  ListPagePagination,
  ListPageStatsSection,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { InventoryListAccessDenied } from "@/features/inventory/components/list/InventoryListAccessDenied";
import { InventoryListEmptyState } from "@/features/inventory/components/list/InventoryListEmptyState";
import { InventoryListFilteredEmpty } from "@/features/inventory/components/list/InventoryListFilteredEmpty";
import { StockDetailDialog } from "@/features/inventory/components/StockDetailDialog";
import { StockOnHandInsights } from "@/features/inventory/components/StockOnHandInsights";
import { StockPageHeader } from "@/features/inventory/components/StockPageHeader";
import { InventoryTableSkeleton } from "@/features/inventory/components/tables/InventoryTableSkeleton";
import {
  STOCK_TABLE_SKELETON_COLUMNS,
  StockTable,
} from "@/features/inventory/components/tables/stock-table";
import { useInventoryListFilters } from "@/features/inventory/hooks/use-inventory-list-filters";
import { fetchInventoryStock } from "@/features/inventory/services/inventory.service";
import type {
  InventoryListFilters,
  InventoryStock,
} from "@/features/inventory/types/inventory.types";
import type { InventoryListSearchFilters } from "@/features/inventory/utils/inventory-list-filter-chips";
import {
  buildStockListFilters,
  countActiveStockFilters,
  DEFAULT_STOCK_SHEET_FILTERS,
  type StockSheetFilters,
} from "@/features/inventory/utils/inventory-list-filters";
import { summarizeStockItems } from "@/features/inventory/utils/stock-quantity-status";

export function StockListPage() {
  const [selectedStock, setSelectedStock] = useState<InventoryStock | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchFn = useCallback(
    (filters: InventoryListFilters) => fetchInventoryStock(filters),
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
    sheetFilters,
    handleFiltersApply,
  } = useInventoryListFilters({
    fetchFn,
    defaultSheetFilters: DEFAULT_STOCK_SHEET_FILTERS,
    buildExtraFilters: buildStockListFilters,
    countActiveSheetFilters: countActiveStockFilters,
  });

  const pageInsights = useMemo(() => summarizeStockItems(items), [items]);

  const applyFilters = useCallback(
    (nextFilters: InventoryListSearchFilters) => {
      handleFiltersApply(nextFilters as StockSheetFilters);
    },
    [handleFiltersApply],
  );

  const handleClearSearchAndFilters = useCallback(() => {
    handleClearSearch();
    handleFiltersApply(DEFAULT_STOCK_SHEET_FILTERS);
  }, [handleClearSearch, handleFiltersApply]);

  const handleRowClick = useCallback((item: InventoryStock) => {
    setSelectedStock(item);
    setDetailOpen(true);
  }, []);

  if (isUnauthorized) {
    return (
      <InventoryListAccessDenied message="You are not authorized to view inventory stock." />
    );
  }

  return (
    <ListPageLayout fill data-testid="inventory-stock-page">
      <StockDetailDialog
        stock={selectedStock}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <StockPageHeader
        search={search}
        filters={sheetFilters}
        isLoading={isRefreshing}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onFiltersApply={applyFilters}
      />

      <ListPageDataSectionsStack className="space-y-0">
        {!hasNoRecords && !error && !isFilteredEmpty ? (
          <ListPageStatsSection>
            <StockOnHandInsights
              totalLines={totalCount}
              insights={pageInsights}
              isLoading={isLoading}
            />
          </ListPageStatsSection>
        ) : null}

        <ListPageTableSection>
          {isLoading ? (
            <InventoryTableSkeleton columns={STOCK_TABLE_SKELETON_COLUMNS} />
          ) : error ? (
            <ListPageBlankState
  compact
  tone="error"
  icon="file"
  title="Could not load stock"
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
              icon={Store}
              title="No stock records yet"
              description="Stock levels will appear here once inventory is received."
            />
          ) : isFilteredEmpty ? (
            <InventoryListFilteredEmpty
              title="No matching stock records"
              onClear={handleClearSearchAndFilters}
            />
          ) : (
            <>
              <StockTable items={items} onRowClick={handleRowClick} />
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
  );
}
