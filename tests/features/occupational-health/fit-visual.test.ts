import { describe, expect, it } from "vitest";

import { daysUntil, relativeDays, worstStatus } from "@/app/(app)/fitness/_components/shared/fit-visual";
import type { FitItem } from "@/features/occupational-health/services/fitness.service";

const NOW = new Date(2026, 10, 10, 21, 0);

function item(status: FitItem["status"]): FitItem {
  return { source: "training", label: "Course", status, message: "", expires_on: null, restriction: null };
}

describe("fit visual helpers", () => {
  it("counts whole calendar days from today", () => {
    expect(daysUntil("2026-11-10", NOW)).toBe(0);
    expect(daysUntil("2026-11-11", NOW)).toBe(1);
    expect(daysUntil("2026-11-01", NOW)).toBe(-9);
  });

  it.each([
    [0, "today"],
    [1, "tomorrow"],
    [-9, "9 days ago"],
    [45, "in 45 days"],
    [180, "in 6 months"],
    [800, "in 2 years"],
  ])("describes %i days as %s", (days, text) => {
    expect(relativeDays(days)).toBe(text);
  });

  it("picks the worst status and returns null when nothing is on file", () => {
    expect(worstStatus([item("ok"), item("expiring"), item("blocked")])).toBe("blocked");
    expect(worstStatus([])).toBeNull();
  });
});
