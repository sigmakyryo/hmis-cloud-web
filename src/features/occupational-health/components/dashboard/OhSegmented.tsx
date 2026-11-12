import { cn } from "@/lib/utils";

/** Small segmented control (tabs or a two/three-way toggle). */
export function OhSegmented<V extends string>({
  value,
  options,
  onChange,
  label,
  role = "tablist",
  className,
}: {
  value: V;
  options: Array<{ value: V; label: React.ReactNode; count?: number }>;
  onChange: (value: V) => void;
  label: string;
  role?: "tablist" | "radiogroup";
  className?: string;
}) {
  return (
    <div role={role} aria-label={label} className={cn("inline-flex max-w-full overflow-x-auto rounded-lg border border-dash-border bg-dash-canvas/60 p-0.5", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role={role === "tablist" ? "tab" : "radio"}
            aria-selected={role === "tablist" ? active : undefined}
            aria-checked={role === "radiogroup" ? active : undefined}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium text-brand-slate transition-colors focus-visible:outline-2 focus-visible:outline-brand-primary",
              active ? "bg-white text-brand-navy shadow-sm ring-1 ring-dash-border" : "hover:text-brand-navy",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.count !== undefined ? (
              <span
                className={cn(
                  "rounded px-1 text-[11px] tabular-nums",
                  active ? "bg-brand-tint text-brand-primary" : "bg-white text-dash-muted",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
