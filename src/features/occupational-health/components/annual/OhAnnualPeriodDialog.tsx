"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import { appFont } from "@/lib/fonts";

import { customPeriodError, type AnnualPeriod } from "./annual-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: AnnualPeriod;
  onApply: (period: AnnualPeriod) => void;
  years: number[];
};

/** Pick a calendar year or a custom date range for the annual report. */
export function OhAnnualPeriodDialog(props: Props) {
  return props.open ? <PeriodForm key={JSON.stringify(props.value)} {...props} /> : <Dialog open={false} />;
}

function PeriodForm({ open, onOpenChange, value, onApply, years }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [mode, setMode] = useState<AnnualPeriod["mode"]>(value.mode);
  const [year, setYear] = useState(value.mode === "year" ? value.year : years[0]);
  const [from, setFrom] = useState(value.mode === "custom" ? value.from : `${years[0]}-01-01`);
  const [to, setTo] = useState(value.mode === "custom" ? value.to : `${years[0]}-12-31` > today ? today : `${years[0]}-12-31`);
  const error = mode === "custom" ? customPeriodError(from, to, today) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${appFont.className} max-w-md`} data-testid="oh-annual-period-dialog">
        <DialogHeader>
          <DialogTitle className="text-base">Report period</DialogTitle>
          <DialogDescription className="text-[13px]">
            A calendar year matches the statutory return. A custom period (up to 3 years) suits board or contract reviews.
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (error) return;
            onApply(mode === "year" ? { mode, year } : { mode, from, to });
            onOpenChange(false);
          }}
        >
          <OhSegmented
            label="Period type"
            role="radiogroup"
            value={mode}
            onChange={setMode}
            options={[
              { value: "year", label: "Calendar year" },
              { value: "custom", label: "Custom range" },
            ]}
          />
          {mode === "year" ? (
            <div className="space-y-1.5">
              <Label htmlFor="oh-annual-year">Year</Label>
              <select
                id="oh-annual-year"
                className="h-9 w-full rounded-md border border-dash-border bg-white px-2.5 text-[13px]"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="oh-annual-from">From</Label>
                <Input id="oh-annual-from" type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oh-annual-to">To</Label>
                <Input id="oh-annual-to" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
              </div>
              {error ? (
                <p className="text-[12px] text-red-700 sm:col-span-2" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={error !== null}>
              Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
