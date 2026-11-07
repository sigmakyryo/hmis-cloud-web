"use client";

import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { appFont } from "@/lib/fonts";
import { formatPartialIsoDateInput } from "@/lib/validate-date-input";
import { cn } from "@/lib/utils";

type DateOfBirthFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
};

function parseDateValue(value: string): Date | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function formatDateValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function DateOfBirthField({
  value,
  onChange,
  disabled = false,
  hasError = false,
  id,
  placeholder = "YYYY-MM-DD",
  className,
  "data-testid": dataTestId,
}: DateOfBirthFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const today = useMemo(() => new Date(), []);
  const startMonth = useMemo(
    () => new Date(today.getFullYear() - 120, 0, 1),
    [today],
  );

  function handleInputChange(nextValue: string) {
    onChange(formatPartialIsoDateInput(nextValue, value));
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (!date) {
      return;
    }

    onChange(formatDateValue(date));
    setOpen(false);
  }

  return (
    <div
      className={cn(
        "flex h-10 w-full items-center rounded-lg bg-background shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-inset ring-dash-border transition-shadow duration-100 ease-linear focus-within:ring-2 focus-within:ring-brand-primary",
        hasError && "ring-destructive/40 focus-within:ring-destructive",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        aria-invalid={hasError}
        onChange={(event) => handleInputChange(event.target.value)}
        className="h-full flex-1 bg-transparent px-3 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0"
        data-testid={dataTestId}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Open calendar"
            className="mr-1 flex size-8 shrink-0 items-center justify-center rounded-md text-dash-muted hover:bg-dash-canvas hover:text-brand-navy disabled:pointer-events-none disabled:opacity-50"
          >
            <CalendarIcon className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn("w-auto p-0", appFont.className)}
          align="end"
        >
          <Calendar
            mode="single"
            captionLayout="dropdown"
            navLayout="after"
            reverseYears
            startMonth={startMonth}
            endMonth={today}
            defaultMonth={selectedDate ?? today}
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            disabled={(date) => date > today}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
