"use client";

import { Building2, CircleDot } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OH_QUEUE_STATUS_FILTERS, type OhQueueStatusFilter } from "@/features/occupational-health/lib/oh-visit-workspace";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const ALL_EMPLOYERS = "all";

const TRIGGER =
  "h-9 w-auto min-w-0 gap-2 rounded-full bg-white px-3.5 text-[13px] text-brand-navy shadow-none ring-dash-border data-[placeholder]:text-dash-muted [&>span]:truncate";

/** Narrow the queue by employer (both views) and by status (list view, where there are no lanes). */
export function OhQueueFilters({
  employers,
  employer,
  onEmployerChange,
  showStatus,
  status,
  counts,
  onStatusChange,
}: {
  employers: string[];
  employer: string;
  onEmployerChange: (employer: string) => void;
  showStatus: boolean;
  status: OhQueueStatusFilter;
  counts: Record<OhQueueStatusFilter, number>;
  onStatusChange: (status: OhQueueStatusFilter) => void;
}) {
  return (
    <>
      <Select value={employer} onValueChange={onEmployerChange}>
        <SelectTrigger aria-label="Employer" data-testid="oh-queue-employer-filter" className={cn(TRIGGER, "max-w-56", employer !== ALL_EMPLOYERS && "ring-brand-primary/50")}>
          <Building2 className="size-3.5 shrink-0 text-dash-muted" aria-hidden />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={appFont.className}>
          <SelectItem value={ALL_EMPLOYERS}>All employers</SelectItem>
          {employers.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showStatus ? (
        <Select value={status} onValueChange={(value) => onStatusChange(value as OhQueueStatusFilter)}>
          <SelectTrigger aria-label="Status" data-testid="oh-queue-status-filter" className={cn(TRIGGER, status !== "all" && "ring-brand-primary/50")}>
            <CircleDot className="size-3.5 shrink-0 text-dash-muted" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={appFont.className}>
            {OH_QUEUE_STATUS_FILTERS.map((item) => (
              <SelectItem key={item.id} value={item.id} data-testid={`oh-queue-status-${item.id}`}>
                {item.id === "all" ? "All statuses" : item.label}
                <span className="ml-2 text-dash-muted tabular-nums">{counts[item.id]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </>
  );
}
