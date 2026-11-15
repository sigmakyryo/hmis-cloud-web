"use client";

import { createElement } from "react";

import { OhHomeExposureBadge, OhHomeQueueBadge } from "@/features/occupational-health/components/oh-home/OhHomeLive";
import { OH_MODULE_ACCENT, OH_MODULE_ICON } from "@/features/occupational-health/lib/oh-module-visuals";
import type { OhModule } from "@/features/occupational-health/lib/oh-modules";
import { cn } from "@/lib/utils";

function ModuleBadge({ ohModule }: { ohModule: OhModule }) {
  if (ohModule.key === "OccupationalHealth") {
    return <OhHomeQueueBadge />;
  }
  if (ohModule.key === "ExposureManagement") {
    return <OhHomeExposureBadge />;
  }
  return null;
}

/** Modules as tabs along the top, the same bar the other OH pages use. */
export function OhHomeModuleNav({
  modules,
  selected,
  onSelect,
}: {
  modules: OhModule[];
  selected: OhModule;
  onSelect: (ohModule: OhModule) => void;
}) {
  return (
    <nav
      aria-label="Modules"
      className="scrollbar-hide flex h-12 shrink-0 items-stretch gap-7 overflow-x-auto border-b border-dash-border bg-white px-5 md:px-8"
    >
      {modules.map((ohModule) => {
        const isSelected = ohModule.key === selected.key;
        const accent = OH_MODULE_ACCENT[ohModule.key];
        return (
          <button
            key={ohModule.key}
            type="button"
            onClick={() => onSelect(ohModule)}
            aria-pressed={isSelected}
            data-testid={`oh-home-module-${ohModule.slug}`}
            className={cn(
              "group -mb-px flex shrink-0 items-center gap-2 border-b-2 text-[13.5px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:text-brand-primary",
              isSelected ? cn(accent.rule, "font-semibold text-brand-navy") : "border-transparent font-medium text-dash-muted hover:text-brand-navy",
            )}
          >
            {createElement(OH_MODULE_ICON[ohModule.key], {
              className: cn("size-4 shrink-0", isSelected ? accent.icon : "text-dash-muted/80 group-hover:text-brand-navy"),
              "aria-hidden": true,
            })}
            {ohModule.label}
            <ModuleBadge ohModule={ohModule} />
          </button>
        );
      })}
    </nav>
  );
}
