"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ClipboardListIcon,
  HistoryIcon,
  InformationCircleIcon,
  Invoice01Icon,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OhClinicalHistoryPanel } from "@/features/occupational-health/components/OhClinicalHistoryPanel";
import {
  OhEncounterSummaryRail,
  OhExaminationLedger,
} from "@/features/occupational-health/components/OhCorporateWorkspace";
import { OhVisitBillingList } from "@/features/occupational-health/components/workspace/OhVisitBillingList";
import { useOhDesktopWorkspace } from "@/features/occupational-health/hooks/use-oh-desktop-workspace";
import type {
  EmploymentEpisode,
  OhExamination,
  OhVisitBillingCharge,
  OhVisitEncounter,
} from "@/features/occupational-health/types";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type EdgePanel = "info" | "history" | "examinations" | "bill";

type OhEncounterEdgeRailProps = {
  visitUuid: string;
  encounterUuid: string;
  /** Kept so callers can pass the encounter; facts now live on the Info sheet and patient chip. */
  encounter?: OhVisitEncounter | null;
  examinations: OhExamination[];
  activeExamUuid?: string | null;
  findingCount: number;
  episodes: EmploymentEpisode[];
  billingCharges?: OhVisitBillingCharge[];
  onManageEmployment: () => void;
  onOpenExamination: (exam: OhExamination) => void;
  onStartExamination: () => void;
};

const ACTIONS: Array<{ id: EdgePanel; label: string; icon: IconSvgElement }> = [
  { id: "info", label: "Info", icon: InformationCircleIcon },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "examinations", label: "Examinations", icon: ClipboardListIcon },
  { id: "bill", label: "Bill", icon: Invoice01Icon },
];

function openChargeCount(charges: OhVisitBillingCharge[]): number {
  return charges.filter((charge) => charge.status !== "removed").length;
}

function failedChargeCount(charges: OhVisitBillingCharge[]): number {
  return charges.filter((charge) => charge.status === "failed").length;
}

function panelTitle(panel: EdgePanel | null): string {
  if (panel === "history") return "History";
  if (panel === "examinations") return "Examinations";
  if (panel === "bill") return "Bill";
  return "Info";
}

function panelDescription(
  panel: EdgePanel | null,
  examinations: OhExamination[],
  charges: OhVisitBillingCharge[],
): string {
  if (panel === "history") {
    return "Earlier occupational health visits";
  }
  if (panel === "examinations") {
    return examinations.length === 0
      ? "None recorded on this encounter"
      : `${examinations.length} on this encounter`;
  }
  if (panel === "bill") {
    const failed = failedChargeCount(charges);
    if (failed > 0) {
      return `${failed} failed to send`;
    }
    const open = openChargeCount(charges);
    return open === 0 ? "No items on the bill yet" : `${open} on this visit`;
  }
  return "This encounter and employment";
}

type ActionBadge = {
  count: number;
  tone: "default" | "danger";
  hint: string;
};

function actionBadge(
  id: EdgePanel,
  examinations: OhExamination[],
  charges: OhVisitBillingCharge[],
): ActionBadge | null {
  if (id === "examinations" && examinations.length > 0) {
    return {
      count: examinations.length,
      tone: "default",
      hint: `${examinations.length} on this encounter`,
    };
  }
  if (id === "bill") {
    const failed = failedChargeCount(charges);
    if (failed > 0) {
      return {
        count: failed,
        tone: "danger",
        hint: `${failed} failed to send`,
      };
    }
    const open = openChargeCount(charges);
    if (open > 0) {
      return { count: open, tone: "default", hint: `${open} on this visit` };
    }
  }
  return null;
}

/** Right-hand visit tools as a slim icon rail: info, history, examinations, and the bill. */
export function OhEncounterEdgeRail({
  visitUuid,
  encounterUuid,
  examinations,
  activeExamUuid = null,
  findingCount,
  episodes,
  billingCharges = [],
  onManageEmployment,
  onOpenExamination,
  onStartExamination,
}: OhEncounterEdgeRailProps) {
  const desktop = useOhDesktopWorkspace();
  const [panel, setPanel] = useState<EdgePanel | null>(null);

  function toggle(next: EdgePanel) {
    setPanel((current) => (current === next ? null : next));
  }

  const actionList = (
    <div
      className={cn(
        "flex",
        desktop
          ? "flex-col items-center gap-1 px-1.5 py-2"
          : "flex-row items-center justify-end gap-1 px-2 py-1.5",
      )}
      data-testid="oh-encounter-edge-rail"
    >
      {ACTIONS.map((action) => {
        const selected = panel === action.id;
        const badge = actionBadge(action.id, examinations, billingCharges);
        const tooltip = badge ? `${action.label} · ${badge.hint}` : action.label;
        return (
          <Tooltip key={action.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={action.label}
                aria-pressed={selected}
                data-testid={`oh-toolbar-action-${action.id}`}
                onClick={() => toggle(action.id)}
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-md",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
                  selected
                    ? "bg-brand-tint text-brand-primary"
                    : "text-brand-navy hover:bg-slate-50",
                )}
              >
                <HugeiconsIcon icon={action.icon} size={18} strokeWidth={1.8} />
                {badge ? (
                  <span
                    aria-hidden
                    data-testid={`oh-toolbar-badge-${action.id}`}
                    data-tone={badge.tone}
                    className={cn(
                      "absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[8px] font-semibold leading-none text-white",
                      badge.tone === "danger" ? "bg-red-600" : "bg-brand-primary",
                    )}
                  >
                    {badge.count > 9 ? "9+" : badge.count}
                  </span>
                ) : null}
              </button>
            </TooltipTrigger>
            <TooltipContent side={desktop ? "left" : "bottom"}>
              {tooltip}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );

  const sheet = (
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
            {panelTitle(panel)}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-dash-muted">
            {panelDescription(panel, examinations, billingCharges)}
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
          {panel === "bill" ? (
            <OhVisitBillingList charges={billingCharges} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <TooltipProvider delayDuration={200}>
      {desktop ? (
        <aside
          className="hidden min-h-0 w-14 shrink-0 flex-col overflow-y-auto border-l border-dash-border bg-white lg:flex lg:order-last"
          data-testid="oh-workspace-toolbar-rail"
        >
          {actionList}
        </aside>
      ) : (
        <div
          className="order-2 shrink-0 border-b border-dash-border bg-white lg:hidden"
          data-testid="oh-workspace-toolbar-strip"
        >
          {actionList}
        </div>
      )}
      {sheet}
    </TooltipProvider>
  );
}
