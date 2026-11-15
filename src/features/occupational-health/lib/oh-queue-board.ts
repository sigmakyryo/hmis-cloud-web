import type { OhVisitEncounter } from "@/features/occupational-health/types";

export type QueueBoardRow = { encounter: OhVisitEncounter; minutes: number | null };

export type QueueBoard = {
  /** Waiting or in progress since before today: almost always visits nobody closed. */
  stale: QueueBoardRow[];
  waiting: QueueBoardRow[];
  withClinician: QueueBoardRow[];
  /** Completed, cancelled or did not attend, today. */
  done: QueueBoardRow[];
  /** Longest current wait today, ignoring stale visits. */
  longestWait: number | null;
};

const DONE = new Set(["completed", "cancelled", "no_show"]);

function startOfDay(now: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function time(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

const byWaitDesc = (a: QueueBoardRow, b: QueueBoardRow) => (b.minutes ?? 0) - (a.minutes ?? 0);

/** Splits the queue into what the clinic is doing today, with yesterday's leftovers set apart. */
export function buildQueueBoard(rows: OhVisitEncounter[], now = Date.now()): QueueBoard {
  const today = startOfDay(now);
  const board: QueueBoard = { stale: [], waiting: [], withClinician: [], done: [], longestWait: null };

  for (const encounter of rows) {
    const started = time(encounter.started_at) ?? time(encounter.created_at);
    const minutes = started === null ? null : Math.max(0, Math.floor((now - started) / 60_000));
    const row = { encounter, minutes };
    if (DONE.has(encounter.status)) {
      const finished = time(encounter.ended_at) ?? started;
      if (finished !== null && finished >= today) board.done.push(row);
    } else if (started !== null && started < today) {
      board.stale.push(row);
    } else if (encounter.status === "in_progress") {
      board.withClinician.push(row);
    } else if (encounter.status === "waiting") {
      board.waiting.push(row);
    }
  }

  board.stale.sort(byWaitDesc);
  board.waiting.sort(byWaitDesc);
  board.withClinician.sort(byWaitDesc);
  board.done.sort((a, b) => (time(b.encounter.ended_at) ?? 0) - (time(a.encounter.ended_at) ?? 0));
  board.longestWait = board.waiting[0]?.minutes ?? null;
  return board;
}
