"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import {
  onTheatreRailKeyDown,
  TheatreFlowRail,
} from "@/features/clinical-theatre/components/case-flow/TheatreFlowRail";
import {
  THEATRE_WORKSPACE_ROUTING,
  theatreCaseHref,
} from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import { useTheatreCaseForEncounter } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import { useTheatreFlowExtras } from "@/features/clinical-theatre/hooks/use-theatre-case-flow";
import {
  buildTheatreFlow,
  resolveTheatreFlowLocation,
  theatreFlowStepHref,
  type TheatreFlowStep,
  type TheatreFlowStepId,
} from "@/features/clinical-theatre/utils/theatre-case-flow";
import {
  getVisibleWorkspaceMenuSections,
  workspaceTabFromPathname,
  workspaceTabHref,
} from "@/features/clinical-workspace/utils/workspace-tabs";
import type { ClinicalWorkspaceTab } from "@/features/clinical-workspace/types/clinical-workspace.types";
import { cn } from "@/lib/utils";

type TheatreWorkspaceTabsProps = {
  visitUuid: string;
  encounterUuid: string;
};

type NavModel = {
  steps: TheatreFlowStep[];
  activeStep: TheatreFlowStepId | null;
  stepHref: (id: TheatreFlowStepId) => string;
  recordSections: ClinicalWorkspaceTab[];
  recordHref: (id: string) => string;
  activeRecordId: string | null;
};

/**
 * Vertical section rail (desktop) and a horizontal strip (mobile): case-flow
 * steps and patient-record sections in one "Perioperative journey" list.
 * Shown on every theatre encounter page. The rail scrolls independently of
 * the page body.
 */
export function TheatreWorkspaceTabs({
  visitUuid,
  encounterUuid,
}: TheatreWorkspaceTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { capabilities = [] } = useOpdEncounterWorkspace();
  const { theatreCase } = useTheatreCaseForEncounter(encounterUuid);
  const extras = useTheatreFlowExtras(theatreCase ?? undefined);
  const steps = theatreCase ? buildTheatreFlow(theatreCase, extras) : [];
  const caseHref = theatreCaseHref(visitUuid, encounterUuid);
  const onCase = pathname === caseHref || pathname.startsWith(`${caseHref}/`);
  const activeStep: TheatreFlowStepId | null =
    theatreCase && onCase
      ? resolveTheatreFlowLocation(
          theatreCase,
          searchParams.get("step"),
          searchParams.get("section"),
        ).step
      : null;
  const recordSections = getVisibleWorkspaceMenuSections(
    THEATRE_WORKSPACE_ROUTING,
    capabilities,
  );
  const activeRecord = workspaceTabFromPathname(
    THEATRE_WORKSPACE_ROUTING,
    pathname,
    visitUuid,
    encounterUuid,
  );
  const model: NavModel = {
    steps,
    activeStep,
    stepHref: (id) => theatreFlowStepHref(caseHref, id),
    recordSections,
    recordHref: (id) =>
      workspaceTabHref(THEATRE_WORKSPACE_ROUTING, visitUuid, encounterUuid, id),
    activeRecordId: activeRecord !== "case" ? activeRecord : null,
  };

  if (steps.length === 0 && recordSections.length === 0) {
    return null;
  }

  return (
    <div data-testid="theatre-workspace-tabs" className="contents">
      <TheatreWorkspaceStrip model={model} />
      <TheatreWorkspaceRail model={model} />
    </div>
  );
}

function TheatreWorkspaceStrip({ model }: { model: NavModel }) {
  const {
    steps,
    activeStep,
    stepHref,
    recordSections,
    recordHref,
    activeRecordId,
  } = model;
  return (
    <nav
      aria-label="Theatre case sections"
      className="scrollbar-hide shrink-0 border-b border-dash-border/60 lg:hidden"
      data-testid="theatre-workspace-strip"
    >
      <div className="overflow-x-auto px-4 py-2 sm:px-6">
        <div className="flex min-w-max items-center gap-1.5">
          {steps.map((step, index) => {
            const active = step.id === activeStep;
            return (
              <span key={step.id} className="flex items-center gap-1.5">
                <Link
                  href={stepHref(step.id)}
                  scroll={false}
                  data-flow-step={step.id}
                  data-state={step.state}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium outline-none",
                    "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                    active
                      ? "bg-brand-primary/10 text-brand-navy"
                      : "text-brand-muted hover:bg-muted",
                  )}
                >
                  {step.label}
                </Link>
                {index < steps.length - 1 ? (
                  <span aria-hidden className="h-px w-3 bg-dash-border" />
                ) : null}
              </span>
            );
          })}
          {steps.length > 0 && recordSections.length > 0 ? (
            <span
              role="presentation"
              className="mx-1 h-4 w-px shrink-0 bg-dash-border/80"
              aria-hidden
            />
          ) : null}
          {recordSections.map((section) => {
            const active = activeRecordId === section.id;
            return (
              <Link
                key={section.id}
                href={recordHref(section.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium outline-none",
                  "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                  active
                    ? "bg-brand-primary/10 text-brand-navy"
                    : "text-brand-muted hover:bg-muted",
                )}
              >
                {section.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function TheatreWorkspaceRail({ model }: { model: NavModel }) {
  const {
    steps,
    activeStep,
    stepHref,
    recordSections,
    recordHref,
    activeRecordId,
  } = model;
  return (
    <aside
      className="hidden min-h-0 w-[17rem] shrink-0 overflow-y-auto border-r border-dash-border/70 lg:block"
      data-testid="theatre-workspace-rail"
    >
      <div className="px-3 py-4">
        <nav
          aria-label="Perioperative journey"
          onKeyDown={onTheatreRailKeyDown}
        >
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">
            Perioperative journey
          </p>
          {steps.length > 0 ? (
            <TheatreFlowRail
              steps={steps}
              activeStep={activeStep}
              hrefFor={stepHref}
            />
          ) : null}
          {recordSections.length > 0 ? (
            <div
              className={cn(
                "flex flex-col",
                steps.length > 0 && "mt-1 border-t border-dash-border/60 pt-1",
              )}
            >
              {recordSections.map((section) => {
                const active = activeRecordId === section.id;
                return (
                  <Link
                    key={section.id}
                    href={recordHref(section.id)}
                    aria-current={active ? "page" : undefined}
                    data-theatre-record={section.id}
                    data-testid={`theatre-record-tab-${section.id}`}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                      active
                        ? "bg-brand-primary/[0.06] font-semibold text-brand-navy"
                        : "font-medium text-brand-navy/80 hover:bg-muted/60",
                    )}
                  >
                    <span className="truncate">{section.label}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}
