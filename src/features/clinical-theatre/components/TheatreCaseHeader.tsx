"use client";

import Link from "next/link";
import { CalendarClock, DoorOpen, Stethoscope, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import { TheatreCaseSetupCard } from "@/features/clinical-theatre/components/TheatreCaseSetupCard";
import { TheatreCaseStepper } from "@/features/clinical-theatre/components/TheatreCaseStepper";
import { THEATRE_WORKSPACE_ROUTING } from "@/features/clinical-theatre/constants/theatre-workspace-routing";
import {
  useTheatreCaseForEncounter,
  useTheatreTeam,
  useTransitionTheatreCase,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  THEATRE_STATUS_LABELS,
  THEATRE_TRANSITION_ACTION_LABELS,
  formatTheatreSlot,
  theatreStatusTone,
} from "@/features/clinical-theatre/utils/theatre-case-display";
import { THEATRE_TEAM_ROLE_LABELS } from "@/features/clinical-theatre/utils/theatre-safety-display";
import {
  theatreNextAction,
  type TheatreIntraOpSection,
  type TheatreWorkspaceSection,
} from "@/features/clinical-theatre/utils/theatre-workflow";
import type { ClinicalWorkspaceBannerProps } from "@/features/clinical-workspace/types/clinical-workspace.types";
import { workspaceTabHref } from "@/features/clinical-workspace/utils/workspace-tabs";

const URGENCY_TONE = {
  elective: "neutral",
  urgent: "warning",
  emergency: "danger",
} as const;

function sectionHrefFor(visitUuid: string, encounterUuid: string) {
  return (section: TheatreWorkspaceSection, sub?: TheatreIntraOpSection | null) => {
    const href = workspaceTabHref(THEATRE_WORKSPACE_ROUTING, visitUuid, encounterUuid, section);
    return sub ? `${href}?section=${sub}` : href;
  };
}

/** Case header shown above every theatre workspace section. */
export function TheatreCaseHeader({ visitUuid, encounterUuid }: ClinicalWorkspaceBannerProps) {
  const { capabilities } = useOpdEncounterWorkspace();
  const { theatreCase, isLoading, error } = useTheatreCaseForEncounter(encounterUuid);

  if (isLoading) {
    return (
      <div className="px-4 pt-3 sm:px-6">
        <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
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
  return (
    <div className="px-4 pt-3 sm:px-6" data-testid="theatre-case-header">
      {theatreCase ? (
        <TheatreCaseHeaderCard
          theatreCase={theatreCase}
          visitUuid={visitUuid}
          encounterUuid={encounterUuid}
          canTransition={capabilities.includes("transition_theatre_case")}
        />
      ) : (
        <TheatreCaseSetupCard
          encounterUuid={encounterUuid}
          canBook={capabilities.includes("book_theatre_case")}
        />
      )}
    </div>
  );
}

type HeaderCardProps = {
  theatreCase: TheatreCase;
  visitUuid: string;
  encounterUuid: string;
  canTransition: boolean;
};

function TheatreCaseHeaderCard({
  theatreCase,
  visitUuid,
  encounterUuid,
  canTransition,
}: HeaderCardProps) {
  const { data: team = [] } = useTheatreTeam(theatreCase.uuid);
  const sectionHref = sectionHrefFor(visitUuid, encounterUuid);
  const keyTeam = team.filter((member) =>
    ["surgeon", "anaesthetist", "scrub_nurse"].includes(member.role),
  );

  return (
    <div className="space-y-3 rounded-lg border bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-brand-navy">
              {theatreCase.procedure_description || "Procedure not set"}
            </h2>
            <StatusDotBadge tone={theatreStatusTone(theatreCase.status)}>
              {THEATRE_STATUS_LABELS[theatreCase.status]}
            </StatusDotBadge>
            {theatreCase.urgency !== "elective" ? (
              <StatusDotBadge tone={URGENCY_TONE[theatreCase.urgency]}>
                {theatreCase.urgency === "emergency" ? "Emergency" : "Urgent"}
              </StatusDotBadge>
            ) : null}
          </div>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
            <HeaderFact
              icon={Stethoscope}
              label="Team"
              value={
                keyTeam.length > 0
                  ? keyTeam
                      .map(
                        (member) =>
                          `${THEATRE_TEAM_ROLE_LABELS[member.role]}: ${member.user_name}`,
                      )
                      .join(" · ")
                  : theatreCase.lead_surgeon_name
                    ? `Surgeon: ${theatreCase.lead_surgeon_name}`
                    : "No team yet"
              }
            />
          </dl>
        </div>
        {canTransition ? (
          <TheatreNextAction theatreCase={theatreCase} sectionHref={sectionHref} />
        ) : null}
      </div>
      <TheatreCaseStepper status={theatreCase.status} />
    </div>
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
    <div className="flex items-center gap-1.5">
      <Icon className="size-3.5" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TheatreNextAction({
  theatreCase,
  sectionHref,
}: {
  theatreCase: TheatreCase;
  sectionHref: ReturnType<typeof sectionHrefFor>;
}) {
  const transition = useTransitionTheatreCase();
  const action = theatreNextAction(theatreCase);

  if (action.kind === "none") return null;
  if (action.kind === "recovery-discharge") {
    return (
      <Button asChild size="sm">
        <Link href={sectionHref("recovery")}>Discharge from recovery</Link>
      </Button>
    );
  }
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
        <p className="text-xs text-amber-700" data-testid="theatre-next-action-blocker">
          {action.blocker}{" "}
          {action.fixSection ? (
            <Link
              className="font-medium underline"
              href={sectionHref(action.fixSection, action.fixSubSection)}
            >
              Open
            </Link>
          ) : null}
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
