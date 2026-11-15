"use client";

import { OhQueueBoard } from "@/features/occupational-health/components/OhQueueBoard";
import { OhQueueLeftOpen } from "@/features/occupational-health/components/OhQueueLeftOpen";
import { OhStartVisitEntry } from "@/features/occupational-health/components/OhStartVisitEntry";
import { QueryState } from "@/features/occupational-health/components/oh-home/views/OhViewParts";
import { useOhEncounters } from "@/features/occupational-health/hooks/use-occupational-health";
import { buildQueueBoard } from "@/features/occupational-health/lib/oh-queue-board";

/** The whole clinic queue: waiting, being seen, finished today, and anything left open. */
export function OhHomeQueueView() {
  const queue = useOhEncounters();
  const board = buildQueueBoard(queue.data ?? []);

  return (
    <section aria-label="Queue" data-testid="oh-home-queue-view" className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-brand-navy">Queue</h2>
        <OhStartVisitEntry />
      </div>
      <QueryState isLoading={queue.isLoading} isError={queue.isError} onRetry={() => void queue.refetch()}>
        <div className="space-y-6">
          <OhQueueLeftOpen rows={board.stale} />
          <OhQueueBoard board={board} />
        </div>
      </QueryState>
    </section>
  );
}
