"use client";

import {
  Activity,
  Briefcase,
  Check,
  FlaskConical,
  HeartPulse,
  Lock,
  Syringe,
  type LucideIcon,
} from "lucide-react";

import {
  sessionFormStepKey,
  type SessionFormStep,
  type SessionStepStatus,
} from "@/features/occupational-health/lib/oh-session-forms";
import {
  OH_CLINICAL_MODULES,
  isClinicalModulePanel,
  sessionStatusLabel,
  shortSessionStepTitle,
  type OhClinicalModuleId,
} from "@/features/occupational-health/lib/oh-visit-workspace";
import type { OhEncounterPanelId } from "@/features/occupational-health/lib/oh-encounter-modules";
import { useOhDesktopWorkspace } from "@/features/occupational-health/hooks/use-oh-desktop-workspace";
import { cn } from "@/lib/utils";

const MODULE_ICONS: Record<OhClinicalModuleId, LucideIcon> = {
  immunizations: Syringe,
  "drug-alcohol": FlaskConical,
  "health-checks": HeartPulse,
  fitness: Activity,
  employment: Briefcase,
};

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
      className="hidden min-h-0 w-56 shrink-0 overflow-y-auto border-r border-dash-border/70 bg-white lg:block lg:order-1"
      data-testid="oh-visit-journey-rail"
    >
      <div className="px-3 py-4">
        <nav aria-label="Consult" data-testid="oh-session-form-nav">
          <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            This visit
          </p>
          <ol className="flex flex-col">
            {steps.map((step, index) => {
              const key = sessionFormStepKey(step);
              return (
                <li key={key} className="relative">
                  {index < steps.length - 1 ? (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-8 bottom-0 left-[1.125rem] w-px",
                        (statuses[key] ?? "not_started") === "done"
                          ? "bg-emerald-400/80"
                          : "bg-dash-border",
                      )}
                    />
                  ) : null}
                  <StepButton
                    step={step}
                    index={index}
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
        <div className="mx-1 my-4 h-px bg-dash-border" aria-hidden />
        <nav aria-label="Also in this visit">
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Records
          </p>
          <ul className="flex flex-col gap-0.5">
            {OH_CLINICAL_MODULES.map((module) => {
              const active = activePanel === module.id;
              const needed = module.id === "employment" && needsEmployment;
              const Icon = MODULE_ICONS[module.id];
              return (
                <li key={module.id}>
                  <button
                    type="button"
                    data-testid={`oh-journey-module-${module.id}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelectModule(module.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
                      active
                        ? "bg-brand-primary/10 font-medium text-brand-navy"
                        : "text-brand-navy hover:bg-muted",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0",
                        active ? "text-brand-primary" : "text-dash-muted",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{module.label}</span>
                    {needed ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-amber-800">
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full bg-amber-500"
                        />
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
                  index={index}
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
            const Icon = MODULE_ICONS[module.id];
            return (
              <button
                key={module.id}
                type="button"
                data-testid={`oh-journey-module-${module.id}`}
                aria-current={active ? "page" : undefined}
                onClick={() => onSelectModule(module.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium outline-none",
                  "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                  active
                    ? "bg-brand-primary/10 text-brand-navy"
                    : "text-brand-muted hover:bg-muted",
                )}
              >
                <Icon className="size-3 shrink-0" aria-hidden />
                {module.label}
                {needed ? (
                  <span className="inline-flex items-center gap-1 text-amber-800">
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full bg-amber-500"
                    />
                    Needed
                  </span>
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
  index,
  active,
  live,
  status,
  onSelect,
  layout,
}: {
  step: SessionFormStep;
  index: number;
  active: boolean;
  live: boolean;
  status: SessionStepStatus;
  onSelect: (step: string) => void;
  layout: "rail" | "strip";
}) {
  const key = sessionFormStepKey(step);
  const locked = status === "locked";
  const done = status === "done";
  const label = sessionStatusLabel(status);
  const title = locked
    ? "Finish the examination before opening this step"
    : undefined;
  const short = shortSessionStepTitle(step.title);

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
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium outline-none",
          "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
          active && "bg-brand-primary/10 text-brand-navy",
          !active && !locked && "text-brand-muted hover:bg-muted",
          locked && "cursor-not-allowed text-dash-muted",
        )}
        data-testid={`oh-session-step-${key}`}
        data-status={status}
        data-live={live || undefined}
      >
        <StepMarker
          status={status}
          active={active}
          live={live}
          index={index}
          size="sm"
        />
        <span aria-hidden>{short}</span>
        <span className="sr-only">
          {step.title} ({label})
        </span>
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
        "relative flex w-full items-start gap-2.5 rounded-md px-1 py-2 text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
        active && "bg-brand-primary/10",
        !active && !locked && "hover:bg-muted",
        locked && "cursor-not-allowed",
      )}
      data-testid={`oh-session-step-${key}`}
      data-status={status}
      data-live={live || undefined}
    >
      <StepMarker status={status} active={active} live={live} index={index} />
      <span className="min-w-0 flex-1 pt-0.5">
        <span
          className={cn(
            "block text-[13px] leading-snug",
            active && "font-medium text-brand-navy",
            !active && !locked && "text-brand-navy",
            locked && "text-dash-muted",
            done && !active && "text-brand-navy",
          )}
        >
          {step.title}
        </span>
        <span className="sr-only"> ({label})</span>
      </span>
    </button>
  );
}

function StepMarker({
  status,
  active,
  live,
  index,
  size = "md",
}: {
  status: SessionStepStatus;
  active: boolean;
  live: boolean;
  index: number;
  size?: "md" | "sm";
}) {
  const done = status === "done";
  const locked = status === "locked";
  const current = (active || live) && !done && !locked;
  const small = size === "sm";

  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 flex shrink-0 items-center justify-center rounded-full border font-semibold",
        small ? "size-5 text-[9px]" : "size-[1.375rem] text-[10px]",
        done && "border-emerald-500 bg-emerald-500 text-white",
        locked && "border-dash-border bg-white text-dash-muted",
        current &&
          "border-brand-primary bg-brand-primary text-white ring-2 ring-brand-primary/20 ring-offset-2",
        !done &&
          !locked &&
          !current &&
          "border-dash-border bg-white text-brand-muted",
        live && !active && !done && !locked && "ring-2 ring-brand-primary/25",
      )}
    >
      {done ? (
        <Check className={small ? "size-2.5" : "size-3"} strokeWidth={3} />
      ) : locked ? (
        <Lock className={small ? "size-2.5" : "size-2.5"} />
      ) : (
        index + 1
      )}
    </span>
  );
}
