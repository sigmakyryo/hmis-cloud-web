"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ListPageHeaderSection,
  ListPageSearchToolbar,
} from "@/features/app-shell/components/page-layout";
import { OhStartVisitEntry } from "@/features/occupational-health/components/OhStartVisitEntry";
import {
  OH_QUEUE_STATUS_FILTERS,
  type OhQueueStatusFilter,
} from "@/features/occupational-health/lib/oh-visit-workspace";
import { cn } from "@/lib/utils";

type OhQueuePageHeaderProps = {
  search: string;
  status: OhQueueStatusFilter;
  isLoading?: boolean;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  onStatusChange: (status: OhQueueStatusFilter) => void;
  onRefresh: () => void;
};

export function OhQueuePageHeader({
  search,
  status,
  isLoading = false,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  onStatusChange,
  onRefresh,
}: OhQueuePageHeaderProps) {
  return (
    <ListPageHeaderSection>
      <ListPageSearchToolbar
        search={search}
        searchId="oh-queue-search"
        placeholder="Search by client, employer, department, clinician, or status…"
        searchTestId="oh-queue-search"
        searchSubmitTestId="oh-queue-search-submit"
        clearTestId="oh-queue-search-clear"
        isLoading={isLoading}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        onClearSearch={onClearSearch}
        trailing={
          <div className="flex items-center gap-2">
            <OhStartVisitEntry variant="secondary" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg border-dash-border text-xs text-brand-slate"
              disabled={isLoading}
              onClick={onRefresh}
              data-testid="oh-queue-refresh-button"
            >
              <RefreshCw className="size-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />
      <div
        className="flex flex-wrap items-center gap-1.5 pt-3"
        role="group"
        aria-label="Filter by status"
        data-testid="oh-queue-status-filters"
      >
        {OH_QUEUE_STATUS_FILTERS.map((item) => {
          const selected = status === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onStatusChange(item.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[12px] font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
                selected
                  ? "bg-brand-primary/10 text-brand-navy"
                  : "text-dash-muted hover:bg-muted",
              )}
              data-testid={`oh-queue-status-${item.id}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </ListPageHeaderSection>
  );
}
