"use client";

import { Briefcase } from "lucide-react";
import type { ReactNode } from "react";

import {
  OH_ENCOUNTER_MODULES,
  type OhEncounterPanelId,
} from "@/features/occupational-health/lib/oh-encounter-modules";
import { cn } from "@/lib/utils";

type OhEncounterModuleNavProps = {
  activePanel: OhEncounterPanelId;
  onPanelChange: (panel: OhEncounterPanelId) => void;
  lockedPanels?: readonly OhEncounterPanelId[];
  className?: string;
};

export function OhEncounterModuleNav({
  activePanel,
  onPanelChange,
  lockedPanels = [],
  className,
}: OhEncounterModuleNavProps) {
  return (
    <nav
      aria-label="Occupational health modules"
      className={cn(
        "flex h-full min-h-0 flex-col border-b border-dash-border bg-white xl:border-b-0 xl:border-r",
        className,
      )}
      data-testid="oh-encounter-module-nav"
    >
      <p className="hidden px-4 pb-1 pt-4 text-[13px] font-semibold text-brand-navy xl:block">
        This visit
      </p>
      <div className="scrollbar-hide flex gap-1 overflow-x-auto px-2 py-2 xl:min-h-0 xl:flex-1 xl:flex-col xl:gap-0.5 xl:overflow-y-auto xl:px-2 xl:pb-3">
        {OH_ENCOUNTER_MODULES.map((module) => {
          const Icon = module.icon;
          return (
            <NavButton
              key={module.id}
              selected={activePanel === module.id}
              label={module.label}
              disabled={lockedPanels.includes(module.id)}
              onClick={() => onPanelChange(module.id)}
              icon={<Icon className="size-4" aria-hidden />}
            />
          );
        })}
        <div className="xl:mt-auto xl:border-t xl:border-dash-border xl:pt-2">
          <NavButton
            selected={activePanel === "employment"}
            label="Employment"
            onClick={() => onPanelChange("employment")}
            icon={<Briefcase className="size-4" aria-hidden />}
          />
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  selected,
  label,
  onClick,
  icon,
  disabled = false,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  icon: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={selected ? "page" : undefined}
      title={disabled ? "Save the previous step first" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
        "xl:w-full",
        disabled && "cursor-not-allowed opacity-50",
        selected
          ? "bg-brand-tint font-medium text-brand-navy"
          : "text-brand-slate hover:bg-dash-canvas hover:text-brand-navy",
      )}
    >
      <span className={cn("shrink-0", selected ? "text-brand-primary" : "text-dash-muted")}>
        {icon}
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}
