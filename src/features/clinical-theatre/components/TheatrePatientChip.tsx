"use client";

import { CalendarPlus, ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { UserIdenticon } from "@/components/UserIdenticon";
import { SecondaryButton } from "@/components/ui/app-buttons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CreateAppointmentDialog } from "@/features/appointments/components/CreateAppointmentDialog";
import { customerAppointmentsQueryKey } from "@/features/appointments/hooks/use-customer-appointments";
import { OpdEncounterStatusBadge } from "@/features/clinical-opd/components/OpdEncounterStatusBadge";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import { formatOpdEncounterPaymentLabel } from "@/features/clinical-opd/utils/format-opd-encounter-payment";
import {
  formatOpdQueueStage,
  formatWaitingMinutes,
} from "@/features/clinical-opd/utils/opd-queue-stage";
import type { OpdQueueEncounter } from "@/features/clinical-opd/types/clinical-opd.types";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { formatVisitElapsed } from "@/features/customers/utils/format-visit-elapsed";
import { formatAge } from "@/lib/age";
import { cn } from "@/lib/utils";

export type TheatrePatientChipProps = {
  /** Name from the theatre case, used before the customer record loads. */
  fallbackName?: string | null;
};

const STATUS_BADGE_DARK: Record<string, string> = {
  waiting: "dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100",
  in_progress: "dark:border-brand-primary/40 dark:bg-brand-primary/15",
  completed:
    "dark:border-border dark:bg-transparent dark:text-muted-foreground",
  cancelled: "dark:border-red-900 dark:bg-red-950/50 dark:text-red-100",
};

function formatStartedValue(startedAt: string | null | undefined): string {
  if (!startedAt) {
    return "Not started";
  }
  const elapsed = formatVisitElapsed(startedAt);
  if (!elapsed) {
    return "Not started";
  }
  return elapsed === "Just now" ? "Just now" : `${elapsed} ago`;
}

function formatSexShort(gender: string | null | undefined): string | null {
  if (!gender) {
    return null;
  }
  const normalized = gender.trim();
  if (!normalized) {
    return null;
  }
  const lower = normalized.toLowerCase();
  if (lower === "female" || lower === "f") {
    return "F";
  }
  if (lower === "male" || lower === "m") {
    return "M";
  }
  return normalized;
}

function buildVisitFacts(
  encounter: OpdQueueEncounter | null | undefined,
): Array<{ key: string; label: string; value: string }> {
  if (!encounter) {
    return [];
  }

  const facts: Array<{ key: string; label: string; value: string }> = [];

  if (encounter.department_name) {
    facts.push({
      key: "department",
      label: "Department",
      value: encounter.department_name,
    });
  }
  if (encounter.clinic_name) {
    facts.push({
      key: "clinic",
      label: "Clinic",
      value: encounter.clinic_name,
    });
  }
  if (encounter.queue_stage) {
    facts.push({
      key: "queue-stage",
      label: "Queue",
      value: formatOpdQueueStage(encounter.queue_stage),
    });
  }
  if (typeof encounter.waiting_minutes === "number") {
    facts.push({
      key: "waiting",
      label: "Waiting",
      value: formatWaitingMinutes(encounter.waiting_minutes),
    });
  }
  facts.push({
    key: "started",
    label: "Started",
    value: formatStartedValue(encounter.started_at),
  });
  facts.push({
    key: "payment",
    label: "Payment",
    value: formatOpdEncounterPaymentLabel(encounter),
  });

  return facts;
}

function resolveIdentity(
  customer: Customer | null | undefined,
  encounter: OpdQueueEncounter | null | undefined,
) {
  const fullName = customer
    ? formatCustomerName(customer)
    : (encounter?.customer_name ?? null);
  const identifier =
    customer?.customer_identifier ?? encounter?.customer_identifier ?? null;
  const age = customer ? formatAge(customer.dob, { empty: "" }) || null : null;
  const gender = customer?.gender ?? null;
  const identiconSeed =
    customer?.uuid ||
    customer?.customer_identifier ||
    encounter?.customer_uuid ||
    encounter?.customer_identifier ||
    fullName ||
    "patient";

  return {
    fullName,
    identifier,
    age,
    gender,
    sexShort: formatSexShort(gender),
    identiconSeed,
    photoUrl: customer?.photo_url ?? null,
    status: encounter?.status ?? null,
  };
}

/**
 * Compact, sticky patient identity. Visit meta and the Schedule action live
 * in a side sheet so they do not occupy a permanent header.
 */
export function TheatrePatientChip({ fallbackName }: TheatrePatientChipProps) {
  const { customer, encounter } = useOpdEncounterWorkspace();
  const queryClient = useQueryClient();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const identity = resolveIdentity(customer, encounter);
  const fullName = identity.fullName ?? fallbackName ?? null;

  if (!fullName) {
    return (
      <div
        className="flex items-center gap-2 py-0.5"
        data-testid="theatre-patient-chip-skeleton"
        aria-hidden
      >
        <div className="size-7 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-36 animate-pulse rounded bg-muted/70" />
      </div>
    );
  }

  const chipMeta = [identity.identifier, identity.age, identity.sexShort]
    .filter(Boolean)
    .join(" · ");
  const sheetMeta = [identity.identifier, identity.age, identity.gender]
    .filter(Boolean)
    .join(" · ");
  const facts = buildVisitFacts(encounter);
  const statusLabel = identity.status
    ? identity.status.replaceAll("_", " ")
    : null;

  const openSchedule = () => {
    setDetailsOpen(false);
    setScheduleOpen(true);
  };

  return (
    <>
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              "group inline-flex max-w-full items-center gap-2 rounded-full border border-dash-border/80 bg-background py-0.5 pl-0.5 pr-2",
              "text-left shadow-sm transition-colors",
              "hover:border-brand-primary/40 hover:bg-muted/40",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
              "dark:border-border dark:bg-background dark:hover:bg-muted/30",
            )}
            aria-haspopup="dialog"
            aria-expanded={detailsOpen}
            aria-label={
              statusLabel
                ? `${fullName}, ${chipMeta || "patient"}, ${statusLabel}. Open visit details.`
                : `${fullName}, ${chipMeta || "patient"}. Open visit details.`
            }
            data-testid="theatre-patient-chip"
          >
            <UserIdenticon
              seed={identity.identiconSeed}
              name={fullName}
              imageUrl={identity.photoUrl}
              fallback="initials"
              className="size-7 shrink-0 rounded-full"
              fallbackClassName="rounded-full text-[11px] font-semibold"
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold tracking-tight text-brand-navy">
                {fullName}
              </span>
              {chipMeta ? (
                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                  {chipMeta}
                </span>
              ) : null}
            </span>
            {identity.status ? (
              <OpdEncounterStatusBadge
                status={identity.status}
                className={cn(
                  "shrink-0",
                  STATUS_BADGE_DARK[identity.status] ??
                    "dark:border-border dark:bg-transparent dark:text-muted-foreground",
                )}
              />
            ) : null}
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                detailsOpen && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          data-testid="theatre-patient-sheet"
        >
          <SheetHeader className="border-b border-dash-border/70 px-6 py-5 text-left">
            <div className="flex items-start gap-3 pr-6">
              <UserIdenticon
                seed={identity.identiconSeed}
                name={fullName}
                imageUrl={identity.photoUrl}
                fallback="initials"
                className="size-12 shrink-0 rounded-full"
                fallbackClassName="rounded-full text-sm font-semibold"
              />
              <div className="min-w-0 space-y-1">
                <SheetTitle className="truncate text-lg text-brand-navy">
                  {fullName}
                </SheetTitle>
                {sheetMeta ? (
                  <SheetDescription className="font-mono text-[13px] text-muted-foreground">
                    {sheetMeta}
                  </SheetDescription>
                ) : (
                  <SheetDescription className="sr-only">
                    Visit and patient details
                  </SheetDescription>
                )}
                {identity.status ? (
                  <OpdEncounterStatusBadge
                    status={identity.status}
                    className={STATUS_BADGE_DARK[identity.status]}
                  />
                ) : null}
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {facts.length > 0 ? (
              <section aria-labelledby="theatre-patient-visit-heading">
                <h3
                  id="theatre-patient-visit-heading"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  This visit
                </h3>
                <dl className="mt-3 divide-y divide-dash-border/70">
                  {facts.map((fact) => (
                    <div
                      key={fact.key}
                      className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                    >
                      <dt className="text-xs font-medium text-muted-foreground">
                        {fact.label}
                      </dt>
                      <dd
                        className="text-sm font-medium text-brand-navy"
                        data-testid={`opd-encounter-fact-${fact.key}`}
                      >
                        {fact.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">
                Visit details will appear here once the encounter loads.
              </p>
            )}
          </div>

          {customer ? (
            <div className="border-t border-dash-border/70 px-6 py-4">
              <SecondaryButton
                type="button"
                onClick={openSchedule}
                className="inline-flex w-full items-center justify-center gap-1.5"
                data-testid="opd-encounter-schedule-button"
              >
                <CalendarPlus className="size-3.5" aria-hidden="true" />
                <span>Schedule</span>
              </SecondaryButton>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {customer ? (
        <CreateAppointmentDialog
          customer={customer}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          onCreated={async () => {
            setScheduleOpen(false);
            await queryClient.invalidateQueries({
              queryKey: customerAppointmentsQueryKey(customer.uuid),
            });
          }}
        />
      ) : null}
    </>
  );
}
