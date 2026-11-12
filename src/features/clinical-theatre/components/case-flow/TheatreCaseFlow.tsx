"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useCallback, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { TheatreIpdConversionPanel } from "@/features/clinical-theatre/components/TheatreIpdConversionPanel";
import { TheatrePreferenceCardPanel } from "@/features/clinical-theatre/components/TheatrePreferenceCardPanel";
import { TheatreReturnLinkPanel } from "@/features/clinical-theatre/components/TheatreReturnLinkPanel";
import {
  TheatreFlowRail,
  TheatreFlowStrip,
  theatreFlowStateLabel,
} from "@/features/clinical-theatre/components/case-flow/TheatreFlowRail";
import {
  TheatreBookingStep,
  TheatreHandoverStep,
  TheatreOpNoteStep,
  TheatreOperationStep,
  TheatrePreOpStep,
  TheatreRecoveryStep,
  TheatreTeamSheetBody,
  TheatreWhoStep,
  isTheatreFlowSheet,
  useTheatreCan,
  type TheatreFlowSheet,
  type TheatreStepProps,
} from "@/features/clinical-theatre/components/case-flow/TheatreFlowSteps";
import {
  FlowCallout,
  FlowSheet,
} from "@/features/clinical-theatre/components/case-flow/theatre-flow-ui";
import {
  useTheatreCaseForEncounter,
  useTransitionTheatreCase,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import { useTheatreFlowExtras } from "@/features/clinical-theatre/hooks/use-theatre-case-flow";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  THEATRE_STATUS_LABELS,
  THEATRE_TRANSITION_ACTION_LABELS,
} from "@/features/clinical-theatre/utils/theatre-case-display";
import {
  THEATRE_FLOW_STEPS,
  adjacentTheatreFlowSteps,
  buildTheatreFlow,
  currentTheatreFlowStep,
  defaultOperationPart,
  isTheatreCaseStopped,
  resolveTheatreFlowLocation,
  theatreFlowStepHref,
  type TheatreFlowStepId,
} from "@/features/clinical-theatre/utils/theatre-case-flow";
import { theatreNextAction } from "@/features/clinical-theatre/utils/theatre-workflow";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";
import { cn } from "@/lib/utils";

const SHEET_TITLES: Record<TheatreFlowSheet, { title: string; description: string }> = {
  team: {
    title: "Surgical team",
    description: "Add or remove the people working on this case.",
  },
  "preference-card": {
    title: "Surgeon preference card",
    description: "The lead surgeon's usual setup and items for this procedure.",
  },
  return: {
    title: "Return to theatre",
    description: "Link this case to the operation it returns from.",
  },
  inpatient: {
    title: "Inpatient stay",
    description: "Admit a day case without leaving the visit, so charges stay on one bill.",
  },
};

/** The guided theatre case workspace on the `case` route. */
export function TheatreCaseFlowSection({ encounterUuid }: ClinicalWorkspacePanelProps) {
  const { theatreCase, isLoading, error } = useTheatreCaseForEncounter(encounterUuid);

  if (isLoading) {
    return (
      <div className="grid gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[17rem_1fr]" aria-busy>
        <div className="hidden space-y-3 lg:block">
          {THEATRE_FLOW_STEPS.map((step) => (
            <div key={step.id} className="h-10 animate-pulse rounded-lg bg-muted/70" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-8 w-64 animate-pulse rounded bg-muted/70" />
          <div className="h-40 animate-pulse rounded bg-muted/50" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <FlowCallout tone="danger" title="Could not load the theatre case">
          {error instanceof Error ? error.message : "Try again in a moment."}
        </FlowCallout>
      </div>
    );
  }
  if (!theatreCase) {
    return (
      <p
        className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6"
        data-testid="theatre-case-missing"
      >
        Set up the theatre case above to start the case flow.
      </p>
    );
  }
  return <TheatreCaseFlow theatreCase={theatreCase} />;
}

export function TheatreCaseFlow({ theatreCase }: { theatreCase: TheatreCase }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const extras = useTheatreFlowExtras(theatreCase);
  const steps = buildTheatreFlow(theatreCase, extras);
  const { step: activeStep, part } = resolveTheatreFlowLocation(
    theatreCase,
    searchParams.get("step"),
    searchParams.get("section"),
  );
  const sheetParam = searchParams.get("sheet");
  const openSheet = isTheatreFlowSheet(sheetParam) ? sheetParam : null;
  const currentStep = currentTheatreFlowStep(theatreCase);

  const stepHref = useCallback(
    (step: TheatreFlowStepId, stepPart?: string | null) =>
      theatreFlowStepHref(pathname, step, stepPart),
    [pathname],
  );
  const sheetHref = useCallback(
    (sheet: TheatreFlowSheet) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sheet", sheet);
      return `${pathname}?${params.toString()}`;
    },
    [pathname, searchParams],
  );
  const closeSheet = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sheet");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const active = steps.find((step) => step.id === activeStep) ?? steps[0];
  const activeIndex = steps.findIndex((step) => step.id === active.id);
  const stepProps: TheatreStepProps = {
    theatreCase,
    steps,
    stepHref,
    sheetHref,
    part: active.id === "intra-op" ? (part ?? defaultOperationPart(theatreCase.status)) : null,
  };

  return (
    <div className="px-4 pb-10 pt-5 sm:px-6" data-testid="theatre-case-flow">
      <div className="mb-5 lg:hidden">
        <TheatreFlowStrip steps={steps} activeStep={active.id} hrefFor={(id) => stepHref(id)} />
      </div>
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] xl:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-48">
            <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">
              Perioperative journey
            </p>
            <TheatreFlowRail steps={steps} activeStep={active.id} hrefFor={(id) => stepHref(id)} />
          </div>
        </aside>

        <section
          aria-label={active.label}
          className="min-w-0"
          data-testid={`theatre-flow-step-${active.id}`}
        >
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-dash-border/70 pb-5">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">
                Step {activeIndex + 1} of {steps.length}
                <span aria-hidden> · </span>
                <span
                  className={cn(
                    active.state === "done" && "text-emerald-700",
                    (active.state === "blocked" || active.state === "attention") &&
                      "text-amber-700",
                    active.state === "current" && "text-brand-primary",
                  )}
                >
                  {theatreFlowStateLabel(active.state)}
                </span>
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy">
                {active.label}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {THEATRE_FLOW_STEPS[activeIndex]?.hint}
              </p>
            </div>
            {active.id !== currentStep && !isTheatreCaseStopped(theatreCase.status) ? (
              <Button asChild size="sm" variant="ghost" className="text-brand-primary">
                <Link href={pathname} scroll={false}>
                  Jump to where the case is now
                  <ArrowRight className="ml-1 size-4" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </header>

          {isTheatreCaseStopped(theatreCase.status) ? (
            <FlowCallout
              tone="danger"
              className="mb-6"
              title={`Case ${THEATRE_STATUS_LABELS[theatreCase.status].toLowerCase()}`}
            >
              {theatreCase.cancellation_reason
                ? `${theatreCase.cancellation_reason.category_label}: ${theatreCase.cancellation_reason.label}${
                    theatreCase.cancellation_note ? ` — ${theatreCase.cancellation_note}` : ""
                  }`
                : "This case is not going ahead. Rebook it from the slot section to continue."}
            </FlowCallout>
          ) : null}

          {active.issues.length > 0 ? (
            <div className="mb-6 space-y-2" data-testid="theatre-flow-step-issues">
              {active.issues.map((issue) => (
                <FlowCallout key={issue} tone="warning">
                  {issue}
                </FlowCallout>
              ))}
            </div>
          ) : null}

          <StepBody stepId={active.id} props={stepProps} />

          <TheatreFlowFooter
            theatreCase={theatreCase}
            activeStep={active.id}
            currentStep={currentStep}
            stepHref={stepHref}
            caseHref={pathname}
          />
        </section>
      </div>

      <TheatreFlowSheets theatreCase={theatreCase} open={openSheet} onClose={closeSheet} />
    </div>
  );
}

function StepBody({ stepId, props }: { stepId: TheatreFlowStepId; props: TheatreStepProps }) {
  switch (stepId) {
    case "booking":
      return <TheatreBookingStep {...props} />;
    case "pre-op":
      return <TheatrePreOpStep {...props} />;
    case "sign-in":
      return <TheatreWhoStep {...props} stage="sign_in" />;
    case "time-out":
      return <TheatreWhoStep {...props} stage="time_out" />;
    case "intra-op":
      return <TheatreOperationStep {...props} />;
    case "sign-out":
      return <TheatreWhoStep {...props} stage="sign_out" />;
    case "op-note":
      return <TheatreOpNoteStep {...props} />;
    case "recovery":
      return <TheatreRecoveryStep {...props} />;
    case "handover":
      return <TheatreHandoverStep {...props} />;
  }
}

/** Previous / next step, plus the case's next move when this is the live step. */
function TheatreFlowFooter({
  theatreCase,
  activeStep,
  currentStep,
  stepHref,
  caseHref,
}: {
  theatreCase: TheatreCase;
  activeStep: TheatreFlowStepId;
  currentStep: TheatreFlowStepId;
  stepHref: (step: TheatreFlowStepId) => string;
  caseHref: string;
}) {
  const can = useTheatreCan();
  const router = useRouter();
  const transition = useTransitionTheatreCase();
  const { previous, next } = adjacentTheatreFlowSteps(activeStep);
  const action = theatreNextAction(theatreCase);
  const showMove =
    activeStep === currentStep && can("transition_theatre_case") && action.kind === "transition";

  // Keyboard: Alt+← / Alt+→ walk the steps.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.altKey || event.metaKey || event.ctrlKey) return;
      // Alt + arrows move by word inside text fields; leave those alone.
      const field = event.target as HTMLElement | null;
      if (field?.closest("input, textarea, select, [contenteditable='true']")) return;
      const target =
        event.key === "ArrowRight" ? next : event.key === "ArrowLeft" ? previous : null;
      if (!target) return;
      event.preventDefault();
      router.push(stepHref(target.id), { scroll: false });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, router, stepHref]);

  return (
    <footer
      className="sticky bottom-0 z-10 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-dash-border/70 bg-background/95 py-4 backdrop-blur"
      data-testid="theatre-flow-footer"
    >
      {previous ? (
        <Button asChild variant="ghost" size="sm" className="text-brand-muted">
          <Link href={stepHref(previous.id)} scroll={false} title="Alt + ←">
            <ArrowLeft className="mr-1 size-4" aria-hidden />
            {previous.label}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {showMove && action.kind === "transition" && action.blocker ? (
          <span
            className="max-w-sm text-right text-xs text-amber-700"
            data-testid="theatre-flow-move-blocker"
          >
            {action.blocker}
          </span>
        ) : null}
        {transition.error ? (
          <span className="max-w-sm text-right text-xs text-red-600">
            {transition.error instanceof Error
              ? transition.error.message
              : "Could not update the case."}
          </span>
        ) : null}
        {next ? (
          <Button asChild variant={showMove ? "outline" : "default"} size="sm">
            <Link href={stepHref(next.id)} scroll={false} title="Alt + →">
              {next.label}
              <ArrowRight className="ml-1 size-4" aria-hidden />
            </Link>
          </Button>
        ) : null}
        {showMove && action.kind === "transition" ? (
          <Button
            type="button"
            size="sm"
            disabled={transition.isPending || Boolean(action.blocker)}
            onClick={() =>
              transition.mutate(
                { uuid: theatreCase.uuid, status: action.status },
                // Follow the case to its new live step.
                { onSuccess: () => router.replace(caseHref, { scroll: false }) },
              )
            }
            data-testid="theatre-flow-move"
          >
            {transition.isPending ? (
              <Loader2 className="mr-1 size-4 animate-spin" aria-hidden />
            ) : null}
            {THEATRE_TRANSITION_ACTION_LABELS[action.status]}
          </Button>
        ) : null}
      </div>
    </footer>
  );
}

function TheatreFlowSheets({
  theatreCase,
  open,
  onClose,
}: {
  theatreCase: TheatreCase;
  open: TheatreFlowSheet | null;
  onClose: () => void;
}) {
  const can = useTheatreCan();
  const meta = open ? SHEET_TITLES[open] : null;
  return (
    <FlowSheet
      open={Boolean(open)}
      onOpenChange={(value) => (value ? undefined : onClose())}
      title={meta?.title ?? ""}
      description={meta?.description}
    >
      {open === "team" ? <TheatreTeamSheetBody theatreCase={theatreCase} /> : null}
      {open === "preference-card" ? (
        <TheatrePreferenceCardPanel
          theatreCase={theatreCase}
          canRecord={can("record_theatre_consumables")}
          canManageCards={can("manage_theatre_preference_cards")}
        />
      ) : null}
      {open === "return" ? (
        <TheatreReturnLinkPanel theatreCase={theatreCase} canEdit={can("book_theatre_case")} />
      ) : null}
      {open === "inpatient" ? (
        <TheatreIpdConversionPanel
          theatreCase={theatreCase}
          canConvert={can("convert_theatre_case_to_ipd")}
        />
      ) : null}
    </FlowSheet>
  );
}
