"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DatePresetChips,
  ReportFilterControl,
} from "@/features/reports/components/ReportFilterForm";
import type { ReportCatalogItem } from "@/features/reports/constants/report-catalog";
import { getReportDatePresets } from "@/features/reports/utils/report-date-presets";
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
        <DateRangePicker
          value={{ from: values[dateGroup.from.name] ?? "", to: values[dateGroup.to.name] ?? "" }}
          onApply={({ from, to }) => {
            onChange(dateGroup.from.name, from);
            onChange(dateGroup.to.name, to);
          }}
          presets={getReportDatePresets().map((preset) => ({ id: preset.id, label: preset.label, range: { from: preset.dateFrom, to: preset.dateTo } }))}
          idPrefix={`${report.id}-range`}
          triggerLabel="Date range"
          data-testid="report-date-range"
          contentTestId="report-date-range-popover"
        />
      ) : null}

      {dateGroup.kind === "single" ? (
        <div className="inline-flex h-9 items-center rounded-lg bg-white px-3 ring-1 ring-dash-border">
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
              className="h-9 gap-1.5 rounded-lg px-3 text-brand-slate"
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
