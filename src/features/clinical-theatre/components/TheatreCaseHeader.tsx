"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  DoorOpen,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import { TheatreCaseSetupCard } from "@/features/clinical-theatre/components/TheatreCaseSetupCard";
import { TheatreCrashBanner } from "@/features/clinical-theatre/components/TheatreCrashBanner";
import { TheatrePatientChip } from "@/features/clinical-theatre/components/TheatrePatientChip";
import { TheatreTimingQuickCapture } from "@/features/clinical-theatre/components/TheatreTimingPanel";
import { personInitials } from "@/features/clinical-theatre/components/case-flow/theatre-flow-ui";
import { theatreCaseHref } from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import {
  useTheatreCaseForEncounter,
  useTheatreTeam,
  useTransitionTheatreCase,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import { useTheatreFlowExtras } from "@/features/clinical-theatre/hooks/use-theatre-case-flow";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import { ncepodShortLabel } from "@/features/clinical-theatre/utils/theatre-advanced-display";
import {
  THEATRE_STATUS_LABELS,
  THEATRE_TRANSITION_ACTION_LABELS,
  formatTheatreSlot,
  theatreStatusTone,
} from "@/features/clinical-theatre/utils/theatre-case-display";
import {
  THEATRE_FLOW_STEPS,
  buildTheatreFlow,
  currentTheatreFlowStep,
  isTheatreCaseStopped,
  resolveTheatreFlowLocation,
  theatreFlowStepHref,
  type TheatreFlowStep,
  type TheatreFlowStepId,
} from "@/features/clinical-theatre/utils/theatre-case-flow";
import { THEATRE_TEAM_ROLE_LABELS } from "@/features/clinical-theatre/utils/theatre-safety-display";
import { theatreNextAction } from "@/features/clinical-theatre/utils/theatre-workflow";
import type { ClinicalWorkspaceBannerProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

const URGENCY_TONE = {
  elective: "neutral",
  urgent: "warning",
  emergency: "danger",
} as const;

const KEY_ROLES = ["surgeon", "anaesthetist", "scrub_nurse"];

/** Sticky case chrome: compact patient chip and procedure identity. */
export function TheatreCaseHeader({ visitUuid, encounterUuid }: ClinicalWorkspaceBannerProps) {
  const { capabilities } = useOpdEncounterWorkspace();
  const { theatreCase, isLoading, error } = useTheatreCaseForEncounter(encounterUuid);

  if (isLoading) {
    return (
      <TheatreCaseChrome>
        <div className="px-4 py-3 sm:px-6">
          <div className="h-4 w-56 animate-pulse rounded bg-muted/70" />
          <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded bg-muted/50" />
        </div>
      </TheatreCaseChrome>
    );
  }
  if (error) {
    return (
      <TheatreCaseChrome>
        <p className="px-4 py-3 text-sm text-red-600 sm:px-6">
          {error instanceof Error ? error.message : "Could not load the theatre case."}
        </p>
      </TheatreCaseChrome>
    );
  }
  if (!theatreCase) {
    return (
      <TheatreCaseChrome>
        <div className="px-4 py-3 sm:px-6">
          <TheatreCaseSetupCard
            encounterUuid={encounterUuid}
            canBook={capabilities.includes("book_theatre_case")}
          />
        </div>
      </TheatreCaseChrome>
    );
  }
  return (
    <TheatreCaseChrome fallbackName={theatreCase.customer_name}>
      <TheatreCaseHeaderBar
        theatreCase={theatreCase}
        visitUuid={visitUuid}
        encounterUuid={encounterUuid}
        canTransition={capabilities.includes("transition_theatre_case")}
        canRecordTimings={capabilities.includes("record_theatre_timings")}
      />
    </TheatreCaseChrome>
  );
}

function TheatreCaseChrome({
  children,
  fallbackName,
}: {
  children: ReactNode;
  fallbackName?: string | null;
}) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-dash-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      data-testid="theatre-case-header"
    >
      <div className="px-4 py-1.5 sm:px-6">
        <TheatrePatientChip fallbackName={fallbackName} />
      </div>
      {children}
    </header>
  );
}

type HeaderBarProps = {
  theatreCase: TheatreCase;
  visitUuid: string;
  encounterUuid: string;
  canTransition: boolean;
  canRecordTimings?: boolean;
};

const BADGE_CLASS = "h-5 gap-1 px-1.5 text-[10px]";

function TheatreCaseHeaderBar({
  theatreCase,
  visitUuid,
  encounterUuid,
  canTransition,
  canRecordTimings = false,
}: HeaderBarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const caseHref = theatreCaseHref(visitUuid, encounterUuid);
  const onCase = pathname === caseHref || pathname.startsWith(`${caseHref}/`);
  const stepHref = (step: TheatreFlowStepId, part?: string | null) =>
    theatreFlowStepHref(caseHref, step, part);
  const extras = useTheatreFlowExtras(theatreCase);
  const steps = buildTheatreFlow(theatreCase, extras);
  const blocked = steps.find((step) => step.state === "blocked" && step.issues.length > 0);
  const currentStep = currentTheatreFlowStep(theatreCase);
  const viewedStep = onCase
    ? resolveTheatreFlowLocation(
        theatreCase,
        searchParams.get("step"),
        searchParams.get("section"),
      ).step
    : null;
  const showJumpToCurrent =
    !isTheatreCaseStopped(theatreCase.status) && viewedStep !== currentStep;
  const currentStepLabel =
    THEATRE_FLOW_STEPS.find((step) => step.id === currentStep)?.label ?? currentStep;
  const primary =
    theatreCase.procedures?.find((procedure) => procedure.is_primary) ??
    theatreCase.procedures?.[0];
  const title = primary?.name || theatreCase.procedure_description || "Procedure not set";
  const extraProcedures = Math.max((theatreCase.procedures?.length ?? 0) - 1, 0);
  const stopped = theatreCase.status === "cancelled" || theatreCase.status === "postponed";
  // Opening the team drawer keeps the step the user is on.
  const teamParams = new URLSearchParams(searchParams.toString());
  teamParams.set("sheet", "team");

  return (
    <div className="space-y-2 px-4 pb-2 pt-0.5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <h2 className="truncate text-sm font-semibold tracking-tight text-brand-navy">
              {title}
            </h2>
            {extraProcedures > 0 ? (
              <span
                className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-brand-muted"
                title={theatreCase.procedures.map((procedure) => procedure.name).join(", ")}
              >
                +{extraProcedures} more
              </span>
            ) : null}
            <StatusDotBadge tone={theatreStatusTone(theatreCase.status)} className={BADGE_CLASS}>
              {THEATRE_STATUS_LABELS[theatreCase.status]}
            </StatusDotBadge>
            {theatreCase.is_crash ? (
              <StatusDotBadge tone="danger" className={BADGE_CLASS}>
                Crash
              </StatusDotBadge>
            ) : null}
            {theatreCase.urgency !== "elective" ? (
              <StatusDotBadge tone={URGENCY_TONE[theatreCase.urgency]} className={BADGE_CLASS}>
                {theatreCase.urgency === "emergency" ? "Emergency" : "Urgent"}
              </StatusDotBadge>
            ) : null}
            {theatreCase.ncepod_category ? (
              <StatusDotBadge tone="neutral" className={BADGE_CLASS}>
                {ncepodShortLabel(theatreCase.ncepod_category)}
              </StatusDotBadge>
            ) : null}
            {theatreCase.return_of ? (
              <StatusDotBadge
                tone={theatreCase.return_planned ? "info" : "danger"}
                className={BADGE_CLASS}
              >
                {theatreCase.return_planned ? "Planned return" : "Return to theatre"}
              </StatusDotBadge>
            ) : null}
            {theatreCase.cancelled_on_the_day && stopped ? (
              <StatusDotBadge tone="danger" className={BADGE_CLASS}>
                On-the-day
              </StatusDotBadge>
            ) : null}
          </div>
          {theatreCase.cancellation_reason && stopped ? (
            <p
              className="text-[11px] text-muted-foreground"
              data-testid="theatre-cancellation-reason"
            >
              {theatreCase.cancellation_reason.category_label}:{" "}
              {theatreCase.cancellation_reason.label}
              {theatreCase.cancellation_note ? ` — ${theatreCase.cancellation_note}` : ""}
            </p>
          ) : null}
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <HeaderFact
              icon={DoorOpen}
              label="Room"
              value={theatreCase.room?.name ?? "No room yet"}
            />
            <HeaderFact
              icon={CalendarClock}
              label="Slot"
              value={formatTheatreSlot(theatreCase)}
            />
            <HeaderTeam
              theatreCase={theatreCase}
              href={`${caseHref}?${teamParams.toString()}`}
            />
          </dl>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center gap-2"
          data-testid="theatre-header-actions"
        >
          <TheatreTimingQuickCapture theatreCase={theatreCase} canRecord={canRecordTimings} />
          {showJumpToCurrent ? (
            <Button asChild size="sm" variant="outline">
              <Link
                href={stepHref(currentStep)}
                scroll={false}
                data-testid="theatre-go-to-current-step"
              >
                Go to current step: {currentStepLabel}
              </Link>
            </Button>
          ) : null}
          {canTransition ? (
            <TheatreNextAction
              theatreCase={theatreCase}
              blockedStep={blocked ?? null}
              stepHref={stepHref}
            />
          ) : null}
        </div>
      </div>

      <TheatreCrashBanner theatreCase={theatreCase} stepHref={(step) => stepHref(step)} />
    </div>
  );
}

function HeaderFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3 shrink-0" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}

function HeaderTeam({ theatreCase, href }: { theatreCase: TheatreCase; href: string }) {
  const { data: team = [] } = useTheatreTeam(theatreCase.uuid);
  const keyTeam = team.filter((member) => KEY_ROLES.includes(member.role));
  const shown = keyTeam.length > 0 ? keyTeam : team.slice(0, 3);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <dt className="sr-only">Team</dt>
      <dd className="min-w-0">
        <Link
          href={href}
          scroll={false}
          className="group inline-flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
          data-testid="theatre-header-team"
        >
          {shown.length > 0 ? (
            <>
              <span className="flex -space-x-1.5" aria-hidden>
                {shown.map((member) => (
                  <span
                    key={member.uuid}
                    className="inline-flex size-5 items-center justify-center rounded-full bg-brand-primary/10 text-[9px] font-semibold text-brand-primary ring-2 ring-background"
                  >
                    {personInitials(member.user_name)}
                  </span>
                ))}
              </span>
              <span className="truncate group-hover:text-brand-navy">
                {shown
                  .map((member) => `${THEATRE_TEAM_ROLE_LABELS[member.role]}: ${member.user_name}`)
                  .join(" · ")}
              </span>
            </>
          ) : (
            <span className="group-hover:text-brand-navy">
              {theatreCase.lead_surgeon_name
                ? `Surgeon: ${theatreCase.lead_surgeon_name}`
                : "No team yet — add"}
            </span>
          )}
        </Link>
      </dd>
    </div>
  );
}

function TheatreNextAction({
  theatreCase,
  blockedStep,
  stepHref,
}: {
  theatreCase: TheatreCase;
  blockedStep: TheatreFlowStep | null;
  stepHref: (step: TheatreFlowStepId, part?: string | null) => string;
}) {
  const transition = useTransitionTheatreCase();
  const searchParams = useSearchParams();
  const action = theatreNextAction(theatreCase);

  if (action.kind === "none") return null;
  if (action.kind === "recovery-discharge") {
    return (
      <Button asChild size="sm">
        <Link href={stepHref("recovery")} scroll={false}>
          Discharge from recovery
        </Link>
      </Button>
    );
  }
  const fixStep: TheatreFlowStepId | null = action.blocker
    ? (blockedStep?.id ??
      (action.fixSubSection === "counts"
        ? "intra-op"
        : action.fixSection === "pre-op"
          ? "sign-in"
          : "time-out"))
    : null;
  const viewingFix = fixStep !== null && searchParams.get("step") === fixStep;
  return (
    <div className="flex max-w-xs flex-col items-end gap-1 text-right">
      <Button
        type="button"
        size="sm"
        disabled={transition.isPending || Boolean(action.blocker)}
        onClick={() => transition.mutate({ uuid: theatreCase.uuid, status: action.status })}
        data-testid="theatre-next-action"
      >
        {THEATRE_TRANSITION_ACTION_LABELS[action.status]}
      </Button>
      {action.blocker ? (
        <p
          className="flex items-start gap-1 text-xs text-amber-700"
          data-testid="theatre-next-action-blocker"
        >
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            {action.blocker}{" "}
            {fixStep && !viewingFix ? (
              <Link
                className="font-medium underline underline-offset-2"
                href={stepHref(fixStep, fixStep === "intra-op" ? "counts" : null)}
                scroll={false}
              >
                Go to step
              </Link>
            ) : null}
          </span>
        </p>
      ) : null}
      {transition.error ? (
        <p className="text-xs text-red-600">
          {transition.error instanceof Error
            ? transition.error.message
            : "Could not update the case."}
        </p>
      ) : null}
    </div>
  );
}
