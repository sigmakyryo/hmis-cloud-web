import { describe, expect, it } from "vitest";

import { buildQueueBoard } from "@/features/occupational-health/lib/oh-queue-board";
import type { OhVisitEncounter } from "@/features/occupational-health/types";

const NOW = new Date(2026, 10, 15, 12, 0).getTime();
const at = (hoursAgo: number) => new Date(NOW - hoursAgo * 3_600_000).toISOString();

function visit(uuid: string, status: string, startedHoursAgo: number, endedHoursAgo?: number): OhVisitEncounter {
  return {
    uuid,
    visit: `v-${uuid}`,
    status,
    started_at: at(startedHoursAgo),
    created_at: at(startedHoursAgo),
    ended_at: endedHoursAgo === undefined ? null : at(endedHoursAgo),
  } as OhVisitEncounter;
}

describe("buildQueueBoard", () => {
  it("puts today's visits in lanes, longest wait first", () => {
    const board = buildQueueBoard([visit("a", "waiting", 0.5), visit("b", "waiting", 2), visit("c", "in_progress", 1)], NOW);

    expect(board.waiting.map((row) => row.encounter.uuid)).toEqual(["b", "a"]);
    expect(board.waiting[0].minutes).toBe(120);
    expect(board.withClinician.map((row) => row.encounter.uuid)).toEqual(["c"]);
    expect(board.longestWait).toBe(120);
  });

  it("sets visits from an earlier day apart so they do not count as today's wait", () => {
    const board = buildQueueBoard([visit("old", "waiting", 26), visit("old-seen", "in_progress", 30), visit("now", "waiting", 0.25)], NOW);

    expect(board.stale.map((row) => row.encounter.uuid)).toEqual(["old-seen", "old"]);
    expect(board.waiting.map((row) => row.encounter.uuid)).toEqual(["now"]);
    expect(board.longestWait).toBe(15);
  });

  it("keeps only visits finished today in the done lane, latest first", () => {
    const board = buildQueueBoard(
      [visit("done-early", "completed", 5, 4), visit("done-late", "completed", 3, 1), visit("cancelled", "cancelled", 2, 2), visit("yesterday", "completed", 30, 28)],
      NOW,
    );

    expect(board.done.map((row) => row.encounter.uuid)).toEqual(["done-late", "cancelled", "done-early"]);
  });

  it("reports no longest wait when nobody is waiting", () => {
    expect(buildQueueBoard([], NOW).longestWait).toBeNull();
  });
});
