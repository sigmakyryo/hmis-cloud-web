"use client";

import { Calendar, ListTodo, NotebookPen } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { AppointmentStatusBadge } from "@/features/appointments/components/AppointmentStatusBadge";
import {
  selectUpcomingAppointments,
  useCustomerAppointments,
} from "@/features/appointments/hooks/use-customer-appointments";
import type { Appointment } from "@/features/appointments/types/appointment.types";
import {
  DetailPageAsidePanelHeader,
  DetailPageAsidePanelSection,
  DetailPageAsideSummarySection,
} from "@/features/app-shell/components/page-layout";
import { OpdManageAllergiesDialog } from "@/features/clinical-opd/components/detail/OpdManageAllergiesDialog";
import { OpdVitalSetCard } from "@/features/clinical-opd/components/detail/OpdVitalSetCard";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import type {
  ChartAllergy,
  EncounterClinicalOrder,
  EncounterNursingNote,
  EncounterObservation,
} from "@/features/clinical-opd/types/clinical-opd.types";
import {
  buildOpdActivityOrderStatusRows,
  formatOpdActivityOrderStatusLabel,
  opdActivityOrderStatusBadgeVariant,
} from "@/features/clinical-opd/utils/opd-activity-order-status";
import { groupObservationsIntoVitalSets } from "@/features/clinical-opd/utils/opd-encounter-vitals";
import { formatDisplayDateTime } from "@/features/customers/utils/format-customer";
import { cn } from "@/lib/utils";

type OpdActivityAsidePanelProps = {
  orders: EncounterClinicalOrder[];
  nursingNotes: EncounterNursingNote[];
  observations: EncounterObservation[];
  isLoading?: boolean;
  className?: string;
};

function AsideEmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-brand-muted">{children}</p>;
}

const HIGH_RISK_SEVERITIES = new Set(["severe", "life_threatening"]);

function formatSeverity(severity: string): string {
  const label = severity.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function AllergiesSection({ allergies }: { allergies: ChartAllergy[] }) {
  const {
    visitUuid,
    encounterUuid,
    visibleTabIds,
    capabilities,
    isChartLocked,
  } = useOpdEncounterWorkspace();
  const [manageOpen, setManageOpen] = useState(false);
  const canManage =
    visibleTabIds.includes("allergies") ||
    (capabilities.includes("record_allergy") && !isChartLocked);

  return (
    <>
      <DetailPageAsideSummarySection
        title="Allergies"
        data-testid="opd-activity-allergies"
        action={
          canManage ? (
            <button
              type="button"
              className="text-xs font-medium text-brand-muted transition-colors hover:text-brand-navy"
              onClick={() => setManageOpen(true)}
              data-testid="opd-activity-allergies-manage"
            >
              Manage
            </button>
          ) : null
        }
      >
        {allergies.length === 0 ? (
          <AsideEmptyLine>No known allergies</AsideEmptyLine>
        ) : (
          <ul className="space-y-2.5">
            {allergies.map((allergy) => (
              <li
                key={allergy.uuid}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-brand-navy">
                    {allergy.allergy_name}
                  </p>
                  {allergy.reaction ? (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-brand-muted">
                      {allergy.reaction}
                    </p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    HIGH_RISK_SEVERITIES.has(allergy.severity)
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-800",
                  )}
                >
                  {formatSeverity(allergy.severity)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DetailPageAsideSummarySection>
      {canManage ? (
        <OpdManageAllergiesDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          visitUuid={visitUuid}
          encounterUuid={encounterUuid}
        />
      ) : null}
    </>
  );
}

function OrdersSection({ orders }: { orders: EncounterClinicalOrder[] }) {
  const rows = buildOpdActivityOrderStatusRows(orders);

  return (
    <DetailPageAsideSummarySection title="Orders">
      {rows.length === 0 ? (
        <AsideEmptyLine>No orders yet</AsideEmptyLine>
      ) : (
        <ul className="space-y-2.5" data-testid="opd-activity-orders-status">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate text-brand-slate">
                {row.label}
              </span>
              <Badge
                variant={opdActivityOrderStatusBadgeVariant(row.status)}
                className="shrink-0"
                data-testid={`opd-activity-order-status-${row.status.replaceAll(" ", "-")}`}
              >
                {formatOpdActivityOrderStatusLabel(row.status)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </DetailPageAsideSummarySection>
  );
}

function NotesSection({ notes }: { notes: EncounterNursingNote[] }) {
  return (
    <DetailPageAsideSummarySection title="Notes">
      {notes.length === 0 ? (
        <AsideEmptyLine>No nursing notes</AsideEmptyLine>
      ) : (
        <ul className="space-y-3" data-testid="opd-activity-nursing-notes">
          {notes.map((note) => (
            <li
              key={note.uuid}
              className="rounded-lg border border-dash-border/70 bg-slate-50/50 px-3 py-2.5"
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-brand-muted">
                <NotebookPen className="size-3 shrink-0" aria-hidden />
                <time dateTime={note.recorded_at}>
                  {formatDisplayDateTime(note.recorded_at)}
                </time>
                {note.recorded_by_name ? (
                  <span className="truncate">· {note.recorded_by_name}</span>
                ) : null}
              </div>
              <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed text-brand-slate">
                {note.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </DetailPageAsideSummarySection>
  );
}

function VitalSignsSection({
  observations,
}: {
  observations: EncounterObservation[];
}) {
  const sets = groupObservationsIntoVitalSets(observations);
  const latest = sets[0] ?? null;

  return (
    <DetailPageAsideSummarySection title="Vital signs">
      {!latest ? (
        <AsideEmptyLine>No vital signs recorded</AsideEmptyLine>
      ) : (
        <div data-testid="opd-activity-latest-vital-signs">
          {sets.length > 1 ? (
            <p className="mb-2 text-[11px] text-brand-muted">
              Showing latest of {sets.length} sets
            </p>
          ) : null}
          <OpdVitalSetCard set={latest} compact framed={false} />
        </div>
      )}
    </DetailPageAsideSummarySection>
  );
}

function TasksSection() {
  return (
    <DetailPageAsideSummarySection title="Tasks">
      <div
        className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-dash-border/80 bg-slate-50/40 px-3 py-6 text-center"
        data-testid="opd-activity-tasks-empty"
      >
        <ListTodo className="size-4 text-brand-muted" aria-hidden />
        <p className="text-sm text-brand-muted">No tasks found</p>
      </div>
    </DetailPageAsideSummarySection>
  );
}

function AppointmentsSection({
  appointments,
  isLoading,
}: {
  appointments: Appointment[];
  isLoading: boolean;
}) {
  const upcoming = selectUpcomingAppointments(appointments);

  return (
    <DetailPageAsideSummarySection title="Appointments">
      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : upcoming.length === 0 ? (
        <AsideEmptyLine>No upcoming appointments</AsideEmptyLine>
      ) : (
        <ul className="space-y-2.5" data-testid="opd-activity-appointments">
          {upcoming.map((appointment) => (
            <li
              key={appointment.uuid}
              className="rounded-lg border border-dash-border/70 bg-slate-50/50 px-3 py-2.5"
              data-testid={`opd-activity-appointment-${appointment.uuid}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-navy">
                    {appointment.department_name || "Appointment"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-brand-muted">
                    <Calendar className="size-3 shrink-0" aria-hidden />
                    <time dateTime={appointment.scheduled_start}>
                      {formatDisplayDateTime(appointment.scheduled_start)}
                    </time>
                  </p>
                  {appointment.clinician_name ? (
                    <p className="mt-0.5 truncate text-[11px] text-brand-muted">
                      {appointment.clinician_name}
                    </p>
                  ) : null}
                </div>
                <AppointmentStatusBadge status={appointment.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </DetailPageAsideSummarySection>
  );
}

export function OpdActivityAsidePanel({
  orders,
  nursingNotes,
  observations,
  isLoading = false,
  className,
}: OpdActivityAsidePanelProps) {
  const { customer, chartSummary } = useOpdEncounterWorkspace();
  const appointmentsQuery = useCustomerAppointments(customer?.uuid);

  return (
    <DetailPageAsidePanelSection
      className={cn("order-last xl:order-0", className)}
      data-testid="opd-activity-aside-panel"
    >
      <DetailPageAsidePanelHeader
        title="Encounter panel"
        description="Allergies, orders, notes, vital signs, tasks, and appointments"
      />

      {isLoading ? (
        <div className="space-y-4 pt-2" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className="h-16 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <>
          <AllergiesSection allergies={chartSummary?.allergies ?? []} />
          <OrdersSection orders={orders} />
          <NotesSection notes={nursingNotes} />
          <VitalSignsSection observations={observations} />
          <TasksSection />
          <AppointmentsSection
            appointments={appointmentsQuery.data ?? []}
            isLoading={appointmentsQuery.isLoading}
          />
        </>
      )}
    </DetailPageAsidePanelSection>
  );
}
