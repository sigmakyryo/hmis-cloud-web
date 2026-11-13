"use client";

import {
  sessionFormStepKey,
  type SessionFormStep,
  type SessionStepStatus,
} from "@/features/occupational-health/lib/oh-session-forms";
import {
  OH_CLINICAL_MODULES,
  isClinicalModulePanel,
  sessionStatusLabel,
  type OhClinicalModuleId,
} from "@/features/occupational-health/lib/oh-visit-workspace";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import { useOhDesktopWorkspace } from "@/features/occupational-health/hooks/use-oh-desktop-workspace";
import { cn } from "@/lib/utils";

type OhVisitJourneyRailProps = {
  steps: SessionFormStep[];
  activeStep: string;
  liveStep: string;
  statuses: Record<string, SessionStepStatus>;
  activePanel: OhEncounterPanelId;
  needsEmployment?: boolean;
  onSelectStep: (step: string) => void;
  onSelectModule: (panel: OhClinicalModuleId) => void;
};

export function OhVisitJourneyRail(props: OhVisitJourneyRailProps) {
  const desktop = useOhDesktopWorkspace();

  return (
    <div data-testid="oh-visit-journey" className="contents">
      {desktop ? <JourneyRail {...props} /> : <JourneyStrip {...props} />}
    </div>
  );
}

function JourneyRail({
  steps,
  activeStep,
  liveStep,
  statuses,
  activePanel,
  needsEmployment = false,
  onSelectStep,
  onSelectModule,
}: OhVisitJourneyRailProps) {
  return (
    <aside
      className="hidden min-h-0 w-[16.5rem] shrink-0 overflow-y-auto border-r border-dash-border/70 bg-white lg:block lg:order-1"
      data-testid="oh-visit-journey-rail"
    >
      <div className="px-3 py-4">
        <nav aria-label="Consult" data-testid="oh-session-form-nav">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            This visit
          </p>
          <ol className="flex flex-col gap-0.5">
            {steps.map((step) => {
              const key = sessionFormStepKey(step);
              return (
                <li key={key}>
                  <StepButton
                    step={step}
                    active={
                      key === activeStep && !isClinicalModulePanel(activePanel)
                    }
                    live={key === liveStep}
                    status={statuses[key] ?? "not_started"}
                    onSelect={onSelectStep}
                    layout="rail"
                  />
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="mx-2 my-4 h-px bg-dash-border" aria-hidden />
        <nav aria-label="Also in this visit">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Also in this visit
          </p>
          <ul className="flex flex-col gap-0.5">
            {OH_CLINICAL_MODULES.map((module) => {
              const active = activePanel === module.id;
              const needed = module.id === "employment" && needsEmployment;
              return (
                <li key={module.id}>
                  <button
                    type="button"
                    data-testid={`oh-journey-module-${module.id}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelectModule(module.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
                      active
                        ? "bg-brand-primary/10 font-medium text-brand-navy"
                        : "text-brand-navy hover:bg-muted",
                    )}
                  >
                    <span className="min-w-0 truncate">{module.label}</span>
                    {needed ? (
                      <span className="shrink-0 text-[11px] font-medium text-amber-800">
                        Needed
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

function JourneyStrip({
  steps,
  activeStep,
  liveStep,
  statuses,
  activePanel,
  needsEmployment = false,
  onSelectStep,
  onSelectModule,
}: OhVisitJourneyRailProps) {
  return (
    <nav
      aria-label="Consult"
      className="scrollbar-hide order-1 shrink-0 border-b border-dash-border/60 bg-white lg:hidden"
      data-testid="oh-visit-journey-strip"
    >
      <div className="overflow-x-auto px-3 py-2">
        <div className="flex min-w-max items-center gap-1.5">
          {steps.map((step, index) => {
            const key = sessionFormStepKey(step);
            return (
              <span key={key} className="flex items-center gap-1.5">
                <StepButton
                  step={step}
                  active={
                    key === activeStep && !isClinicalModulePanel(activePanel)
                  }
                  live={key === liveStep}
                  status={statuses[key] ?? "not_started"}
                  onSelect={onSelectStep}
                  layout="strip"
                />
                {index < steps.length - 1 ? (
                  <span aria-hidden className="h-px w-3 bg-dash-border" />
                ) : null}
              </span>
            );
          })}
          <span aria-hidden className="mx-1 h-4 w-px bg-dash-border" />
          {OH_CLINICAL_MODULES.map((module) => {
            const active = activePanel === module.id;
            const needed = module.id === "employment" && needsEmployment;
            return (
              <button
                key={module.id}
                type="button"
                data-testid={`oh-journey-module-${module.id}`}
                aria-current={active ? "page" : undefined}
                onClick={() => onSelectModule(module.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium outline-none",
                  "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                  active
                    ? "bg-brand-primary/10 text-brand-navy"
                    : "text-brand-muted hover:bg-muted",
                )}
              >
                {module.label}
                {needed ? (
                  <span className="text-amber-800">· Needed</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function StepButton({
  step,
  active,
  live,
  status,
  onSelect,
  layout,
}: {
  step: SessionFormStep;
  active: boolean;
  live: boolean;
  status: SessionStepStatus;
  onSelect: (step: string) => void;
  layout: "rail" | "strip";
}) {
  const key = sessionFormStepKey(step);
  const locked = status === "locked";
  const label = sessionStatusLabel(status);
  const title = locked
    ? "Finish the examination before opening this step"
    : undefined;

  if (layout === "strip") {
    return (
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        aria-disabled={locked || undefined}
        title={title}
        onClick={() => {
          if (!locked) onSelect(key);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium outline-none",
          "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
          active && "bg-brand-primary/10 text-brand-navy",
          !active && !locked && "text-brand-muted hover:bg-muted",
          locked && "cursor-not-allowed text-dash-muted",
        )}
        data-testid={`oh-session-step-${key}`}
        data-status={status}
        data-live={live || undefined}
      >
        <span>{step.title}</span>
        <span className="sr-only"> ({label})</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      aria-disabled={locked || undefined}
      title={title}
      onClick={() => {
        if (!locked) onSelect(key);
      }}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
        active && "bg-brand-primary/10 font-medium text-brand-navy",
        !active && !locked && "text-brand-navy hover:bg-muted",
        locked && "cursor-not-allowed text-dash-muted",
        live && !active && "ring-1 ring-inset ring-brand-primary/20",
      )}
      data-testid={`oh-session-step-${key}`}
      data-status={status}
      data-live={live || undefined}
    >
      <span className="min-w-0 truncate">{step.title}</span>
      <span className="shrink-0 text-[11px] font-medium text-dash-muted">
        {label}
      </span>
      <span className="sr-only"> ({label})</span>
    </button>
  );
}
