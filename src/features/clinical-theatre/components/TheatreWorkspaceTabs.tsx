"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  onTheatreRailKeyDown,
  TheatreFlowRail,
} from "@/features/clinical-theatre/components/case-flow/TheatreFlowRail";
import { theatreCaseHref } from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import { useTheatreCaseForEncounter } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import { useTheatreFlowExtras } from "@/features/clinical-theatre/hooks/use-theatre-case-flow";
import {
  buildTheatreFlow,
  resolveTheatreFlowLocation,
  theatreFlowStepHref,
  type TheatreFlowStep,
  type TheatreFlowStepId,
} from "@/features/clinical-theatre/utils/theatre-case-flow";
import { cn } from "@/lib/utils";

type TheatreWorkspaceTabsProps = {
  visitUuid: string;
  encounterUuid: string;
};

type NavModel = {
  steps: TheatreFlowStep[];
  activeStep: TheatreFlowStepId | null;
  stepHref: (id: TheatreFlowStepId) => string;
};

/**
 * Vertical case-flow rail (desktop) and a horizontal strip (mobile):
 * perioperative steps only. Record sections live on the right-hand toolbar.
 * The rail scrolls independently of the page body.
 */
export function TheatreWorkspaceTabs({
  visitUuid,
  encounterUuid,
}: TheatreWorkspaceTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const model: NavModel = {
    steps,
    activeStep,
    stepHref: (id) => theatreFlowStepHref(caseHref, id),
  };

  if (steps.length === 0) {
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
  const { steps, activeStep, stepHref } = model;
  return (
    <nav
      aria-label="Theatre case steps"
      className="scrollbar-hide order-1 shrink-0 border-b border-dash-border/60 lg:hidden"
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
        </div>
      </div>
    </nav>
  );
}

function TheatreWorkspaceRail({ model }: { model: NavModel }) {
  const { steps, activeStep, stepHref } = model;
  return (
    <aside
      className="hidden min-h-0 w-[17rem] shrink-0 overflow-y-auto border-r border-dash-border/70 lg:order-1 lg:block"
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
          <TheatreFlowRail
            steps={steps}
            activeStep={activeStep}
            hrefFor={stepHref}
          />
        </nav>
      </div>
    </aside>
  );
}
