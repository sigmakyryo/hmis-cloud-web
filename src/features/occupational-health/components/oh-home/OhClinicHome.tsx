"use client";

import Link from "next/link";

import { UserIdenticon } from "@/components/UserIdenticon";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import { OpdEncounterStatusBadge } from "@/features/clinical-opd/components/OpdEncounterStatusBadge";
import { formatWaitingMinutes } from "@/features/clinical-opd/utils/opd-queue-stage";
import { OhHomePageRow } from "@/features/occupational-health/components/oh-home/OhHomePageRow";
import {
  useOhComplianceDashboard,
  useOhEncounters,
} from "@/features/occupational-health/hooks/use-occupational-health";
import type { OhModule } from "@/features/occupational-health/lib/oh-modules";
import type { OhVisitEncounter } from "@/features/occupational-health/types";

const QUEUE_PREVIEW = 8;

function clientLabel(encounter: OhVisitEncounter): string {
  return encounter.customer_name?.trim() || encounter.customer_identifier?.trim() || "Unknown client";
}

function waitingMinutes(encounter: OhVisitEncounter): number | null {
  const started = encounter.started_at || encounter.created_at;
  if (!started) {
    return null;
  }
  const elapsed = Date.now() - new Date(started).getTime();
  if (Number.isNaN(elapsed) || elapsed < 0) {
    return null;
  }
  return Math.floor(elapsed / 60_000);
}

function QueueRow({ encounter }: { encounter: OhVisitEncounter }) {
  const name = clientLabel(encounter);
  const href = ROUTES.occupationalHealthEncounter(encounter.visit, encounter.uuid);
  const context = [encounter.employer_name, encounter.department_name]
    .flatMap((value) => (value?.trim() ? [value.trim()] : []))
    .join(" · ");

  return (
    <li className="border-b border-dash-border/70">
      <Link href={href} data-testid="oh-home-queue-row" className="flex items-center gap-3 py-2.5">
        <UserIdenticon seed={encounter.customer_uuid || name} name={name} className="size-7 shrink-0 rounded-md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-brand-navy">{name}</span>
          {context ? <span className="block truncate text-[12.5px] text-dash-muted">{context}</span> : null}
        </span>
        <span className="shrink-0 text-[12.5px] text-dash-muted tabular-nums">{formatWaitingMinutes(waitingMinutes(encounter))}</span>
        <OpdEncounterStatusBadge status={encounter.status} />
      </Link>
    </li>
  );
}

/** Clinic module: the live queue, with the other clinic pages beside it. */
export function OhClinicHome({ ohModule }: { ohModule: OhModule }) {
  const queue = useOhEncounters();
  const compliance = useOhComplianceDashboard();
  const encounters = queue.data ?? [];
  const shown = encounters.slice(0, QUEUE_PREVIEW);
  const remaining = encounters.length - shown.length;
  const counts = compliance.data;
  const pages = ohModule.pages.filter((page) => page.href !== ROUTES.occupationalHealth);

  return (
    <section
      aria-label={ohModule.label}
      data-testid="oh-home-module-detail"
      className="grid items-start gap-x-12 gap-y-8 @4xl:grid-cols-[minmax(0,1fr)_18rem]"
    >
      <h2 className="sr-only">{ohModule.label}</h2>
      <div data-testid="oh-home-queue" className="min-w-0">
        <div className="flex items-baseline justify-between border-b border-dash-border pb-2">
          <h3 className="text-[15px] font-semibold text-brand-navy">
            Queue
            {queue.isSuccess ? (
              <span className="ml-2 font-normal text-dash-muted tabular-nums">{encounters.length}</span>
            ) : null}
          </h3>
          <Link href={ROUTES.occupationalHealth} className="text-[13px] font-medium text-brand-primary hover:underline">
            Open queue
          </Link>
        </div>
        {queue.isLoading ? (
          <div className="space-y-3 py-3" aria-busy="true">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : queue.isError ? (
          <p className="py-4 text-[13.5px] text-dash-muted">
            Could not load the queue.{" "}
            <button type="button" className="font-medium text-brand-primary hover:underline" onClick={() => void queue.refetch()}>
              Try again
            </button>
          </p>
        ) : encounters.length === 0 ? (
          <p className="py-4 text-[13.5px] text-dash-muted">No visits in the queue.</p>
        ) : (
          <>
            <ul>
              {shown.map((encounter) => (
                <QueueRow key={encounter.uuid} encounter={encounter} />
              ))}
            </ul>
            {remaining > 0 ? (
              <p className="pt-2 text-[13px] text-dash-muted">
                {remaining} more in the{" "}
                <Link href={ROUTES.occupationalHealth} className="font-medium text-brand-primary hover:underline">
                  queue
                </Link>
                .
              </p>
            ) : null}
          </>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold text-brand-navy">Clinic</h3>
        <ul className="mt-1">
          {pages.map((page) => (
            <OhHomePageRow
              key={page.href}
              page={page}
              ohModule={ohModule}
              hideDescription
              detail={
                page.href === ROUTES.occupationalHealthCompliance && counts
                  ? counts.overdue === 0 && counts.due === 0
                    ? "Nothing overdue"
                    : `${counts.overdue} overdue, ${counts.due} due`
                  : undefined
              }
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
