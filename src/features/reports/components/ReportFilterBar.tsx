"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DatePresetChips,
  ReportFilterControl,
} from "@/features/reports/components/ReportFilterForm";
import type { ReportCatalogItem } from "@/features/reports/constants/report-catalog";
import { groupReportDateFields } from "@/features/reports/utils/report-export-summary";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type ReportFilterBarProps = {
  report: ReportCatalogItem;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
};

function activeExtraFilterCount(
  report: ReportCatalogItem,
  values: Record<string, string>,
): number {
  return report.filters.filter(
    (field) => field.type !== "date" && (values[field.name] ?? "").trim() !== "",
  ).length;
}

const DATE_INPUT_CLASS =
  "h-8 w-[9.5rem] border-0 bg-transparent px-0 text-sm text-brand-navy shadow-none ring-0 tabular-nums focus-visible:ring-0";

export function ReportFilterBar({ report, values, onChange }: ReportFilterBarProps) {
  const dateGroup = groupReportDateFields(report.filters);
  const extraFields = report.filters.filter((field) => field.type !== "date");
  const activeCount = activeExtraFilterCount(report, values);
  const showFilters = extraFields.length > 0 || dateGroup.kind !== "none";

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {dateGroup.kind === "range" ? (
        <div className="inline-flex h-9 items-center rounded-full bg-white px-3 ring-1 ring-dash-border">
          <Input
            id={`${report.id}-${dateGroup.from.name}`}
            type="date"
            aria-label={dateGroup.from.label}
            value={values[dateGroup.from.name] ?? ""}
            onChange={(event) => onChange(dateGroup.from.name, event.target.value)}
            className={DATE_INPUT_CLASS}
          />
          <span className="px-1.5 text-xs text-brand-muted">to</span>
          <Input
            id={`${report.id}-${dateGroup.to.name}`}
            type="date"
            aria-label={dateGroup.to.label}
            value={values[dateGroup.to.name] ?? ""}
            onChange={(event) => onChange(dateGroup.to.name, event.target.value)}
            className={DATE_INPUT_CLASS}
          />
        </div>
      ) : null}

      {dateGroup.kind === "single" ? (
        <div className="inline-flex h-9 items-center rounded-full bg-white px-3 ring-1 ring-dash-border">
          <span className="pr-2 text-xs text-brand-muted">{dateGroup.field.label}</span>
          <Input
            id={`${report.id}-${dateGroup.field.name}`}
            type="date"
            aria-label={dateGroup.field.label}
            value={values[dateGroup.field.name] ?? ""}
            onChange={(event) => onChange(dateGroup.field.name, event.target.value)}
            className={DATE_INPUT_CLASS}
          />
        </div>
      ) : null}

      {showFilters ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 gap-1.5 rounded-full px-3 text-brand-slate"
              data-testid="report-filters-button"
            >
              <SlidersHorizontal className="size-3.5" aria-hidden="true" />
              Filters
              {activeCount > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-medium text-brand-navy ring-1 ring-dash-border tabular-nums">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className={cn(
              appFont.className,
              "w-80 space-y-4 rounded-xl border-dash-border bg-white p-4 shadow-md",
            )}
            data-testid="report-filters-popover"
          >
            <p className="text-sm font-medium text-brand-navy">Narrow this report</p>
            {dateGroup.kind !== "none" ? (
              <DatePresetChips group={dateGroup} values={values} onChange={onChange} />
            ) : null}
            {extraFields.map((field) => (
              <ReportFilterControl
                key={field.name}
                field={field}
                value={values[field.name] ?? ""}
                onChange={onChange}
              />
            ))}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
