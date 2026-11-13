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
import { formatVisitElapsed } from "@/features/customers/utils/format-visit-elapsed";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type EdgePanel = "info" | "history" | "examinations" | "bill";

type OhEncounterEdgeRailProps = {
  visitUuid: string;
  encounterUuid: string;
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="min-w-0"
      data-testid={`oh-toolbar-fact-${label.toLowerCase().replaceAll(" ", "-")}`}
    >
      <dt className="text-[10px] font-medium uppercase tracking-wide text-dash-muted">
        {label}
      </dt>
      <dd className="truncate text-[13px] font-medium leading-tight text-brand-navy">
        {value || "—"}
      </dd>
    </div>
  );
}

function startedLabel(startedAt: string | null | undefined): string {
  if (!startedAt) {
    return "—";
  }
  const elapsed = formatVisitElapsed(startedAt);
  if (!elapsed) {
    return "—";
  }
  return elapsed === "Just now" ? "Just now" : `${elapsed} ago`;
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
    const open = openChargeCount(charges);
    return open === 0 ? "No items on the bill yet" : `${open} on this visit`;
  }
  return "This encounter and employment";
}

/** Right-hand visit tools: facts, info, history, examinations, and the bill. */
export function OhEncounterEdgeRail({
  visitUuid,
  encounterUuid,
  encounter = null,
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
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggle(next: EdgePanel) {
    setPanel((current) => (current === next ? null : next));
  }

  const facts = (
    <dl
      className={cn(
        "grid grid-cols-1 gap-2",
        desktop ? "px-3 py-3" : "flex gap-3 px-3 py-2",
      )}
      data-testid="oh-toolbar-facts"
    >
      <Fact label="Employer" value={encounter?.employer_name?.trim() || "—"} />
      <Fact
        label="Risk profile"
        value={encounter?.hazard_profile_name?.trim() || "—"}
      />
      <Fact label="Started" value={startedLabel(encounter?.started_at)} />
    </dl>
  );

  const actionList = (
    <div
      className="flex flex-col gap-0.5 px-1.5 py-2"
      data-testid="oh-encounter-edge-rail"
    >
      {ACTIONS.map((action) => {
        const selected = panel === action.id;
        const badge =
          action.id === "examinations"
            ? examinations.length
            : action.id === "bill"
              ? openChargeCount(billingCharges)
              : 0;
        return (
          <button
            key={action.id}
            type="button"
            aria-label={action.label}
            aria-pressed={selected}
            data-testid={`oh-toolbar-action-${action.id}`}
            onClick={() => {
              toggle(action.id);
              setMobileOpen(false);
            }}
            className={cn(
              "relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
              selected
                ? "bg-brand-tint font-medium text-brand-primary"
                : "text-brand-navy hover:bg-slate-50",
            )}
          >
            <HugeiconsIcon icon={action.icon} size={16} strokeWidth={1.8} />
            <span className="min-w-0 flex-1 truncate">{action.label}</span>
            {badge > 0 ? (
              <span
                aria-hidden
                className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-semibold leading-none text-white"
              >
                {badge > 9 ? "9+" : badge}
              </span>
            ) : null}
          </button>
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

  if (!desktop) {
    return (
      <>
        <div
          className="order-2 shrink-0 border-b border-dash-border bg-white lg:hidden"
          data-testid="oh-workspace-toolbar-strip"
        >
          <div className="flex items-stretch">
            <div className="min-w-0 flex-1 overflow-x-auto">{facts}</div>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex shrink-0 items-center gap-1 border-l border-dash-border px-3 text-xs font-medium text-brand-navy hover:bg-slate-50"
              data-testid="oh-toolbar-tools-trigger"
            >
              Tools
            </button>
          </div>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="right"
            className={cn(
              appFont.className,
              "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
            )}
          >
            <SheetHeader className="space-y-1 border-b border-dash-border px-5 py-4 pr-12 text-left">
              <SheetTitle className="text-[16px] font-semibold tracking-tight text-brand-navy">
                Tools
              </SheetTitle>
              <SheetDescription className="text-[13px] text-dash-muted">
                Info, history, examinations and the bill
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              {actionList}
            </div>
          </SheetContent>
        </Sheet>
        {sheet}
      </>
    );
  }

  return (
    <>
      <aside
        className="hidden min-h-0 w-52 shrink-0 flex-col overflow-y-auto border-l border-dash-border bg-white lg:flex lg:order-last"
        data-testid="oh-workspace-toolbar-rail"
      >
        {facts}
        <div className="border-t border-dash-border">{actionList}</div>
      </aside>
      {sheet}
    </>
  );
}
