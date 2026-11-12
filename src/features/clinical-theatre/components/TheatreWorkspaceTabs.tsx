"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, TriangleAlert } from "lucide-react";

import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import {
  THEATRE_WORKSPACE_ROUTING,
  theatreCaseHref,
} from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import { useTheatreFlowExtras } from "@/features/clinical-theatre/hooks/use-theatre-case-flow";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  buildTheatreFlow,
  resolveTheatreFlowLocation,
  theatreFlowStepHref,
  type TheatreFlowStepState,
} from "@/features/clinical-theatre/utils/theatre-case-flow";
import {
  getVisibleWorkspaceMenuSections,
  workspaceTabFromPathname,
  workspaceTabHref,
} from "@/features/clinical-workspace/utils/workspace-tabs";
import { cn } from "@/lib/utils";

type TheatreWorkspaceTabsProps = {
  visitUuid: string;
  encounterUuid: string;
  theatreCase: TheatreCase | null;
};

function tabClass(active: boolean) {
  return cn(
    "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs font-medium outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
    active
      ? "border-brand-primary text-brand-navy"
      : "border-transparent text-muted-foreground hover:text-brand-navy",
  );
}

function StepPip({ state }: { state: TheatreFlowStepState }) {
  if (state === "done") {
    return <Check className="size-3 text-emerald-600" strokeWidth={3} aria-hidden />;
  }
  if (state === "blocked" || state === "attention") {
    return <TriangleAlert className="size-3 text-amber-600" aria-hidden />;
  }
  if (state === "current") {
    return (
      <span
        className="size-1.5 shrink-0 rounded-full bg-brand-primary"
        aria-hidden
      />
    );
  }
  return null;
}

/**
 * Case-flow steps and patient-record sections, as a horizontal tab bar.
 * Replaces the header "More" menu and the case-flow side rail.
 */
export function TheatreWorkspaceTabs({
  visitUuid,
  encounterUuid,
  theatreCase,
}: TheatreWorkspaceTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { capabilities = [] } = useOpdEncounterWorkspace();
  const extras = useTheatreFlowExtras(theatreCase ?? undefined);
  const steps = theatreCase ? buildTheatreFlow(theatreCase, extras) : [];
  const caseHref = theatreCaseHref(visitUuid, encounterUuid);
  const onCase = pathname === caseHref || pathname.startsWith(`${caseHref}/`);
  const activeStep = theatreCase && onCase
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
  // The "case" route is represented by the flow-step tabs, not a record tab.
  const activeRecordId = activeRecord !== "case" ? activeRecord : null;

  if (steps.length === 0 && recordSections.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Theatre case sections"
      className="border-t border-dash-border/60"
      data-testid="theatre-workspace-tabs"
    >
      <div className="scrollbar-hide flex min-w-0 items-end gap-0 overflow-x-auto px-4 sm:px-6">
        {steps.map((step) => {
          const active = step.id === activeStep;
          return (
            <Link
              key={step.id}
              href={theatreFlowStepHref(caseHref, step.id)}
              scroll={false}
              data-flow-step={step.id}
              data-state={step.state}
              aria-current={active ? "step" : undefined}
              className={tabClass(active)}
            >
              <StepPip state={step.state} />
              {step.label}
            </Link>
          );
        })}
        {steps.length > 0 && recordSections.length > 0 ? (
          <span
            role="presentation"
            className="mx-2 mb-2 h-4 w-px shrink-0 bg-dash-border/80"
            aria-hidden
          />
        ) : null}
        {recordSections.map((section) => {
          const href = workspaceTabHref(
            THEATRE_WORKSPACE_ROUTING,
            visitUuid,
            encounterUuid,
            section.id,
          );
          const active = activeRecordId === section.id;
          return (
            <Link
              key={section.id}
              href={href}
              aria-current={active ? "page" : undefined}
              data-testid={`theatre-record-tab-${section.id}`}
              className={tabClass(active)}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
