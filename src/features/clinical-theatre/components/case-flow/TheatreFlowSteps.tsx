"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Baby,
  BedDouble,
  BookmarkCheck,
  ListChecks,
  Package,
  Syringe,
  Timer,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import type { StatusDotBadgeTone } from "@/components/ui/status-dot-badge";
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
import { TheatreTeamPanel } from "@/features/clinical-theatre/components/TheatreTeamPanel";
import { TheatreTimingPanel } from "@/features/clinical-theatre/components/TheatreTimingPanel";
import {
  FactList,
  FlowBlock,
  FlowCallout,
  FlowTabs,
  personInitials,
} from "@/features/clinical-theatre/components/case-flow/theatre-flow-ui";
import {
  useTheatreRecovery,
  useTheatreTeam,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCase,
  TheatreTeamMember,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  THEATRE_STATUS_LABELS,
  formatTheatreSlot,
  theatreStatusTone,
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

function urgencyTone(urgency: TheatreCase["urgency"]): StatusDotBadgeTone {
  if (urgency === "emergency") return "danger";
  if (urgency === "urgent") return "warning";
  return "neutral";
}

function teamIsReady(team: TheatreTeamMember[]): boolean {
  return (
    team.some((member) => member.role === "surgeon") &&
    team.some((member) => member.role === "anaesthetist")
  );
}

function linkedRecordsCount(theatreCase: TheatreCase): number {
  return [
    Boolean(theatreCase.preference_card_applied_at),
    Boolean(theatreCase.return_of) || (theatreCase.returns?.length ?? 0) > 0,
    Boolean(theatreCase.stay_uuid),
  ].filter(Boolean).length;
}

/** Gaps on the booking step, each pointing at the tab that fills it. */
export type BookingGlanceGap = {
  label: string;
  tab: "procedures" | "overview" | "team" | "slot";
};

export function bookingGlanceGaps(
  theatreCase: TheatreCase,
  team: TheatreTeamMember[],
  teamLoaded: boolean,
): BookingGlanceGap[] {
  const gaps: BookingGlanceGap[] = [];
  if ((theatreCase.procedures?.length ?? 0) === 0 && !theatreCase.procedure_description?.trim()) {
    gaps.push({ label: "No procedure listed", tab: "procedures" });
  }
  if (!theatreCase.scheduled_start) {
    gaps.push({ label: "No slot scheduled", tab: "slot" });
  }
  if (!theatreCase.room) {
    gaps.push({ label: "No room", tab: "slot" });
  }
  if (teamLoaded) {
    if (team.length === 0) {
      gaps.push({ label: "No one on the team", tab: "team" });
    } else {
      if (!team.some((member) => member.role === "surgeon")) {
        gaps.push({ label: "Surgeon not assigned", tab: "team" });
      }
      if (!team.some((member) => member.role === "anaesthetist")) {
        gaps.push({ label: "Anaesthetist not assigned", tab: "team" });
      }
    }
  }
  if (!theatreCase.ncepod_category && !theatreCase.ncepod_category_label) {
    gaps.push({ label: "NCEPOD not classified", tab: "overview" });
  }
  return gaps;
}

function glanceValueClass(missing: boolean): string {
  return missing ? "font-medium text-amber-800" : "text-brand-navy";
}

function SafetyChecks({ safety }: { safety?: TheatreCase["safety"] }) {
  const items = [
    { key: "pre_op_ready" as const, label: "Pre-op" },
    { key: "sign_in" as const, label: "Sign in" },
    { key: "time_out" as const, label: "Time out" },
    { key: "sign_out" as const, label: "Sign out" },
  ];
  const done = items.filter((item) => safety?.[item.key]).length;
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4"
      data-testid="theatre-overview-safety"
    >
      <span className="font-semibold tabular-nums text-brand-muted">{done}/4 checks</span>
      {items.map((item) => {
        const on = Boolean(safety?.[item.key]);
        return (
          <span key={item.key} className="inline-flex items-center gap-1">
            <span
              className={`size-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-dash-muted"}`}
              aria-hidden
            />
            <span className={on ? "text-brand-navy" : "text-brand-muted"}>{item.label}</span>
          </span>
        );
      })}
    </div>
  );
}

function OverviewGroup({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; missing?: boolean }[];
}) {
  return (
    <section>
      <h4 className="border-b border-dash-border/70 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
        {title}
      </h4>
      <dl>
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 py-1.5 text-[12px] leading-5"
          >
            <dt className="shrink-0 text-brand-muted">{row.label}</dt>
            <dd className={`min-w-0 break-words text-right ${glanceValueClass(Boolean(row.missing))}`}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function caseProcedureTitle(theatreCase: TheatreCase): string {
  const primary =
    theatreCase.procedures?.find((procedure) => procedure.is_primary) ?? theatreCase.procedures?.[0];
  return primary?.name?.trim() || theatreCase.procedure_description?.trim() || "No procedure yet";
}

function BookingOverview({
  theatreCase,
  team,
  teamLoaded,
  canEdit,
  onJump,
}: {
  theatreCase: TheatreCase;
  team: TheatreTeamMember[];
  teamLoaded: boolean;
  canEdit: boolean;
  onJump: (tab: BookingGlanceGap["tab"]) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const gaps = bookingGlanceGaps(theatreCase, team, teamLoaded);
  const title = caseProcedureTitle(theatreCase);
  const ncepod = theatreCase.ncepod_category_label || "Not classified";
  const notes = theatreCase.notes?.trim() || "—";
  const slot = formatTheatreSlot(theatreCase);
  const room = theatreCase.room?.name ?? "No room yet";
  const department =
    [theatreCase.department_name, theatreCase.clinic_name].filter(Boolean).join(" · ") || "—";
  const source = SOURCE_LABELS[theatreCase.source] ?? theatreCase.source ?? "—";

  function onGap(tab: BookingGlanceGap["tab"]) {
    if (tab === "overview") {
      setDetailsOpen(true);
      return;
    }
    onJump(tab);
  }

  return (
    <div data-testid="theatre-case-glance">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className={`text-[15px] font-semibold leading-6 ${
              title === "No procedure yet" ? "text-brand-muted" : "text-brand-navy"
            }`}
          >
            {title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusDotBadge tone={theatreStatusTone(theatreCase.status)}>
              {THEATRE_STATUS_LABELS[theatreCase.status]}
            </StatusDotBadge>
            <StatusDotBadge tone={urgencyTone(theatreCase.urgency)}>
              {URGENCY_LABELS[theatreCase.urgency]}
            </StatusDotBadge>
          </div>
        </div>
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDetailsOpen(true)}
          >
            Edit
          </Button>
        ) : null}
      </div>
      <SafetyChecks safety={theatreCase.safety} />
      <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <OverviewGroup
          title="Case"
          rows={[
            { label: "NCEPOD", value: ncepod, missing: ncepod === "Not classified" },
            { label: "Urgency", value: URGENCY_LABELS[theatreCase.urgency] },
            { label: "Notes", value: notes },
          ]}
        />
        <OverviewGroup
          title="Schedule"
          rows={[
            { label: "Slot", value: slot, missing: !theatreCase.scheduled_start },
            { label: "Room", value: room, missing: !theatreCase.room },
          ]}
        />
        <OverviewGroup
          title="Booking"
          rows={[
            { label: "Source", value: source },
            { label: "Department", value: department },
            { label: "Booked by", value: theatreCase.booked_by_name || "—" },
          ]}
        />
      </div>
      {gaps.length > 0 ? (
        <div
          className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-[12px] leading-5"
          data-testid="theatre-case-glance-missing"
        >
          <span className="font-medium text-amber-800">Needs attention</span>
          {gaps.map((gap) => (
            <button
              key={gap.label}
              type="button"
              onClick={() => onGap(gap.tab)}
              className="text-amber-950 underline decoration-amber-300 underline-offset-2 outline-none hover:decoration-amber-600 focus-visible:ring-2 focus-visible:ring-brand-primary/40"
            >
              {gap.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4" data-testid="theatre-case-glance-ready">
          <StatusDotBadge tone="success">Ready</StatusDotBadge>
        </div>
      )}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl" data-testid="theatre-case-details-dialog">
          <DialogHeader>
            <DialogTitle>Case details</DialogTitle>
            <DialogDescription>
              Urgency, NCEPOD category, procedure description and notes.
            </DialogDescription>
          </DialogHeader>
          <TheatreCaseDetailsForm
            key={`${theatreCase.uuid}-${theatreCase.updated_at}-${String(detailsOpen)}`}
            theatreCase={theatreCase}
            canEdit={canEdit}
            onSaved={() => setDetailsOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamLine({ theatreCase, sheetHref }: Pick<TheatreStepProps, "theatreCase" | "sheetHref">) {
  const { data: team = [], isLoading } = useTheatreTeam(theatreCase.uuid);
  return (
    <div data-testid="theatre-flow-team">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          Who is scrubbed, anaesthetising and circulating.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={sheetHref("team")} scroll={false}>
            Manage team
          </Link>
        </Button>
      </div>
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
    </div>
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
  const { data: team = [], isLoading: teamLoading } = useTheatreTeam(theatreCase.uuid);
  const [tab, setTab] = useState("overview");
  const procedureCount = theatreCase.procedures?.length ?? 0;
  const hasProcedure = procedureCount > 0 || Boolean(theatreCase.procedure_description?.trim());
  const linkedCount = linkedRecordsCount(theatreCase);
  const slotMissing = !theatreCase.scheduled_start || !theatreCase.room;
  const gaps = bookingGlanceGaps(theatreCase, team, !teamLoading);
  const canEditDetails = can("book_theatre_case");

  return (
    <FlowTabs
      aria-label="Booking"
      data-testid="theatre-booking-tabs"
      value={tab}
      onValueChange={setTab}
      defaultTab="overview"
      tabs={[
        {
          id: "overview",
          label: "Overview",
          badge: gaps.length > 0 ? gaps.length : undefined,
          attention: gaps.length > 0,
          panel: (
            <BookingOverview
              theatreCase={theatreCase}
              team={team}
              teamLoaded={!teamLoading}
              canEdit={canEditDetails}
              onJump={setTab}
            />
          ),
        },
        {
          id: "procedures",
          label: "Procedures",
          badge: procedureCount,
          attention: !hasProcedure,
          panel: (
            <TheatreProceduresPanel
              theatreCase={theatreCase}
              canEdit={canEditDetails || can("record_theatre_operation_note")}
              canBill={can("record_theatre_consumables")}
            />
          ),
        },
        {
          id: "team",
          label: "Team",
          badge: teamLoading ? undefined : team.length,
          attention: !teamLoading && !teamIsReady(team),
          panel: <TeamLine theatreCase={theatreCase} sheetHref={sheetHref} />,
        },
        {
          id: "slot",
          label: "Slot & room",
          attention: slotMissing,
          panel: (
            <>
              <p className="mb-4 text-[13px] text-muted-foreground">
                Reschedule, move rooms, or postpone / cancel with a reason.
              </p>
              {can("transition_theatre_case") ? (
                <TheatreCaseActions theatreCase={theatreCase} transitions="secondary" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ask a theatre coordinator to change the slot or room.
                </p>
              )}
            </>
          ),
        },
        {
          id: "records",
          label: "Records",
          badge: linkedCount,
          panel: (
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
          ),
        },
      ]}
    />
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
