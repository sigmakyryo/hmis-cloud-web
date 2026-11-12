"use client";

import Link from "next/link";
import { Ban, Check, CircleAlert, TriangleAlert } from "lucide-react";
import type { KeyboardEvent } from "react";

import type {
  TheatreFlowStep,
  TheatreFlowStepId,
  TheatreFlowStepState,
} from "@/features/clinical-theatre/utils/theatre-case-flow";
import { cn } from "@/lib/utils";

const STATE_LABELS: Record<TheatreFlowStepState, string> = {
  done: "Done",
  current: "Now",
  blocked: "Needs attention",
  attention: "Not recorded",
  upcoming: "Up next",
  stopped: "Not reached",
};

export function theatreFlowStateLabel(state: TheatreFlowStepState): string {
  return STATE_LABELS[state];
}

function StepMarker({ state, index }: { state: TheatreFlowStepState; index: number }) {
  const base =
    "relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors";
  switch (state) {
    case "done":
      return (
        <span className={cn(base, "bg-emerald-500 text-white")}>
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
      );
    case "current":
      return (
        <span className={cn(base, "bg-brand-primary text-white ring-4 ring-brand-primary/15")}>
          {index + 1}
        </span>
      );
    case "blocked":
      return (
        <span className={cn(base, "bg-amber-500 text-white ring-4 ring-amber-500/15")}>
          <TriangleAlert className="size-3.5" aria-hidden />
        </span>
      );
    case "attention":
      return (
        <span className={cn(base, "bg-amber-50 text-amber-700 ring-1 ring-amber-300")}>
          <CircleAlert className="size-3.5" aria-hidden />
        </span>
      );
    case "stopped":
      return (
        <span className={cn(base, "bg-muted text-muted-foreground")}>
          <Ban className="size-3.5" aria-hidden />
        </span>
      );
    default:
      return (
        <span className={cn(base, "bg-background text-brand-muted ring-1 ring-dash-border")}>
          {index + 1}
        </span>
      );
  }
}

/** Arrow keys move focus between steps (Home / End jump to the ends). */
function onRailKeyDown(event: KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"];
  if (!keys.includes(event.key)) return;
  const links = Array.from(
    event.currentTarget.querySelectorAll<HTMLAnchorElement>("a[data-flow-step]"),
  );
  const index = links.indexOf(document.activeElement as HTMLAnchorElement);
  if (index === -1) return;
  event.preventDefault();
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? links.length - 1
        : event.key === "ArrowDown" || event.key === "ArrowRight"
          ? Math.min(index + 1, links.length - 1)
          : Math.max(index - 1, 0);
  links[next]?.focus();
}

type RailProps = {
  steps: TheatreFlowStep[];
  activeStep: TheatreFlowStepId;
  hrefFor: (step: TheatreFlowStepId) => string;
};

/** Vertical journey rail (large screens). */
export function TheatreFlowRail({ steps, activeStep, hrefFor }: RailProps) {
  return (
    <nav aria-label="Theatre case steps" onKeyDown={onRailKeyDown} data-testid="theatre-flow-rail">
      <ol className="relative">
        {steps.map((step, index) => {
          const active = step.id === activeStep;
          const last = index === steps.length - 1;
          return (
            <li key={step.id} className="relative">
              {!last ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[1.375rem] top-9 h-[calc(100%-1.75rem)] w-px",
                    step.state === "done" ? "bg-emerald-300" : "bg-dash-border",
                  )}
                />
              ) : null}
              <Link
                href={hrefFor(step.id)}
                scroll={false}
                data-flow-step={step.id}
                data-state={step.state}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex items-start gap-3 rounded-lg px-2 py-2 outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                  active ? "bg-brand-primary/[0.06]" : "hover:bg-muted/60",
                )}
              >
                <StepMarker state={step.state} index={index} />
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        active ? "font-semibold text-brand-navy" : "font-medium text-brand-navy/80",
                        step.state === "stopped" && "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                    {step.state === "current" || step.state === "blocked" ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
                          step.state === "blocked"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-brand-primary/10 text-brand-primary",
                        )}
                      >
                        Now
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs leading-4",
                      step.issues.length > 0 && step.state !== "upcoming"
                        ? "text-amber-700"
                        : "text-muted-foreground",
                    )}
                  >
                    {step.issues.length > 0 && step.state !== "upcoming"
                      ? step.issues[0]
                      : theatreFlowStateLabel(step.state)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Horizontal step strip (phones and tablets in portrait). */
export function TheatreFlowStrip({ steps, activeStep, hrefFor }: RailProps) {
  return (
    <nav
      aria-label="Theatre case steps"
      onKeyDown={onRailKeyDown}
      className="scrollbar-hide -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6"
      data-testid="theatre-flow-strip"
    >
      <ol className="flex min-w-max items-center gap-1.5">
        {steps.map((step, index) => {
          const active = step.id === activeStep;
          return (
            <li key={step.id} className="flex items-center gap-1.5">
              <Link
                href={hrefFor(step.id)}
                scroll={false}
                data-flow-step={step.id}
                data-state={step.state}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium outline-none",
                  "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                  active
                    ? "bg-brand-primary/10 text-brand-navy"
                    : "text-brand-muted hover:bg-muted",
                )}
              >
                <span className="scale-[0.8]">
                  <StepMarker state={step.state} index={index} />
                </span>
                {step.label}
              </Link>
              {index < steps.length - 1 ? (
                <span aria-hidden className="h-px w-3 bg-dash-border" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
