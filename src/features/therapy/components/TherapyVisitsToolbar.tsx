"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ListPageToolbarActions,
  ListPageToolbarSearch,
  ListPageToolbarSection,
} from "@/features/app-shell/components/page-layout";
import {
  TherapyQueueTabs,
  type TherapyQueueTab,
} from "@/features/therapy/components/TherapyQueueTabs";

type TherapyVisitsToolbarProps = {
  search: string;
  activeTab: TherapyQueueTab;
  isLoading?: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  onTabChange: (tab: TherapyQueueTab) => void;
};

export function TherapyVisitsToolbar({
  search,
  activeTab,
  isLoading = false,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  onTabChange,
}: TherapyVisitsToolbarProps) {
  return (
    <ListPageToolbarSection className="px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <ListPageToolbarSearch>
        <Input
          id="therapy-visit-search"
          type="search"
          placeholder="Search by client, ID, service, or clinic..."
          className="min-w-0 w-full sm:flex-1"
          value={search}
          disabled={isLoading}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSearchSubmit();
            }
          }}
        />
        <ListPageToolbarActions>
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onSearchSubmit}
          >
            Search
          </Button>
          {search ? (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={onClearSearch}
            >
              Clear
            </Button>
          ) : null}
        </ListPageToolbarActions>
      </ListPageToolbarSearch>
      <TherapyQueueTabs activeTab={activeTab} onTabChange={onTabChange} />
    </ListPageToolbarSection>
  );
}
