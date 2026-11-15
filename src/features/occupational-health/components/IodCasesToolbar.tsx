"use client";

import { CircleDot, Search, TriangleAlert, X } from "lucide-react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { IodListSeverity, IodListStatus } from "@/features/occupational-health/lib/iod-case-list";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const TRIGGER = "h-9 w-auto min-w-0 gap-2 rounded-full bg-white px-3.5 text-[13px] text-brand-navy shadow-none ring-dash-border [&>span]:truncate";

const STATUSES: Array<{ value: IodListStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "closed", label: "Closed" },
];
const SEVERITIES: Array<{ value: IodListSeverity; label: string }> = [
  { value: "all", label: "Any severity" },
  { value: "minor", label: "Minor" },
  { value: "moderate", label: "Moderate" },
  { value: "major", label: "Major" },
  { value: "fatal", label: "Fatal" },
];

/** Search and filters on one line, with the one thing you do here on the right. */
export function IodCasesToolbar({
  search,
  onSearch,
  status,
  onStatus,
  severity,
  onSeverity,
  counts,
  onOpenCase,
}: {
  search: string;
  onSearch: (value: string) => void;
  status: IodListStatus;
  onStatus: (value: IodListStatus) => void;
  severity: IodListSeverity;
  onSeverity: (value: IodListSeverity) => void;
  counts: Record<IodListStatus, number>;
  onOpenCase: () => void;
}) {
  return (
    <div data-list-band className="border-b border-dash-border px-5 py-4 md:px-8">
      <h1 className="sr-only">Injuries on duty</h1>
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search cases</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dash-muted" aria-hidden />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && search) {
                event.preventDefault();
                onSearch("");
              }
            }}
            placeholder="Search worker, employer, body part"
            className="h-9 rounded-full border-dash-border bg-white pr-9 pl-9 text-[13.5px] shadow-none focus-visible:border-brand-primary/50 focus-visible:ring-2 focus-visible:ring-brand-primary/15"
            data-testid="oh-iod-search"
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearch("")}
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-dash-muted hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </label>
        <Select value={status} onValueChange={(value) => onStatus(value as IodListStatus)}>
          <SelectTrigger aria-label="Status" data-testid="oh-iod-status-filter" className={cn(TRIGGER, status !== "all" && "ring-brand-primary/50")}>
            <CircleDot className="size-3.5 shrink-0 text-dash-muted" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={appFont.className}>
            {STATUSES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
                <span className="ml-2 text-dash-muted tabular-nums">{counts[option.value]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={(value) => onSeverity(value as IodListSeverity)}>
          <SelectTrigger aria-label="Severity" data-testid="oh-iod-severity-filter" className={cn(TRIGGER, severity !== "all" && "ring-brand-primary/50")}>
            <TriangleAlert className="size-3.5 shrink-0 text-dash-muted" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={appFont.className}>
            {SEVERITIES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <PrimaryButton type="button" onClick={onOpenCase}>
            Open case
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
