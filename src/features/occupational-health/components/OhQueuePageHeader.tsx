"use client";

import { RefreshCw, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { formatWaitingMinutes } from "@/features/clinical-opd/utils/opd-queue-stage";
import { OhStartVisitEntry } from "@/features/occupational-health/components/OhStartVisitEntry";
import { waitTone } from "@/features/occupational-health/components/OhQueueTable";
import {
  OH_QUEUE_STATUS_FILTERS,
  type OhQueueStatusFilter,
} from "@/features/occupational-health/lib/oh-visit-workspace";
import { cn } from "@/lib/utils";

type OhQueuePageHeaderProps = {
  total: number;
  /** Minutes the longest-waiting client has waited, or null when nobody is waiting. */
  longestWait: number | null;
  counts: Record<OhQueueStatusFilter, number>;
  search: string;
  status: OhQueueStatusFilter;
  isRefreshing?: boolean;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onStatusChange: (status: OhQueueStatusFilter) => void;
  onRefresh: () => void;
};

/** Title with the live picture, then status tabs with counts and a search that filters as you type. */
export function OhQueuePageHeader({
  total,
  longestWait,
  counts,
  search,
  status,
  isRefreshing = false,
  onSearchChange,
  onClearSearch,
  onStatusChange,
  onRefresh,
}: OhQueuePageHeaderProps) {
  return (
    <div data-list-band className="px-5 pt-7 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-8 font-semibold tracking-tight text-brand-navy">Queue</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-dash-muted" data-testid="oh-queue-summary">
            <span>
              <span className="font-semibold text-brand-navy tabular-nums">{counts.waiting}</span> waiting
            </span>
            <span>
              <span className="font-semibold text-brand-navy tabular-nums">{counts.in_progress}</span> with a clinician
            </span>
            {longestWait !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className={cn("size-1.5 rounded-full", waitTone(longestWait).dot)} />
                Longest wait <span className={cn("font-semibold tabular-nums", waitTone(longestWait).text)}>{formatWaitingMinutes(longestWait)}</span>
              </span>
            ) : null}
            <span className="sr-only">{total} visits in total</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh"
            title="Refresh"
            data-testid="oh-queue-refresh-button"
            className="flex size-9 items-center justify-center rounded-lg text-dash-muted transition-colors hover:bg-dash-canvas hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", isRefreshing && "motion-safe:animate-spin")} aria-hidden />
          </button>
          <OhStartVisitEntry />
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-x-8 gap-y-3 border-b border-dash-border md:flex-row md:items-end md:justify-between">
        <div
          className="scrollbar-hide -mb-px flex gap-6 overflow-x-auto"
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
                data-testid={`oh-queue-status-${item.id}`}
                className={cn(
                  "flex shrink-0 items-baseline gap-1.5 border-b-2 pb-2.5 text-[13.5px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:text-brand-primary",
                  selected ? "border-brand-primary font-semibold text-brand-navy" : "border-transparent font-medium text-dash-muted hover:text-brand-navy",
                )}
              >
                {item.label}
                <span className={cn("text-[12px] tabular-nums", selected ? "text-brand-primary" : "text-dash-muted/80")}>{counts[item.id]}</span>
              </button>
            );
          })}
        </div>
        <label className="relative mb-2.5 block w-full md:w-72">
          <span className="sr-only">Search the queue</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dash-muted" aria-hidden />
          <Input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && search) {
                event.preventDefault();
                onClearSearch();
              }
            }}
            placeholder="Client, employer, clinician"
            className="h-9 rounded-full border-dash-border bg-white pr-9 pl-9 text-[13.5px] shadow-none focus-visible:border-brand-primary/50 focus-visible:ring-2 focus-visible:ring-brand-primary/15"
            data-testid="oh-queue-search"
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={onClearSearch}
              data-testid="oh-queue-search-clear"
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-dash-muted hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </label>
      </div>
    </div>
  );
}
