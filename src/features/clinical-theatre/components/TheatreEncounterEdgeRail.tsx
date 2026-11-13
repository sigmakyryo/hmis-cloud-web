"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ActivityIcon,
  Alert02Icon,
  ChartLineDataIcon,
  ClipboardListIcon,
  Comment01Icon,
  HealthIcon,
  InformationCircleIcon,
  MedicineIcon,
  MedicalFileIcon,
  NotebookIcon,
  StethoscopeIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { OpdVitalReading } from "@/features/clinical-opd/components/detail/OpdVitalReading";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import { useEncounterWorkspace } from "@/features/clinical-opd/hooks/use-clinical-opd";
import {
  buildOpdEncounterVitalStats,
  formatVitalRecordedLabel,
  latestVitalRecordedAt,
  type OpdEncounterVitalStat,
} from "@/features/clinical-opd/utils/opd-encounter-vitals";
import {
  THEATRE_WORKSPACE_ROUTING,
  type TheatreEncounterTabId,
} from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import type { ClinicalWorkspaceBannerProps } from "@/features/clinical-workspace/types/clinical-workspace.types";
import {
  getVisibleWorkspaceMenuSections,
  workspaceTabFromPathname,
  workspaceTabHref,
} from "@/features/clinical-workspace/utils/workspace-tabs";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

/** Record sections Daniel asked for on the right toolbar, in that order. */
const TOOLBAR_TAB_IDS: readonly TheatreEncounterTabId[] = [
  "nursing",
  "orders",
  "medications",
  "notes",
  "complaint",
  "physical-examination",
  "diagnoses",
  "allergies",
  "activity",
  "client",
  "overview",
];

const TOOLBAR_ICONS: Partial<Record<TheatreEncounterTabId, IconSvgElement>> = {
  nursing: HealthIcon,
  orders: ClipboardListIcon,
  medications: MedicineIcon,
  notes: NotebookIcon,
  complaint: Comment01Icon,
  "physical-examination": StethoscopeIcon,
  diagnoses: MedicalFileIcon,
  allergies: Alert02Icon,
  activity: ActivityIcon,
  client: UserIcon,
  overview: ChartLineDataIcon,
};

type ToolbarAction = {
  id: string;
  label: string;
  href: string;
  icon: IconSvgElement;
};

/**
 * Right-hand encounter toolbar in the occupational-health edge-rail style:
 * latest vitals with an info popover, then icon actions that open record
 * sections. Fixed; it does not scroll with the page.
 */
export function TheatreEncounterEdgeRail({
  visitUuid,
  encounterUuid,
}: ClinicalWorkspaceBannerProps) {
  const pathname = usePathname();
  const { capabilities = [], chartSummary } = useOpdEncounterWorkspace();
  const { observations } = useEncounterWorkspace(visitUuid, encounterUuid);
  const thisEncounterVitals =
    observations.data ?? chartSummary?.this_encounter_vitals ?? [];
  const stripObservations =
    thisEncounterVitals.length > 0
      ? thisEncounterVitals
      : (chartSummary?.last_vitals ?? []);
  const stats = buildOpdEncounterVitalStats(stripObservations);
  const takenLabel = formatVitalRecordedLabel(latestVitalRecordedAt(stats));
  const isLoading = observations.isLoading && !chartSummary;

  const visible = getVisibleWorkspaceMenuSections(
    THEATRE_WORKSPACE_ROUTING,
    capabilities,
  );
  const visibleById = new Map(visible.map((section) => [section.id, section]));
  const actions: ToolbarAction[] = TOOLBAR_TAB_IDS.flatMap((id) => {
    const section = visibleById.get(id);
    if (!section) return [];
    return [
      {
        id: section.id,
        label: section.label,
        href: workspaceTabHref(
          THEATRE_WORKSPACE_ROUTING,
          visitUuid,
          encounterUuid,
          section.id,
        ),
        icon: TOOLBAR_ICONS[id] ?? ClipboardListIcon,
      },
    ];
  });
  const activeId = workspaceTabFromPathname(
    THEATRE_WORKSPACE_ROUTING,
    pathname,
    visitUuid,
    encounterUuid,
  );
  const canOpenVitalSigns = visibleById.has("vital-signs");
  const vitalSignsHref = workspaceTabHref(
    THEATRE_WORKSPACE_ROUTING,
    visitUuid,
    encounterUuid,
    "vital-signs",
  );

  const model = {
    stats,
    takenLabel,
    isLoading,
    actions,
    activeId: activeId !== "case" ? activeId : null,
    canOpenVitalSigns,
    vitalSignsHref,
  };

  return (
    <div data-testid="theatre-workspace-toolbar" className="contents">
      <TheatreToolbarStrip model={model} />
      <TheatreToolbarRail model={model} />
    </div>
  );
}

type ToolbarModel = {
  stats: OpdEncounterVitalStat[];
  takenLabel: string | null;
  isLoading: boolean;
  actions: ToolbarAction[];
  activeId: string | null;
  canOpenVitalSigns: boolean;
  vitalSignsHref: string;
};

function TheatreToolbarRail({ model }: { model: ToolbarModel }) {
  return (
    <aside
      className="hidden min-h-0 w-52 shrink-0 flex-col overflow-y-auto border-l border-dash-border bg-white lg:flex lg:order-last"
      data-testid="theatre-workspace-toolbar-rail"
    >
      <VitalsBlock model={model} compact={false} />
      {model.actions.length > 0 ? (
        <TooltipProvider delayDuration={200}>
          <nav
            aria-label="Patient records"
            className="flex flex-col gap-0.5 border-t border-dash-border px-1.5 py-2"
          >
            {model.actions.map((action) => (
              <ToolbarActionLink
                key={action.id}
                action={action}
                active={model.activeId === action.id}
                showLabel
              />
            ))}
          </nav>
        </TooltipProvider>
      ) : null}
    </aside>
  );
}

function TheatreToolbarStrip({ model }: { model: ToolbarModel }) {
  const [recordsOpen, setRecordsOpen] = useState(false);
  return (
    <div
      className="order-2 shrink-0 border-b border-dash-border bg-white lg:hidden"
      data-testid="theatre-workspace-toolbar-strip"
    >
      <div className="flex items-stretch">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <VitalsBlock model={model} compact />
        </div>
        {model.actions.length > 0 ? (
          <button
            type="button"
            aria-label="Patient records"
            onClick={() => setRecordsOpen(true)}
            className="flex shrink-0 items-center gap-1 border-l border-dash-border px-3 text-xs font-medium text-brand-navy hover:bg-slate-50"
            data-testid="theatre-toolbar-records-trigger"
          >
            <HugeiconsIcon
              icon={ClipboardListIcon}
              size={16}
              strokeWidth={1.8}
            />
            Records
          </button>
        ) : null}
      </div>
      <Sheet open={recordsOpen} onOpenChange={setRecordsOpen}>
        <SheetContent
          side="right"
          className={cn(
            appFont.className,
            "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
          )}
        >
          <SheetHeader className="space-y-1 border-b border-dash-border px-5 py-4 pr-12 text-left">
            <SheetTitle className="text-[16px] font-semibold tracking-tight text-brand-navy">
              Patient records
            </SheetTitle>
            <SheetDescription className="text-[13px] text-dash-muted">
              Nursing, orders and the rest of this encounter’s chart
            </SheetDescription>
          </SheetHeader>
          <TooltipProvider delayDuration={200}>
            <nav
              aria-label="Patient records"
              className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
            >
              {model.actions.map((action) => (
                <ToolbarActionLink
                  key={action.id}
                  action={action}
                  active={model.activeId === action.id}
                  showLabel
                  onNavigate={() => setRecordsOpen(false)}
                />
              ))}
            </nav>
          </TooltipProvider>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function VitalsBlock({
  model,
  compact,
}: {
  model: ToolbarModel;
  compact: boolean;
}) {
  return (
    <section
      aria-label="Latest vital signs"
      data-testid="theatre-toolbar-vitals"
      className={cn(compact ? "px-3 py-2" : "px-3 py-3")}
    >
      <div
        className={cn(
          "flex",
          compact ? "items-center gap-2" : "items-start justify-between gap-2",
        )}
      >
        {model.isLoading ? (
          <div
            className={cn(
              compact ? "flex gap-4" : "flex w-full flex-col gap-2.5",
            )}
            aria-busy="true"
            data-testid="theatre-toolbar-vitals-skeleton"
          >
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-8 w-16 animate-pulse rounded bg-muted/70"
              />
            ))}
          </div>
        ) : (
          <dl
            className={cn(
              compact
                ? "flex min-w-max items-start gap-x-4"
                : "min-w-0 flex-1 space-y-2.5",
            )}
          >
            {model.stats.map((stat) => (
              <div
                key={stat.key}
                className="min-w-0"
                data-testid={`theatre-toolbar-vital-${stat.key}`}
              >
                <dt className="text-[10px] font-medium uppercase tracking-wide text-dash-muted">
                  {stat.label}
                </dt>
                <dd className="leading-tight">
                  <OpdVitalReading
                    value={stat.value}
                    status={stat.status}
                    emptyLabel="—"
                    size="sm"
                  />
                </dd>
              </div>
            ))}
          </dl>
        )}
        <VitalsInfoButton model={model} />
      </div>
    </section>
  );
}

function VitalsInfoButton({ model }: { model: ToolbarModel }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Vital signs details"
          className="relative flex size-8 shrink-0 items-center justify-center rounded-md text-dash-muted hover:bg-slate-50 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
          data-testid="theatre-toolbar-vitals-info"
        >
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={16}
            strokeWidth={1.8}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="left" className="w-64 space-y-2 p-3">
        <p className="text-sm font-semibold text-brand-navy">Vital signs</p>
        <p
          className="text-xs text-dash-muted"
          data-testid="theatre-toolbar-vitals-taken"
        >
          {model.takenLabel
            ? `Taken ${model.takenLabel}`
            : "No vitals recorded yet"}
        </p>
        {model.canOpenVitalSigns ? (
          <Link
            href={model.vitalSignsHref}
            className="inline-block text-xs font-medium text-brand-primary underline-offset-2 hover:underline"
            data-testid="theatre-toolbar-vitals-open"
          >
            Open vital signs
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function ToolbarActionLink({
  action,
  active,
  showLabel,
  onNavigate,
}: {
  action: ToolbarAction;
  active: boolean;
  showLabel: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={action.href}
          aria-label={action.label}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          data-testid={`theatre-toolbar-action-${action.id}`}
          className={cn(
            "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none",
            "focus-visible:ring-2 focus-visible:ring-brand-primary/30",
            active
              ? "bg-brand-tint font-semibold text-brand-primary"
              : "font-medium text-dash-muted hover:bg-slate-50 hover:text-brand-navy",
          )}
        >
          <HugeiconsIcon icon={action.icon} size={18} strokeWidth={1.8} />
          {showLabel ? <span className="truncate">{action.label}</span> : null}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="left">{action.label}</TooltipContent>
    </Tooltip>
  );
}
