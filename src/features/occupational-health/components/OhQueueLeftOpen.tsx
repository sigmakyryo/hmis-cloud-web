"use client";

import Link from "next/link";
import { History } from "lucide-react";

import type { QueueBoardRow } from "@/features/occupational-health/lib/oh-queue-board";
import { ohQueueEntryHref } from "@/features/occupational-health/lib/oh-queue-route";

const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

/**
 * Visits still waiting or in progress from an earlier day. They are kept apart so they do not
 * pass for today's longest wait, with a plain note on what to do about them.
 */
export function OhQueueLeftOpen({ rows }: { rows: QueueBoardRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section data-testid="oh-queue-left-open" className="flex flex-col gap-3 border-l-[3px] border-amber-500 bg-amber-50/50 py-3 pr-4 pl-4 @2xl:flex-row @2xl:items-center @2xl:gap-6">
      <p className="flex shrink-0 items-start gap-2.5 text-[13px] text-amber-900 @2xl:max-w-xs">
        <History className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <span className="font-semibold">
            {rows.length} {rows.length === 1 ? "visit" : "visits"} left open
          </span>{" "}
          from an earlier day. Open each to finish or cancel it.
        </span>
      </p>
      <ul className="flex min-w-0 flex-wrap gap-x-5 gap-y-1.5">
        {rows.map(({ encounter }) => (
          <li key={encounter.uuid}>
            <Link href={ohQueueEntryHref(encounter)} data-testid="oh-queue-left-open-row" className="text-[13px] text-brand-navy hover:text-brand-primary hover:underline">
              <span className="font-medium">{encounter.customer_name?.trim() || "Unknown client"}</span>
              <span className="ml-1.5 text-amber-800 tabular-nums">since {DAY.format(new Date(encounter.started_at || encounter.created_at))}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
