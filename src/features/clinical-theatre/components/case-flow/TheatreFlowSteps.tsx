"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Baby,
  BedDouble,
  BookmarkCheck,
  CalendarClock,
  ClipboardList,
  DoorOpen,
  ListChecks,
  Package,
  Scissors,
  Stethoscope,
  Syringe,
  Timer,
  Undo2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import { TheatreAnaesthesiaPanel } from "@/features/clinical-theatre/components/TheatreAnaesthesiaPanel";
import { TheatreCaseActions } from "@/features/clinical-theatre/components/TheatreCaseActions";
import { TheatreCaseDetailsForm } from "@/features/clinical-theatre/components/TheatreCaseDetailsForm";
import { TheatreCaseTraysPanel } from "@/features/clinical-theatre/components/TheatreCaseTraysPanel";
import { TheatreChecklistPanel } from "@/features/clinical-theatre/components/TheatreChecklistPanel";
import { TheatreConsumablesPanel } from "@/features/clinical-theatre/components/TheatreConsumablesPanel";
import { TheatreCountSheetPanel } from "@/features/clinical-theatre/components/TheatreCountSheetPanel";
import { TheatreObstetricPanel } from "@/features/clinical-theatre/components/TheatreObstetricPanel";
import { TheatreOperationNotePanel } from "@/features/clinical-theatre/components/TheatreOperationNotePanel";
import { TheatrePreOpPanel } from "@/features/clinical-theatre/components/TheatrePreOpPanel";
import { TheatreProceduresPanel } from "@/features/clinical-theatre/components/TheatreProceduresPanel";
import { TheatreRecoveryPanel } from "@/features/clinical-theatre/components/TheatreRecoveryPanel";
import { TheatreSafetyBadges } from "@/features/clinical-theatre/components/TheatreSafetyBadges";
import { TheatreTeamPanel } from "@/features/clinical-theatre/components/TheatreTeamPanel";
import { TheatreTimingPanel } from "@/features/clinical-theatre/components/TheatreTimingPanel";
import {
  FactList,
  FlowBlock,
  FlowCallout,
  personInitials,
} from "@/features/clinical-theatre/components/case-flow/theatre-flow-ui";
import {
  useTheatreRecovery,
  useTheatreTeam,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  THEATRE_STATUS_LABELS,
  formatTheatreSlot,
} from "@/features/clinical-theatre/utils/theatre-case-display";
import type {
  TheatreFlowStep,
  TheatreFlowStepId,
  TheatreOperationPart,
} from "@/features/clinical-theatre/utils/theatre-case-flow";
import { theatreOperationParts } from "@/features/clinical-theatre/utils/theatre-case-flow";
import { HANDOVER_DESTINATION_LABELS } from "@/features/clinical-theatre/utils/theatre-record-display";
import { THEATRE_TEAM_ROLE_LABELS } from "@/features/clinical-theatre/utils/theatre-safety-display";
import { cn } from "@/lib/utils";

/** Drawers of the case flow (`?sheet=`). */
export const THEATRE_FLOW_SHEETS = ["team", "preference-card", "return", "inpatient"] as const;
export type TheatreFlowSheet = (typeof THEATRE_FLOW_SHEETS)[number];

export function isTheatreFlowSheet(value: string | null | undefined): value is TheatreFlowSheet {
  return THEATRE_FLOW_SHEETS.some((sheet) => sheet === value);
}

export function useTheatreCan() {
  const { capabilities } = useOpdEncounterWorkspace();
  return (capability: string) => capabilities.includes(capability);
}

export type TheatreStepProps = {
  theatreCase: TheatreCase;
  steps: TheatreFlowStep[];
  stepHref: (step: TheatreFlowStepId, part?: string | null) => string;
  sheetHref: (sheet: TheatreFlowSheet) => string;
  part: TheatreOperationPart | null;
};

const URGENCY_LABELS = { elective: "Elective", urgent: "Urgent", emergency: "Emergency" } as const;

const SOURCE_LABELS = {
  ipd_stay: "Inpatient stay",
  existing_visit: "From a visit (day case)",
  elective: "Elective booking",
} as const;

// --- Booking & team ---------------------------------------------------------

function TeamLine({ theatreCase, sheetHref }: Pick<TheatreStepProps, "theatreCase" | "sheetHref">) {
  const { data: team = [], isLoading } = useTheatreTeam(theatreCase.uuid);
  return (
    <FlowBlock
      title="Surgical team"
      icon={Users}
      description="Who is scrubbed, anaesthetising and circulating."
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={sheetHref("team")} scroll={false}>
            Manage team
          </Link>
        </Button>
      }
      data-testid="theatre-flow-team"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading team…</p>
      ) : team.length === 0 ? (
        <FlowCallout tone="info" title="No one is on the team yet">
          Add at least the surgeon and anaesthetist before the WHO sign in.
        </FlowCallout>
      ) : (
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          {team.map((member) => (
            <li key={member.uuid} className="flex items-center gap-3">
              <span
                aria-hidden
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary"
              >
                {personInitials(member.user_name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-brand-navy">
                  {member.user_name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {THEATRE_TEAM_ROLE_LABELS[member.role] ?? member.role_label}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </FlowBlock>
  );
}

function ToolLink({
  href,
  icon: Icon,
  label,
  detail,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className="group flex items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
    >
      <Icon
        className="size-4 shrink-0 text-brand-muted group-hover:text-brand-primary"
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-brand-navy">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
      <ArrowRight
        className="size-4 text-brand-muted transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

export function TheatreBookingStep({ theatreCase, sheetHref }: TheatreStepProps) {
  const can = useTheatreCan();
  return (
    <>
      <FlowBlock title="Case at a glance" icon={ClipboardList}>
        <FactList
          items={[
            { label: "Urgency", value: URGENCY_LABELS[theatreCase.urgency] },
            {
              label: "NCEPOD",
              value: theatreCase.ncepod_category_label || "Not classified",
            },
            { label: "Source", value: SOURCE_LABELS[theatreCase.source] ?? theatreCase.source },
            { label: "Slot", value: formatTheatreSlot(theatreCase), icon: CalendarClock },
            { label: "Room", value: theatreCase.room?.name ?? "No room yet", icon: DoorOpen },
            {
              label: "Department",
              value:
                [theatreCase.department_name, theatreCase.clinic_name]
                  .filter(Boolean)
                  .join(" · ") || "—",
            },
            { label: "Booked by", value: theatreCase.booked_by_name || "—" },
            { label: "Status", value: THEATRE_STATUS_LABELS[theatreCase.status] },
            { label: "Safety", value: <TheatreSafetyBadges safety={theatreCase.safety} /> },
          ]}
        />
      </FlowBlock>
      <FlowBlock
        title="Procedures"
        icon={Scissors}
        description="Picked from the procedure catalogue; the first is the primary procedure."
      >
        <TheatreProceduresPanel
          theatreCase={theatreCase}
          canEdit={can("book_theatre_case") || can("record_theatre_operation_note")}
          canBill={can("record_theatre_consumables")}
        />
      </FlowBlock>
      <FlowBlock title="Case details" icon={Stethoscope} description="Urgency, surgeon and notes.">
        <TheatreCaseDetailsForm
          key={`${theatreCase.uuid}-${theatreCase.updated_at}`}
          theatreCase={theatreCase}
          canEdit={can("book_theatre_case")}
        />
      </FlowBlock>
      <TeamLine theatreCase={theatreCase} sheetHref={sheetHref} />
      <FlowBlock
        title="Slot, room & changes of plan"
        icon={CalendarClock}
        description="Reschedule, move rooms, or postpone / cancel with a reason."
      >
        {can("transition_theatre_case") ? (
          <TheatreCaseActions theatreCase={theatreCase} transitions="secondary" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Ask a theatre coordinator to change the slot or room.
          </p>
        )}
      </FlowBlock>
      <FlowBlock title="Linked records" icon={BookmarkCheck}>
        <div className="divide-y divide-dash-border/70 border-y border-dash-border/70">
          <ToolLink
            href={sheetHref("preference-card")}
            icon={BookmarkCheck}
            label="Surgeon preference card"
            detail={
              theatreCase.preference_card_applied_at
                ? `Applied ${new Date(theatreCase.preference_card_applied_at).toLocaleString()}`
                : "Load the surgeon's usual setup and items"
            }
          />
          <ToolLink
            href={sheetHref("return")}
            icon={Undo2}
            label="Return to theatre"
            detail={
              theatreCase.return_of
                ? `Return of ${theatreCase.return_of.procedure_description || "an earlier case"}`
                : theatreCase.returns?.length
                  ? `${theatreCase.returns.length} later return${theatreCase.returns.length === 1 ? "" : "s"}`
                  : "Link this case to the original operation"
            }
          />
          <ToolLink
            href={sheetHref("inpatient")}
            icon={BedDouble}
            label="Inpatient stay"
            detail={
              theatreCase.stay_uuid
                ? theatreCase.converted_to_ipd_at
                  ? "Converted from a day case"
                  : "Admitted patient"
                : "Day case — convert to an admission if needed"
            }
          />
        </div>
      </FlowBlock>
    </>
  );
}

// --- Pre-op & WHO -------------------------------------------------------------

export function TheatrePreOpStep({ theatreCase }: TheatreStepProps) {
  return (
    <FlowBlock>
      <TheatrePreOpPanel theatreCase={theatreCase} />
    </FlowBlock>
  );
}

export function TheatreWhoStep({
  theatreCase,
  stage,
  stepHref,
}: TheatreStepProps & { stage: "sign_in" | "time_out" | "sign_out" }) {
  const countBlocker = stage === "sign_out" ? theatreCase.safety?.count_blocker : "";
  return (
    <>
      {countBlocker ? (
        <FlowBlock>
          <FlowCallout
            tone="danger"
            title="The surgical count blocks sign out"
            action={
              <Button asChild size="sm" variant="outline">
                <Link href={stepHref("intra-op", "counts")} scroll={false}>
                  Open counts
                </Link>
              </Button>
            }
          >
            {countBlocker}
          </FlowCallout>
        </FlowBlock>
      ) : null}
      <FlowBlock>
        <TheatreChecklistPanel theatreCase={theatreCase} stages={[stage]} title={null} />
      </FlowBlock>
    </>
  );
}

// --- Operation --------------------------------------------------------------

const PART_ICONS: Record<string, LucideIcon> = {
  anaesthesia: Activity,
  timings: Timer,
  counts: ListChecks,
  trays: Package,
  consumables: Syringe,
  caesarean: Baby,
};

export function TheatreOperationStep({ theatreCase, steps, stepHref, part }: TheatreStepProps) {
  const can = useTheatreCan();
  const parts = theatreOperationParts(theatreCase);
  const active = part ?? "anaesthesia";
  const operation = steps.find((step) => step.id === "intra-op");
  const flagged = new Set<string>();
  if (theatreCase.safety?.count_blocker) flagged.add("counts");
  if (operation?.issues.some((issue) => issue.includes("monitor reading"))) {
    flagged.add("anaesthesia");
  }

  return (
    <>
      <div className="mb-6">
        <nav
          aria-label="Operation records"
          className="scrollbar-hide flex gap-1 overflow-x-auto rounded-xl bg-muted/70 p-1"
          data-testid="theatre-operation-parts"
        >
          {parts.map((item) => {
            const Icon = PART_ICONS[item.id] ?? Activity;
            const selected = item.id === active;
            return (
              <Link
                key={item.id}
                href={stepHref("intra-op", item.id)}
                scroll={false}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                  selected
                    ? "bg-background text-brand-navy shadow-sm"
                    : "text-brand-muted hover:text-brand-navy",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {item.id === "consumables" ? "Items & implants" : item.label}
                {flagged.has(item.id) ? (
                  <span
                    className="size-1.5 rounded-full bg-amber-500"
                    aria-label="needs attention"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
      <div data-testid={`theatre-operation-part-${active}`}>
        {active === "anaesthesia" ? <TheatreAnaesthesiaPanel theatreCase={theatreCase} /> : null}
        {active === "timings" ? (
          <TheatreTimingPanel theatreCase={theatreCase} canRecord={can("record_theatre_timings")} />
        ) : null}
        {active === "counts" ? (
          <TheatreCountSheetPanel
            theatreCase={theatreCase}
            canRecord={can("record_theatre_counts")}
            canSign={can("sign_theatre_count_resolution")}
          />
        ) : null}
        {active === "trays" ? (
          <TheatreCaseTraysPanel
            theatreCase={theatreCase}
            canAssign={can("assign_theatre_trays")}
          />
        ) : null}
        {active === "consumables" ? <TheatreConsumablesPanel theatreCase={theatreCase} /> : null}
        {active === "caesarean" ? (
          <TheatreObstetricPanel
            theatreCase={theatreCase}
            canRecord={can("record_theatre_obstetrics")}
            canRegister={can("register_theatre_newborn")}
          />
        ) : null}
      </div>
    </>
  );
}

// --- Op note, recovery, handover ---------------------------------------------

export function TheatreOpNoteStep({ theatreCase }: TheatreStepProps) {
  return (
    <FlowBlock>
      <TheatreOperationNotePanel theatreCase={theatreCase} />
    </FlowBlock>
  );
}

export function TheatreRecoveryStep({ theatreCase }: TheatreStepProps) {
  return (
    <FlowBlock>
      <TheatreRecoveryPanel theatreCase={theatreCase} />
    </FlowBlock>
  );
}

export function TheatreHandoverStep({ theatreCase, steps, stepHref }: TheatreStepProps) {
  const can = useTheatreCan();
  const { data: recovery } = useTheatreRecovery(theatreCase.uuid);
  const finished =
    theatreCase.status === "discharged_ward" || theatreCase.status === "discharged_home";
  const missing = steps.filter((step) => step.id !== "handover" && step.state === "attention");

  return (
    <>
      {!finished ? (
        <FlowBlock>
          <FlowCallout tone="info" title="Not handed over yet">
            The handover is recorded when the patient is discharged from recovery.
          </FlowCallout>
        </FlowBlock>
      ) : null}
      <FlowBlock title="Handover" icon={BedDouble}>
        <FactList
          items={[
            { label: "Outcome", value: THEATRE_STATUS_LABELS[theatreCase.status] },
            {
              label: "Discharged",
              value: theatreCase.discharged_at
                ? new Date(theatreCase.discharged_at).toLocaleString()
                : "—",
            },
            {
              label: "Destination",
              value: recovery?.handover_destination
                ? HANDOVER_DESTINATION_LABELS[recovery.handover_destination]
                : "—",
            },
            { label: "Handed over to", value: recovery?.handed_over_to || "—" },
            {
              label: "Discharge Aldrete",
              value: recovery?.discharge_score ?? recovery?.latest_aldrete ?? "—",
            },
            { label: "Discharged by", value: recovery?.discharged_by_name || "—" },
          ]}
        />
      </FlowBlock>
      <FlowBlock title="Record completeness" icon={ListChecks}>
        {missing.length === 0 ? (
          <p className="text-sm text-emerald-700">Every step of the case is recorded.</p>
        ) : (
          <ul className="divide-y divide-dash-border/70 border-y border-dash-border/70">
            {missing.map((step) => (
              <li key={step.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="font-medium text-brand-navy">{step.label}</span>
                <span className="flex-1 text-amber-700">{step.issues[0] ?? "Not recorded"}</span>
                <Link
                  href={stepHref(step.id)}
                  scroll={false}
                  className="text-sm font-medium text-brand-primary hover:underline"
                >
                  Complete
                </Link>
              </li>
            ))}
          </ul>
        )}
      </FlowBlock>
      <FlowBlock>
        <TheatreTimingPanel theatreCase={theatreCase} canRecord={can("record_theatre_timings")} />
      </FlowBlock>
    </>
  );
}

export function TheatreTeamSheetBody({ theatreCase }: { theatreCase: TheatreCase }) {
  return <TheatreTeamPanel theatreCase={theatreCase} />;
}
