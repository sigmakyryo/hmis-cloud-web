"use client";

import { Users } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

export type SectionAudience = "male" | "female" | null;

const OPTIONS: Array<{ value: SectionAudience; label: string; hint: string }> = [
  { value: null, label: "Everyone", hint: "Shown to every worker" },
  { value: "male", label: "Male only", hint: "Hidden and not required for female workers" },
  { value: "female", label: "Female only", hint: "Hidden and not required for male workers" },
];

export function sectionAudienceLabel(value: SectionAudience | undefined): string | null {
  if (value === "male") return "Male only";
  if (value === "female") return "Female only";
  return null;
}

/** Segmented All / Male only / Female only control with arrow-key support. */
export function SectionAudienceToggle({
  value,
  onChange,
  disabled,
}: {
  value: SectionAudience | undefined;
  onChange: (value: SectionAudience) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = OPTIONS.findIndex((option) => option.value === (value ?? null));
  const active = OPTIONS[current] ?? OPTIONS[0];

  function move(delta: number) {
    const next = (current + delta + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div className="space-y-1.5">
      <div
        role="radiogroup"
        aria-label="Who sees this section"
        data-testid="section-audience-toggle"
        className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
          }
        }}
      >
        {OPTIONS.map((option, index) => {
          const selected = index === (current < 0 ? 0 : current);
          return (
            <button
              key={option.label}
              ref={(node) => { refs.current[index] = node; }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50",
                selected
                  ? "bg-white text-brand-navy shadow-sm ring-1 ring-dash-border"
                  : "text-dash-muted hover:text-brand-navy",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-1.5 text-[12px] text-dash-muted">
        <Users className="size-3.5" aria-hidden="true" />
        {active.hint}. Applied when capturing, validating and printing.
      </p>
    </div>
  );
}
