"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { UserIdenticon } from "@/components/UserIdenticon";
import { formatWaitingMinutes } from "@/features/clinical-opd/utils/opd-queue-stage";
import { isIodVisit, ohQueueEntryHref } from "@/features/occupational-health/lib/oh-queue-route";
import type { OhVisitEncounter } from "@/features/occupational-health/types";
import { cn } from "@/lib/utils";

const ACTIVE_STATUSES = new Set(["waiting", "in_progress"]);

const STATUS: Record<string, { label: string; dot: string }> = {
  waiting: { label: "Waiting", dot: "bg-amber-500" },
  in_progress: { label: "In progress", dot: "bg-brand-primary" },
  completed: { label: "Completed", dot: "bg-brand-slate/50" },
  cancelled: { label: "Cancelled", dot: "bg-red-600" },
  no_show: { label: "Did not attend", dot: "bg-dash-border" },
};

/** Waiting time colour: calm under an hour, amber up to two, red beyond. */
export function waitTone(minutes: number | null): { text: string; dot: string } {
  if (minutes === null || minutes < 60) {
    return { text: "text-brand-navy", dot: "bg-brand-primary" };
  }
  if (minutes < 120) {
    return { text: "text-amber-700", dot: "bg-amber-500" };
  }
  return { text: "text-red-700", dot: "bg-red-600" };
}

export function queueWaitingMinutes(encounter: OhVisitEncounter): number | null {
  const started = encounter.started_at || encounter.created_at;
  if (!started) {
    return null;
  }
  const ms = Date.now() - new Date(started).getTime();
  return Number.isNaN(ms) || ms < 0 ? null : Math.floor(ms / 60_000);
}

function riskTone(profile: string): string {
  const value = profile.toLowerCase();
  if (value.includes("high")) return "bg-red-600";
  if (value.includes("medium") || value.includes("moderate")) return "bg-amber-500";
  return "bg-brand-primary";
}

function QueueRow({ encounter, onOpen }: { encounter: OhVisitEncounter; onOpen: (href: string) => void }) {
  const href = ohQueueEntryHref(encounter);
  const name = encounter.customer_name?.trim() || encounter.customer_identifier?.trim() || "Unknown client";
  const context = [encounter.employer_name, encounter.department_name, encounter.location_name]
    .flatMap((value) => (value?.trim() ? [value.trim()] : []))
    .join(" · ");
  const minutes = queueWaitingMinutes(encounter);
  const isActive = ACTIVE_STATUSES.has(encounter.status);
  const tone = waitTone(minutes);
  const status = STATUS[encounter.status] ?? { label: encounter.status.replaceAll("_", " "), dot: "bg-dash-border" };
  const risk = encounter.hazard_profile_name?.trim();

  return (
    <tr className="group cursor-pointer border-b border-dash-border/70 transition-colors hover:bg-dash-canvas/60" onClick={() => onOpen(href)}>
      <td className="py-3.5 pr-4 pl-5 md:pl-8">
        <div className="flex min-w-0 items-center gap-3">
          <UserIdenticon seed={encounter.customer_uuid || name} name={name} className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                href={href}
                onClick={(event) => event.stopPropagation()}
                className="truncate text-[14px] font-semibold text-brand-navy group-hover:text-brand-primary focus-visible:underline focus-visible:outline-none"
              >
                {name}
              </Link>
              {isIodVisit(encounter) ? (
                <span data-testid="oh-queue-iod-badge" className="shrink-0 rounded-md bg-amber-100 px-1.5 py-px text-[11px] font-semibold text-amber-900">
                  Injury on duty
                </span>
              ) : null}
            </div>
            {context ? <p className="mt-0.5 truncate text-[12.5px] text-dash-muted">{context}</p> : null}
          </div>
        </div>
      </td>
      <td className="hidden px-4 py-3.5 lg:table-cell">
        {risk ? (
          <span className="inline-flex items-center gap-2 text-[13px] text-brand-slate">
            <span aria-hidden className={cn("size-1.5 rounded-full", riskTone(risk))} />
            {risk}
          </span>
        ) : (
          <span className="text-[13px] text-dash-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <span className={cn("text-[14px] font-semibold tabular-nums", isActive ? tone.text : "font-medium text-dash-muted")}>
          {formatWaitingMinutes(minutes)}
        </span>
      </td>
      <td className="hidden px-4 py-3.5 text-[13px] xl:table-cell">
        {encounter.clinician_name ? (
          <span className="text-brand-slate">{encounter.clinician_name}</span>
        ) : (
          <span className="text-dash-muted">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <span className="inline-flex items-center gap-2 text-[13px] font-medium whitespace-nowrap text-brand-navy" data-testid="oh-queue-status">
          <span aria-hidden className={cn("size-2 rounded-full", status.dot)} />
          {status.label}
        </span>
      </td>
      <td className="py-3.5 pr-5 pl-4 text-right md:pr-8">
        <Link
          href={href}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-primary opacity-70 transition-opacity group-hover:opacity-100 hover:underline focus-visible:opacity-100 focus-visible:underline focus-visible:outline-none"
        >
          Open
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}

const HEAD = "px-4 pb-2.5 pt-4 text-left text-[11.5px] font-semibold tracking-[0.06em] text-dash-muted uppercase";

/** The queue as a list: who, how long they have waited, and where their visit is. */
export function OhQueueTable({ encounters, className }: { encounters: OhVisitEncounter[]; className?: string }) {
  const router = useRouter();

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[34rem] border-collapse" data-testid="oh-queue-table">
        <thead>
          <tr className="border-b border-dash-border">
            <th scope="col" className={cn(HEAD, "pl-5 md:pl-8")}>Client</th>
            <th scope="col" className={cn(HEAD, "hidden lg:table-cell")}>Risk profile</th>
            <th scope="col" className={HEAD}>Waiting</th>
            <th scope="col" className={cn(HEAD, "hidden xl:table-cell")}>Clinician</th>
            <th scope="col" className={HEAD}>Status</th>
            <th scope="col" className={cn(HEAD, "pr-5 md:pr-8")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {encounters.map((encounter) => (
            <QueueRow key={encounter.uuid} encounter={encounter} onOpen={(href) => router.push(href)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
