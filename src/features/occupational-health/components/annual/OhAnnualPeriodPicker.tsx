"use client";

import { DateRangePicker, dateToIso, type DateRangePreset, type DateRangeValue } from "@/components/ui/date-range-picker";
import { customPeriodError, periodLabel, type AnnualPeriod } from "@/features/occupational-health/components/annual/annual-utils";

/** The range a period covers; a calendar year runs 1 January to 31 December. */
export function periodRange(period: AnnualPeriod): DateRangeValue {
  return period.mode === "year" ? { from: `${period.year}-01-01`, to: `${period.year}-12-31` } : { from: period.from, to: period.to };
}

/** A range that is exactly one calendar year is the statutory period; anything else is custom. */
export function rangeToPeriod({ from, to }: DateRangeValue): AnnualPeriod {
  const year = from.slice(0, 4);
  return from === `${year}-01-01` && to === `${year}-12-31` ? { mode: "year", year: Number(year) } : { mode: "custom", from, to };
}

/** Quick ranges: recent calendar years, then year to date and the last twelve months. */
function presets(today: string): DateRangePreset[] {
  const thisYear = Number(today.slice(0, 4));
  const clamp = (iso: string) => (iso > today ? today : iso);
  const yearAgo = new Date(thisYear - 1, Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)) + 1);
  return [
    ...[thisYear - 1, thisYear - 2, thisYear - 3].map((year) => ({ id: String(year), label: String(year), range: { from: `${year}-01-01`, to: `${year}-12-31` } })),
    { id: "ytd", label: "Year to date", range: { from: `${thisYear}-01-01`, to: clamp(`${thisYear}-12-31`) } },
    { id: "last-12", label: "Last 12 months", range: { from: dateToIso(yearAgo), to: today } },
  ];
}

/**
 * The report period as a date range field. A calendar year is kept as the statutory period; any other
 * range is custom, up to three years and not in the future.
 */
export function OhAnnualPeriodPicker({ value, onApply }: { value: AnnualPeriod; onApply: (period: AnnualPeriod) => void }) {
  const today = dateToIso(new Date());
  return (
    <DateRangePicker
      value={periodRange(value)}
      onApply={(range) => onApply(rangeToPeriod(range))}
      presets={presets(today)}
      maxDate={today}
      validate={({ from, to }) => customPeriodError(from, to, today)}
      idPrefix="oh-annual"
      triggerLabel={`Period: ${periodLabel(value)}. Change period`}
      data-testid="oh-annual-period-trigger"
      contentTestId="oh-annual-period-dialog"
    />
  );
}
