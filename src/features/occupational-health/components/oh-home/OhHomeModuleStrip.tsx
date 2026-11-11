"use client";

import type { OhModule } from "@/features/occupational-health/lib/oh-modules";
import { cn } from "@/lib/utils";

/** Module names on one line. The chosen one carries the same teal underline as the app's tabs. */
export function OhHomeModuleStrip({
  modules,
  selected,
  onSelect,
}: {
  modules: OhModule[];
  selected: OhModule;
  onSelect: (ohModule: OhModule) => void;
}) {
  return (
    <div className="border-b border-dash-border">
      <nav aria-label="Modules" className="scrollbar-hide flex overflow-x-auto px-5 md:px-6">
        {modules.map((ohModule, index) => {
          const isSelected = ohModule.key === selected.key;
          return (
            <button
              key={ohModule.key}
              type="button"
              onClick={() => onSelect(ohModule)}
              aria-pressed={isSelected}
              data-testid={`oh-home-module-${ohModule.slug}`}
              className={cn(
                "shrink-0 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
                index === 0 ? "pr-4" : "px-4",
                isSelected
                  ? "text-brand-primary shadow-[inset_0_-2px_0_0_var(--color-brand-primary)]"
                  : "text-brand-muted hover:text-brand-navy",
              )}
            >
              {ohModule.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
