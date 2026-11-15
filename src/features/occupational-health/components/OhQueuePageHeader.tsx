"use client";

import { Columns3, List, RefreshCw, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { OhQueueFilters } from "@/features/occupational-health/components/OhQueueFilters";
import { OhStartVisitEntry } from "@/features/occupational-health/components/OhStartVisitEntry";
import type { OhQueueStatusFilter } from "@/features/occupational-health/lib/oh-visit-workspace";
import { cn } from "@/lib/utils";

export type OhQueueView = "board" | "list";

type OhQueuePageHeaderProps = {
  view: OhQueueView;
  onViewChange: (view: OhQueueView) => void;
  counts: Record<OhQueueStatusFilter, number>;
  employers: string[];
  employer: string;
  onEmployerChange: (employer: string) => void;
  search: string;
  status: OhQueueStatusFilter;
  isRefreshing?: boolean;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onStatusChange: (status: OhQueueStatusFilter) => void;
  onRefresh: () => void;
};

const VIEWS = [
  { id: "board", label: "Board", icon: Columns3 },
  { id: "list", label: "List", icon: List },
] as const;

/** One toolbar: search and filters on the left, the view switch and actions on the right. */
export function OhQueuePageHeader({
  view,
  onViewChange,
  counts,
  employers,
  employer,
  onEmployerChange,
  search,
  status,
  isRefreshing = false,
  onSearchChange,
  onClearSearch,
  onStatusChange,
  onRefresh,
}: OhQueuePageHeaderProps) {
  return (
    <div data-list-band className="border-b border-dash-border px-5 py-4 md:px-8" data-testid="oh-queue-toolbar">
      <h1 className="sr-only">OHS queue</h1>
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative block w-full sm:w-72">
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
            placeholder="Search client, employer, clinician"
            className="h-9 rounded-full border-dash-border bg-white pr-9 pl-9 text-[13.5px] shadow-none focus-visible:border-brand-primary/50 focus-visible:ring-2 focus-visible:ring-brand-primary/15"
            data-testid="oh-queue-search"
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={onClearSearch}
              data-testid="oh-queue-search-clear"
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-dash-muted hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </label>
        <OhQueueFilters
          employers={employers}
          employer={employer}
          onEmployerChange={onEmployerChange}
          showStatus={view === "list"}
          status={status}
          counts={counts}
          onStatusChange={onStatusChange}
        />
        <div className="ml-auto flex items-center gap-2">
          <div role="group" aria-label="View" className="flex shrink-0 rounded-full border border-dash-border p-0.5">
            {VIEWS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={view === option.id}
                onClick={() => onViewChange(option.id)}
                data-testid={`oh-queue-view-${option.id}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
                  view === option.id ? "bg-brand-navy text-white" : "text-dash-muted hover:text-brand-navy",
                )}
              >
                <option.icon className="size-3.5" aria-hidden />
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh"
            title="Refresh"
            data-testid="oh-queue-refresh-button"
            className="flex size-9 items-center justify-center rounded-full text-dash-muted transition-colors hover:bg-dash-canvas hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:outline-none disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", isRefreshing && "motion-safe:animate-spin")} aria-hidden />
          </button>
          <OhStartVisitEntry />
        </div>
      </div>
    </div>
  );
}
