"use client";

import { ListPageHeaderSection } from "@/features/app-shell/components/page-layout";
import { CustomerListToolbar } from "@/features/customers/components/CustomerListToolbar";
import type { CustomerListFilterState } from "@/features/customers/utils/customer-list-filters";
import { OhStartVisitEntry } from "@/features/occupational-health/components/OhStartVisitEntry";

type OhEmployeesPageHeaderProps = {
  search: string;
  filters: Pick<
    CustomerListFilterState,
    "gender" | "activeStatus" | "ordering" | "tags"
  >;
  isLoading?: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  onFiltersApply: (
    filters: Pick<
      CustomerListFilterState,
      "gender" | "activeStatus" | "ordering" | "tags"
    >,
  ) => void;
};

export function OhEmployeesPageHeader({
  search,
  filters,
  isLoading = false,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  onFiltersApply,
}: OhEmployeesPageHeaderProps) {
  return (
    <ListPageHeaderSection>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <CustomerListToolbar
            search={search}
            filters={filters}
            isLoading={isLoading}
            onSearchChange={onSearchChange}
            onSearchSubmit={onSearchSubmit}
            onClearSearch={onClearSearch}
            onFiltersApply={onFiltersApply}
          />
        </div>
        <OhStartVisitEntry variant="secondary" />
      </div>
    </ListPageHeaderSection>
  );
}
