"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ClipboardListIcon,
  HistoryIcon,
  InformationCircleIcon,
  VaccineIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { OhClinicalHistoryPanel } from "@/features/occupational-health/components/OhClinicalHistoryPanel";
import {
  OhEncounterSummaryRail,
  OhExaminationLedger,
} from "@/features/occupational-health/components/OhCorporateWorkspace";
import type { EmploymentEpisode, OhExamination } from "@/features/occupational-health/types";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type EdgePanel = "info" | "history" | "examinations" | "immunizations";

type OhEncounterEdgeRailProps = {
  visitUuid: string;
  encounterUuid: string;
  examinations: OhExamination[];
  activeExamUuid?: string | null;
  findingCount: number;
  episodes: EmploymentEpisode[];
  onManageEmployment: () => void;
  onOpenImmunizations?: () => void;
  onOpenExamination: (exam: OhExamination) => void;
  onStartExamination: () => void;
};

const ACTIONS: Array<{ id: EdgePanel; label: string; icon: IconSvgElement }> = [
  { id: "info", label: "Info", icon: InformationCircleIcon },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "examinations", label: "Examinations", icon: ClipboardListIcon },
  { id: "immunizations", label: "Immunizations", icon: VaccineIcon },
];

export function OhEncounterEdgeRail({
  visitUuid,
  encounterUuid,
  examinations,
  activeExamUuid = null,
  findingCount,
  episodes,
  onManageEmployment,
  onOpenImmunizations,
  onOpenExamination,
  onStartExamination,
}: OhEncounterEdgeRailProps) {
  const [panel, setPanel] = useState<EdgePanel | null>(null);

  function toggle(next: EdgePanel) {
    setPanel((current) => (current === next ? null : next));
  }

  return (
    <>
      <nav
        aria-label="Encounter details"
        className="flex w-12 shrink-0 flex-col items-center gap-1 border-l border-dash-border bg-white py-3"
        data-testid="oh-encounter-edge-rail"
      >
        {ACTIONS.map((action) => {
          const selected = panel === action.id;
          return (
            <button
              key={action.id}
              type="button"
              aria-label={action.label}
              aria-pressed={selected}
              onClick={() => {
                if (action.id === "immunizations") {
                  onOpenImmunizations?.();
                  setPanel(null);
                  return;
                }
                toggle(action.id);
              }}
              className={cn(
                "relative flex size-9 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
                selected
                  ? "bg-brand-tint text-brand-primary"
                  : "text-dash-muted hover:bg-slate-50 hover:text-brand-navy",
              )}
            >
              <HugeiconsIcon icon={action.icon} size={18} strokeWidth={1.8} />
              {action.id === "examinations" && examinations.length > 0 ? (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-semibold leading-none text-white"
                >
                  {examinations.length > 9 ? "9+" : examinations.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <Sheet
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPanel(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className={cn(
            appFont.className,
            "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
          )}
        >
          <SheetHeader className="space-y-1 border-b border-dash-border px-5 py-4 pr-12 text-left">
            <SheetTitle className="text-[16px] font-semibold tracking-tight text-brand-navy">
              {panel === "history"
                ? "History"
                : panel === "examinations"
                  ? "Examinations"
                  : "Info"}
            </SheetTitle>
            <SheetDescription className="text-[13px] text-dash-muted">
              {panel === "history"
                ? "Earlier occupational health visits"
                : panel === "examinations"
                  ? examinations.length === 0
                    ? "None recorded on this encounter"
                    : `${examinations.length} on this encounter`
                  : "This encounter and employment"}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {panel === "info" ? (
              <OhEncounterSummaryRail
                examinationCount={examinations.length}
                findingCount={findingCount}
                episodes={episodes}
                onManageEmployment={() => {
                  setPanel(null);
                  onManageEmployment();
                }}
              />
            ) : null}
            {panel === "examinations" ? (
              <OhExaminationLedger
                examinations={examinations}
                activeExamUuid={activeExamUuid}
                onOpen={(exam) => {
                  setPanel(null);
                  onOpenExamination(exam);
                }}
                onStart={() => {
                  setPanel(null);
                  onStartExamination();
                }}
              />
            ) : null}
            {panel === "history" ? (
              <OhClinicalHistoryPanel
                visitUuid={visitUuid}
                encounterUuid={encounterUuid}
                variant="sheet"
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
