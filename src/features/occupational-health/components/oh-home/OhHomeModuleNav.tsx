"use client";

import { createElement, type ReactNode } from "react";
import { ListChecks } from "lucide-react";

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
function NavTab({
  selected,
  selectedRule,
  testId,
  onClick,
  icon,
  label,
  badge,
}: {
  selected: boolean;
  selectedRule: string;
  testId: string;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-testid={testId}
      className={cn(
        "group -mb-px flex shrink-0 items-center gap-2 border-b-2 text-[13.5px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:text-brand-primary",
        selected ? cn(selectedRule, "font-semibold text-brand-navy") : "border-transparent font-medium text-dash-muted hover:text-brand-navy",
      )}
    >
      {icon}
      {label}
      {badge}
    </button>
  );
}

export function OhHomeModuleNav({
  modules,
  selected,
  queueSelected,
  onSelect,
  onSelectQueue,
}: {
  modules: OhModule[];
  selected: OhModule;
  queueSelected: boolean;
  onSelect: (ohModule: OhModule) => void;
  onSelectQueue: () => void;
}) {
  const clinicAccent = OH_MODULE_ACCENT.OccupationalHealth;

  return (
    <nav
      aria-label="Modules"
      className="scrollbar-hide flex h-12 shrink-0 items-stretch gap-7 overflow-x-auto border-b border-dash-border bg-white px-5 md:px-8"
    >
      {modules.flatMap((ohModule) => {
        const isSelected = !queueSelected && ohModule.key === selected.key;
        const accent = OH_MODULE_ACCENT[ohModule.key];
        const tab = (
          <NavTab
            key={ohModule.key}
            selected={isSelected}
            selectedRule={accent.rule}
            testId={`oh-home-module-${ohModule.slug}`}
            onClick={() => onSelect(ohModule)}
            icon={createElement(OH_MODULE_ICON[ohModule.key], {
              className: cn("size-4 shrink-0", isSelected ? accent.icon : "text-dash-muted/80 group-hover:text-brand-navy"),
              "aria-hidden": true,
            })}
            label={ohModule.label}
            badge={<ModuleBadge ohModule={ohModule} />}
          />
        );
        if (ohModule.key !== "OccupationalHealth") {
          return [tab];
        }
        return [
          tab,
          <NavTab
            key="queue"
            selected={queueSelected}
            selectedRule={clinicAccent.rule}
            testId="oh-home-module-queue"
            onClick={onSelectQueue}
            icon={
              <ListChecks
                className={cn("size-4 shrink-0", queueSelected ? clinicAccent.icon : "text-dash-muted/80 group-hover:text-brand-navy")}
                aria-hidden
              />
            }
            label="Queue"
          />,
        ];
      })}
    </nav>
  );
}
