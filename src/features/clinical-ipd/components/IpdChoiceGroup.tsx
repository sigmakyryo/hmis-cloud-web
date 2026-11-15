"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type IpdChoice<T extends string> = {
  value: T;
  label: string;
};

type IpdChoiceGroupProps<T extends string> = {
  label: string;
  value: T;
  options: IpdChoice<T>[];
  onChange: (value: T) => void;
};

/** Pressed buttons for a short fixed list, used in place of a native select. */
export function IpdChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: IpdChoiceGroupProps<T>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "h-8 rounded-lg px-3 text-[13px]",
                selected
                  ? "bg-brand-tint font-semibold text-brand-primary"
                  : "font-medium text-dash-muted ring-1 ring-inset ring-dash-border hover:text-brand-navy",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
