"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  DoorOpen,
  FolderOpen,
  Scissors,
  Siren,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import { TheatreCaseSetupCard } from "@/features/clinical-theatre/components/TheatreCaseSetupCard";
import { TheatreCaseStepper } from "@/features/clinical-theatre/components/TheatreCaseStepper";
import { TheatreCrashBanner } from "@/features/clinical-theatre/components/TheatreCrashBanner";
import { TheatreTimingQuickCapture } from "@/features/clinical-theatre/components/TheatreTimingPanel";
import { personInitials } from "@/features/clinical-theatre/components/case-flow/theatre-flow-ui";
import {
  THEATRE_WORKSPACE_ROUTING,
  theatreCaseHref,
} from "@/features/clinical-theatre/constants/theatre-workspace-routing";
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
  buildTheatreFlow,
  theatreFlowStepHref,
  type TheatreFlowStep,
  type TheatreFlowStepId,
} from "@/features/clinical-theatre/utils/theatre-case-flow";
import { THEATRE_TEAM_ROLE_LABELS } from "@/features/clinical-theatre/utils/theatre-safety-display";
import { theatreNextAction } from "@/features/clinical-theatre/utils/theatre-workflow";
import type { ClinicalWorkspaceBannerProps } from "@/features/clinical-workspace/types/clinical-workspace.types";
import {
  getVisibleWorkspaceMenuSections,
  workspaceTabHref,
} from "@/features/clinical-workspace/utils/workspace-tabs";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const URGENCY_TONE = {
  elective: "neutral",
  urgent: "warning",
  emergency: "danger",
} as const;

const KEY_ROLES = ["surgeon", "anaesthetist", "scrub_nurse"];

/** Sticky case header shown above the theatre case flow and its records. */
export function TheatreCaseHeader({ visitUuid, encounterUuid }: ClinicalWorkspaceBannerProps) {
  const { capabilities } = useOpdEncounterWorkspace();
  const { theatreCase, isLoading, error } = useTheatreCaseForEncounter(encounterUuid);

  if (isLoading) {
    return (
      <div className="border-b border-dash-border/70 px-4 py-4 sm:px-6">
        <div className="h-5 w-72 animate-pulse rounded bg-muted/70" />
        <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-muted/50" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="px-4 pt-3 text-sm text-red-600 sm:px-6">
        {error instanceof Error ? error.message : "Could not load the theatre case."}
      </p>
    );
  }
  if (!theatreCase) {
    return (
      <div className="px-4 pt-3 sm:px-6" data-testid="theatre-case-header">
        <TheatreCaseSetupCard
          encounterUuid={encounterUuid}
          canBook={capabilities.includes("book_theatre_case")}
        />
        <TheatreRecordsMenuRow visitUuid={visitUuid} encounterUuid={encounterUuid} />
      </div>
    );
  }
  return (
    <TheatreCaseHeaderBar
      theatreCase={theatreCase}
      visitUuid={visitUuid}
      encounterUuid={encounterUuid}
      canTransition={capabilities.includes("transition_theatre_case")}
      canRecordTimings={capabilities.includes("record_theatre_timings")}
    />
  );
}

type HeaderBarProps = {
  theatreCase: TheatreCase;
  visitUuid: string;
  encounterUuid: string;
  canTransition: boolean;
  canRecordTimings?: boolean;
};

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
  const onCaseFlow = pathname === caseHref || pathname.startsWith(`${caseHref}/`);
  const stepHref = (step: TheatreFlowStepId, part?: string | null) =>
    theatreFlowStepHref(caseHref, step, part);
  const extras = useTheatreFlowExtras(theatreCase);
  const steps = buildTheatreFlow(theatreCase, extras);
  const blocked = steps.find((step) => step.state === "blocked" && step.issues.length > 0);
  const primary =
    theatreCase.procedures?.find((procedure) => procedure.is_primary) ??
    theatreCase.procedures?.[0];
  const title = primary?.name || theatreCase.procedure_description || "Procedure not set";
  const extraProcedures = Math.max((theatreCase.procedures?.length ?? 0) - 1, 0);
  const stopped = theatreCase.status === "cancelled" || theatreCase.status === "postponed";
  // Opening the team drawer keeps the step the user is on.
  const teamParams = new URLSearchParams(onCaseFlow ? searchParams.toString() : "");
  teamParams.set("sheet", "team");

  return (
    <header
      className="sticky top-0 z-30 border-b border-dash-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      data-testid="theatre-case-header"
    >
      <div className="space-y-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              aria-hidden
              className={cn(
                "mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
                theatreCase.is_crash
                  ? "bg-rose-100 text-rose-700"
                  : "bg-brand-primary/10 text-brand-primary",
              )}
            >
              {theatreCase.is_crash ? (
                <Siren className="size-5" />
              ) : (
                <Scissors className="size-5" />
              )}
            </span>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="truncate text-lg font-semibold tracking-tight text-brand-navy">
                  {title}
                </h2>
                {extraProcedures > 0 ? (
                  <span
                    className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-brand-muted"
                    title={theatreCase.procedures.map((procedure) => procedure.name).join(", ")}
                  >
                    +{extraProcedures} more
                  </span>
                ) : null}
                <StatusDotBadge tone={theatreStatusTone(theatreCase.status)}>
                  {THEATRE_STATUS_LABELS[theatreCase.status]}
                </StatusDotBadge>
                {theatreCase.urgency !== "elective" ? (
                  <StatusDotBadge tone={URGENCY_TONE[theatreCase.urgency]}>
                    {theatreCase.urgency === "emergency" ? "Emergency" : "Urgent"}
                  </StatusDotBadge>
                ) : null}
                {theatreCase.ncepod_category ? (
                  <StatusDotBadge tone="neutral">
                    {ncepodShortLabel(theatreCase.ncepod_category)}
                  </StatusDotBadge>
                ) : null}
                {theatreCase.return_of ? (
                  <StatusDotBadge tone={theatreCase.return_planned ? "info" : "danger"}>
                    {theatreCase.return_planned ? "Planned return" : "Return to theatre"}
                  </StatusDotBadge>
                ) : null}
                {theatreCase.cancelled_on_the_day && stopped ? (
                  <StatusDotBadge tone="danger">On-the-day</StatusDotBadge>
                ) : null}
              </div>
              {theatreCase.cancellation_reason && stopped ? (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="theatre-cancellation-reason"
                >
                  {theatreCase.cancellation_reason.category_label}:{" "}
                  {theatreCase.cancellation_reason.label}
                  {theatreCase.cancellation_note ? ` — ${theatreCase.cancellation_note}` : ""}
                </p>
              ) : null}
              <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-muted-foreground">
                <HeaderFact icon={UserRound} label="Patient" value={theatreCase.customer_name} />
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
          </div>

          <div className="flex shrink-0 flex-wrap items-start gap-2">
            {!onCaseFlow ? (
              <Button asChild size="sm" variant="ghost">
                <Link href={caseHref}>
                  <ArrowLeft className="mr-1 size-4" aria-hidden />
                  Case flow
                </Link>
              </Button>
            ) : null}
            <TheatreRecordsMenu visitUuid={visitUuid} encounterUuid={encounterUuid} />
            {canTransition ? (
              <TheatreNextAction
                theatreCase={theatreCase}
                blockedStep={blocked ?? null}
                stepHref={stepHref}
              />
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div className="min-w-[16rem] flex-1">
            <TheatreCaseStepper status={theatreCase.status} />
          </div>
          <TheatreTimingQuickCapture theatreCase={theatreCase} canRecord={canRecordTimings} />
        </div>

        <TheatreCrashBanner theatreCase={theatreCase} stepHref={(step) => stepHref(step)} />
      </div>
    </header>
  );
}

function HeaderFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0" aria-hidden />
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
                    className="inline-flex size-6 items-center justify-center rounded-full bg-brand-primary/10 text-[10px] font-semibold text-brand-primary ring-2 ring-background"
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

/** Vitals, nursing, orders, notes, activity and client info: off the main flow. */
function TheatreRecordsMenu({
  visitUuid,
  encounterUuid,
}: {
  visitUuid: string;
  encounterUuid: string;
}) {
  const { capabilities } = useOpdEncounterWorkspace();
  const pathname = usePathname();
  const sections = getVisibleWorkspaceMenuSections(THEATRE_WORKSPACE_ROUTING, capabilities);
  if (sections.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="More encounter sections"
          data-testid="theatre-records-menu"
        >
          <FolderOpen className="mr-1 size-4" aria-hidden />
          More
          <ChevronDown className="ml-1 size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn("min-w-52", appFont.className)}>
        <DropdownMenuLabel className="text-xs font-medium text-brand-muted">
          Patient records
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sections.map((section) => {
          const href = workspaceTabHref(
            THEATRE_WORKSPACE_ROUTING,
            visitUuid,
            encounterUuid,
            section.id,
          );
          return (
            <DropdownMenuItem key={section.id} asChild>
              <Link href={href} aria-current={pathname === href ? "page" : undefined}>
                {section.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TheatreRecordsMenuRow(props: { visitUuid: string; encounterUuid: string }) {
  return (
    <div className="flex justify-end py-2">
      <TheatreRecordsMenu {...props} />
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
