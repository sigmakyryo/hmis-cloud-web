import { describe, expect, it } from "vitest";

import { dayOfCase, groupCases, matchesCase, missingRecords } from "@/features/occupational-health/lib/iod-case-list";
import type { IodCase } from "@/features/occupational-health/types";

const row = (over: Partial<IodCase>): IodCase =>
  ({ uuid: "u", severity: "minor", status: "open", onset_date: "2026-11-10", lost_days: 0, ...over }) as IodCase;

describe("matchesCase", () => {
  const case1 = row({ worker_name: "Chikondi Phiri", employer_name: "Illovo Sugar", body_part: "Left hand", mechanism: "Crush" });

  it("matches every word typed, in any order and case", () => {
    expect(matchesCase(case1, "phiri HAND", "all", "all")).toBe(true);
    expect(matchesCase(case1, "illovo burn", "all", "all")).toBe(false);
  });

  it("filters by status and severity", () => {
    expect(matchesCase({ ...case1, status: "under_review" }, "", "under_review", "all")).toBe(true);
    expect(matchesCase(case1, "", "closed", "all")).toBe(false);
    expect(matchesCase({ ...case1, severity: "major" }, "", "all", "minor")).toBe(false);
  });

  it("treats a case with no status as open", () => {
    expect(matchesCase({ ...case1, status: "" }, "", "open", "all")).toBe(true);
  });
});

describe("groupCases", () => {
  it("puts open cases first, worst then newest, and closed cases newest first", () => {
    const { open, closed } = groupCases([
      row({ uuid: "minor-new", severity: "minor", onset_date: "2026-11-14" }),
      row({ uuid: "major-old", severity: "major", onset_date: "2026-10-01" }),
      row({ uuid: "minor-old", severity: "minor", onset_date: "2026-11-01" }),
      row({ uuid: "done-old", status: "closed", onset_date: "2026-08-01" }),
      row({ uuid: "done-new", status: "closed", onset_date: "2026-09-01" }),
    ]);

    expect(open.map((item) => item.uuid)).toEqual(["major-old", "minor-new", "minor-old"]);
    expect(closed.map((item) => item.uuid)).toEqual(["done-new", "done-old"]);
  });
});

describe("missingRecords", () => {
  it("names what an open case has not recorded", () => {
    expect(missingRecords(row({ immediate_action: "", treatment_given: " ", root_cause: "" }))).toEqual(["No treatment recorded", "No root cause"]);
    expect(missingRecords(row({ immediate_action: "Isolated", root_cause: "No guard" }))).toEqual([]);
  });

  it("does not report fields an older service did not send, or anything on a closed case", () => {
    expect(missingRecords(row({}))).toEqual([]);
    expect(missingRecords(row({ status: "closed", root_cause: "" }))).toEqual([]);
  });
});

describe("dayOfCase", () => {
  it("counts the day of the incident as day 1", () => {
    const now = new Date(2026, 10, 15, 12, 0).getTime();
    expect(dayOfCase("2026-11-15", now)).toBe(1);
    expect(dayOfCase("2026-11-10", now)).toBe(6);
    expect(dayOfCase(null, now)).toBeNull();
  });
});
