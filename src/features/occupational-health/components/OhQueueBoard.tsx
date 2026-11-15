"use client";

import Link from "next/link";
import { Check, Clock3, Stethoscope, X } from "lucide-react";
import type { ReactNode } from "react";

import { UserIdenticon } from "@/components/UserIdenticon";
import { formatWaitingMinutes } from "@/features/clinical-opd/utils/opd-queue-stage";
import { waitTone } from "@/features/occupational-health/components/OhQueueTable";
import type { QueueBoard, QueueBoardRow } from "@/features/occupational-health/lib/oh-queue-board";
import { isIodVisit, ohQueueEntryHref } from "@/features/occupational-health/lib/oh-queue-route";
import type { OhVisitEncounter } from "@/features/occupational-health/types";
import { cn } from "@/lib/utils";

/** A wait fills the bar at two hours; past that the bar stays full and red. */
const FULL_WAIT_MINUTES = 120;
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });

const nameOf = (encounter: OhVisitEncounter) => encounter.customer_name?.trim() || encounter.customer_identifier?.trim() || "Unknown client";
const contextOf = (encounter: OhVisitEncounter) =>
  [encounter.employer_name, encounter.department_name].flatMap((value) => (value?.trim() ? [value.trim()] : [])).join(" · ");

function Person({ row, aside, children, muted = false }: { row: QueueBoardRow; aside: ReactNode; children?: ReactNode; muted?: boolean }) {
  const { encounter } = row;
  const name = nameOf(encounter);
  const context = contextOf(encounter);
  return (
    <li className="border-b border-dash-border/70 last:border-b-0">
      <Link href={ohQueueEntryHref(encounter)} data-testid="oh-queue-board-row" className="group block py-3 focus-visible:outline-none">
        <span className="flex items-center gap-3">
          <UserIdenticon seed={encounter.customer_uuid || name} name={name} className={cn("size-8 shrink-0 rounded-lg", muted && "opacity-50")} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className={cn("truncate text-[14px] font-medium group-hover:text-brand-primary group-focus-visible:underline", muted ? "text-dash-muted" : "text-brand-navy")}>{name}</span>
              {isIodVisit(encounter) ? <span className="shrink-0 rounded bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-900">IOD</span> : null}
            </span>
            {context ? <span className="block truncate text-[12.5px] text-dash-muted">{context}</span> : null}
          </span>
          <span className="shrink-0 text-right">{aside}</span>
        </span>
        {children}
      </Link>
    </li>
  );
}

function WaitFuse({ minutes }: { minutes: number | null }) {
  const share = Math.min(1, (minutes ?? 0) / FULL_WAIT_MINUTES);
  return (
    <span aria-hidden className="mt-2.5 ml-11 block h-1 overflow-hidden rounded-full bg-dash-canvas">
      <span className={cn("block h-full rounded-full", waitTone(minutes).dot)} style={{ width: `${Math.max(2, share * 100)}%` }} />
    </span>
  );
}

function Lane({ title, icon, count, empty, children, testId }: { title: string; icon: ReactNode; count: number; empty: string; children: ReactNode; testId: string }) {
  return (
    <section data-testid={testId} className="min-w-0 @4xl:px-6 @4xl:first:pl-0 @4xl:last:pr-0">
      <h2 className="flex items-center gap-2 border-b border-dash-border pb-2.5 text-[14px] font-semibold text-brand-navy">
        {icon}
        {title}
        <span className="font-normal text-dash-muted tabular-nums">{count}</span>
      </h2>
      {count === 0 ? <p className="py-6 text-[13px] text-dash-muted">{empty}</p> : <ul>{children}</ul>}
    </section>
  );
}

const DONE_LABEL: Record<string, { label: string; icon: ReactNode }> = {
  completed: { label: "Done", icon: <Check className="size-3.5 text-brand-primary" aria-hidden /> },
  cancelled: { label: "Cancelled", icon: <X className="size-3.5 text-red-600" aria-hidden /> },
  no_show: { label: "Did not attend", icon: <X className="size-3.5 text-dash-muted" aria-hidden /> },
};

/** Today's clinic as three lanes: who is waiting, who is being seen, and who is done. */
export function OhQueueBoard({ board }: { board: QueueBoard }) {
  return (
    <div data-testid="oh-queue-board" className="@container">
      <div className="grid gap-y-10 @4xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.85fr)] @4xl:divide-x @4xl:divide-dash-border">
        <Lane testId="oh-queue-lane-waiting" title="Waiting" icon={<Clock3 className="size-4 text-amber-600" aria-hidden />} count={board.waiting.length} empty="Nobody is waiting.">
          {board.waiting.map((row) => (
            <Person
              key={row.encounter.uuid}
              row={row}
              aside={<span className={cn("text-[13.5px] font-semibold tabular-nums", waitTone(row.minutes).text)}>{formatWaitingMinutes(row.minutes)}</span>}
            >
              <WaitFuse minutes={row.minutes} />
            </Person>
          ))}
        </Lane>
        <Lane testId="oh-queue-lane-seen" title="With a clinician" icon={<Stethoscope className="size-4 text-brand-primary" aria-hidden />} count={board.withClinician.length} empty="Nobody is being seen right now.">
          {board.withClinician.map((row) => (
            <Person
              key={row.encounter.uuid}
              row={row}
              aside={
                <>
                  <span className="block text-[12.5px] font-medium text-brand-primary">{row.encounter.clinician_name?.trim() || "Unassigned"}</span>
                  <span className="block text-[12px] text-dash-muted tabular-nums">{formatWaitingMinutes(row.minutes)}</span>
                </>
              }
            />
          ))}
        </Lane>
        <Lane testId="oh-queue-lane-done" title="Done today" icon={<Check className="size-4 text-dash-muted" aria-hidden />} count={board.done.length} empty="Nothing finished yet today.">
          {board.done.map((row) => {
            const meta = DONE_LABEL[row.encounter.status] ?? DONE_LABEL.completed;
            const at = row.encounter.ended_at ? TIME.format(new Date(row.encounter.ended_at)) : null;
            return (
              <Person
                key={row.encounter.uuid}
                row={row}
                muted
                aside={
                  <span className="inline-flex items-center gap-1 text-[12px] text-dash-muted">
                    {meta.icon}
                    {meta.label}
                    {at ? <span className="tabular-nums"> {at}</span> : null}
                  </span>
                }
              />
            );
          })}
        </Lane>
      </div>
    </div>
  );
}
