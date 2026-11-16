"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/** A date range as YYYY-MM-DD strings; an end that is not chosen yet is "". */
export type DateRangeValue = { from: string; to: string };

export type DateRangePreset = { id: string; label: string; range: DateRangeValue };

export const dateToIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Local midnight for a YYYY-MM-DD string, or undefined when it is not a full date. */
export function isoToDate(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}

export const formatRangeDate = (iso: string) => isoToDate(iso)?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) ?? "";

/** The default rule: both ends chosen, and the start on or before the end. */
function defaultValidate({ from, to }: DateRangeValue): string | null {
  if (!from || !to) return "Choose both a start and an end date.";
  if (from > to) return "The start date must be on or before the end date.";
  return null;
}

type DateRangePickerProps = {
  value: DateRangeValue;
  onApply: (range: DateRangeValue) => void;
  /** Quick ranges listed beside the calendar. */
  presets?: DateRangePreset[];
  /** Latest date that can be chosen. Leave out to allow any date. */
  maxDate?: string;
  /** Extra rules, run after the default ones. Return a message to block Apply. */
  validate?: (range: DateRangeValue) => string | null;
  /** Prefix for the From / To field ids, so two pickers on a page do not clash. */
  idPrefix?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  "data-testid"?: string;
  contentTestId?: string;
};

/**
 * One date range field: it shows the range, and opens a two-month calendar with quick ranges and
 * From / To fields. Nothing changes until Apply.
 */
export function DateRangePicker({
  value,
  onApply,
  presets = [],
  maxDate,
  validate,
  idPrefix = "date-range",
  triggerLabel,
  triggerClassName,
  "data-testid": testId,
  contentTestId,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const text = value.from && value.to ? `${formatRangeDate(value.from)} to ${formatRangeDate(value.to)}` : "Select dates";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={triggerLabel ?? `Date range: ${text}. Change`}
          data-testid={testId}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg bg-background px-3 text-[12.5px] text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-inset ring-dash-border transition-shadow hover:ring-brand-navy/25 focus:ring-2 focus:ring-brand-primary focus:outline-none data-[state=open]:ring-2 data-[state=open]:ring-brand-primary",
            triggerClassName,
          )}
        >
          <CalendarIcon className="size-4 text-dash-muted" aria-hidden />
          <span className="whitespace-nowrap tabular-nums">{text}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn(appFont.className, "w-auto max-w-[calc(100vw-1rem)] p-0")} data-testid={contentTestId}>
        {open ? (
          <RangeForm
            // Why: a fresh draft each time the popover opens, and again when the applied value changes.
            key={`${value.from}|${value.to}`}
            initial={value}
            presets={presets}
            maxDate={maxDate}
            validate={validate}
            idPrefix={idPrefix}
            onCancel={() => setOpen(false)}
            onApply={(range) => {
              onApply(range);
              setOpen(false);
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function RangeForm({
  initial,
  presets,
  maxDate,
  validate,
  idPrefix,
  onCancel,
  onApply,
}: {
  initial: DateRangeValue;
  presets: DateRangePreset[];
  maxDate?: string;
  validate?: (range: DateRangeValue) => string | null;
  idPrefix: string;
  onCancel: () => void;
  onApply: (range: DateRangeValue) => void;
}) {
  const [draft, setDraft] = useState<DateRangeValue>(initial);
  const beyondMax = maxDate && draft.to > maxDate ? `The end date cannot be after ${formatRangeDate(maxDate)}.` : null;
  const error = defaultValidate(draft) ?? beyondMax ?? validate?.(draft) ?? null;
  const selected: DateRange | undefined = draft.from ? { from: isoToDate(draft.from), to: isoToDate(draft.to) } : undefined;

  return (
    <form
      className="flex flex-col sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        if (!error) onApply(draft);
      }}
    >
      {presets.length > 0 ? (
        <ul className="flex shrink-0 gap-1 overflow-x-auto p-3 sm:w-40 sm:flex-col sm:overflow-visible" aria-label="Quick ranges">
          {presets.map((preset) => {
            const active = preset.range.from === draft.from && preset.range.to === draft.to;
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  onClick={() => setDraft(preset.range)}
                  aria-pressed={active}
                  className={cn("w-full rounded-lg px-3 py-1.5 text-left text-[12.5px] whitespace-nowrap transition-colors", active ? "bg-brand-tint font-semibold text-brand-primary" : "text-brand-slate hover:bg-dash-canvas")}
                >
                  {preset.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="p-3 sm:pl-1">
        <div className="grid grid-cols-2 gap-3 px-1">
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-from`} className="text-[12px]">
              From
            </Label>
            <Input id={`${idPrefix}-from`} type="date" className="h-9 text-[12.5px]" value={draft.from} max={draft.to || maxDate} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${idPrefix}-to`} className="text-[12px]">
              To
            </Label>
            <Input id={`${idPrefix}-to`} type="date" className="h-9 text-[12.5px]" value={draft.to} min={draft.from} max={maxDate} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} />
          </div>
        </div>
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          defaultMonth={isoToDate(draft.from) ?? new Date()}
          disabled={maxDate ? { after: isoToDate(maxDate) ?? new Date() } : undefined}
          onSelect={(next) => setDraft({ from: next?.from ? dateToIso(next.from) : "", to: next?.to ? dateToIso(next.to) : "" })}
          className="hidden sm:block"
        />
        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <p className="min-h-4 text-[12px] text-red-700" role={error ? "alert" : undefined}>
            {error ?? ""}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={error !== null}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
