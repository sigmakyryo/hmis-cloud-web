import { describe, expect, it } from "vitest";

import type { IodCaseEntry } from "@/features/occupational-health/iod-case/iod-case.types";
import {
  actionState,
  caseDuration,
  caseReference,
  countActions,
  describeDaysAgo,
  incidentTitle,
  initials,
  isLostTime,
  missingFieldLabel,
  sortActions,
  summariseNotices,
} from "@/features/occupational-health/iod-case/iod-case.utils";

const TODAY = new Date(2026, 10, 14);

function action(overrides: Partial<IodCaseEntry>): IodCaseEntry {
  return {
    uuid: "a",
    kind: "action",
    event_code: "",
    body: "Fit a guard",
    owner_name: "",
    due_date: null,
    completed_on: null,
    author_name: "",
    created_at: null,
    ...overrides,
  };
}

describe("iod case helpers", () => {
  it("builds a reference and a title with sensible fallbacks", () => {
    expect(caseReference({ uuid: "7125b443-fb1b", she_reference: " " })).toBe("IOD-7125B443");
    expect(caseReference({ uuid: "7125b443-fb1b", she_reference: "SHE-12" })).toBe("SHE-12");
    expect(incidentTitle({ mechanism: "Crush", body_part: "Hand" })).toBe("Crush · Hand");
    expect(incidentTitle({ mechanism: "", body_part: "" })).toBe("Injury on duty");
  });

  it("flags lost-time injuries at three days", () => {
    expect(isLostTime({ lost_days: 2 })).toBe(false);
    expect(isLostTime({ lost_days: 3 })).toBe(true);
  });

  it("measures how long a case was open, stopping at closure", () => {
    expect(caseDuration({ onset_date: "2026-11-10", closed_on: null }, TODAY)).toBe(4);
    expect(caseDuration({ onset_date: "2026-11-10", closed_on: "2026-11-12" }, TODAY)).toBe(2);
    expect(caseDuration({ onset_date: null, closed_on: null }, TODAY)).toBeNull();
    expect(describeDaysAgo(0)).toBe("today");
    expect(describeDaysAgo(1)).toBe("yesterday");
    expect(describeDaysAgo(4)).toBe("4 days ago");
  });

  it("classifies follow-up actions by due date", () => {
    expect(actionState(action({ completed_on: "2026-11-01", due_date: "2026-10-01" }), TODAY)).toBe("done");
    expect(actionState(action({ due_date: "2026-11-13" }), TODAY)).toBe("overdue");
    expect(actionState(action({ due_date: "2026-11-14" }), TODAY)).toBe("due_soon");
    expect(actionState(action({ due_date: "2026-11-21" }), TODAY)).toBe("due_soon");
    expect(actionState(action({ due_date: "2026-12-30" }), TODAY)).toBe("open");
    expect(actionState(action({}), TODAY)).toBe("open");
  });

  it("sorts open actions first by due date and counts them", () => {
    const entries = [
      action({ uuid: "done", completed_on: "2026-11-01" }),
      action({ uuid: "later", due_date: "2026-12-01" }),
      action({ uuid: "undated" }),
      action({ uuid: "soon", due_date: "2026-11-10" }),
    ];
    expect(sortActions(entries).map((entry) => entry.uuid)).toEqual(["soon", "later", "undated", "done"]);
    expect(countActions([...entries, action({ kind: "note", uuid: "n" })], TODAY)).toEqual({
      open: 3,
      overdue: 1,
      done: 1,
    });
  });

  it("summarises statutory notices", () => {
    const notice = { code: "x", label: "X", missing_fields: [] };
    expect(
      summariseNotices([
        { ...notice, likely_required: true, ready: false },
        { ...notice, likely_required: false, ready: false },
        { ...notice, likely_required: true, ready: true },
      ]),
    ).toEqual({ ready: 1, total: 3, needAttention: 1 });
  });

  it("names missing fields and initials readably", () => {
    expect(missingFieldLabel("employer.registration_number")).toBe("Employer registration number");
    expect(missingFieldLabel("incident.unknown_thing")).toBe("unknown thing");
    expect(initials("Chikondi Phiri")).toBe("CP");
    expect(initials("")).toBe("?");
  });
});

describe("normalizeIodCase", () => {
  it("fills the newer fields when an older OH service omits them", async () => {
    const { normalizeIodCase } = await import("@/features/occupational-health/iod-case/iod-case.service");
    const item = normalizeIodCase({ uuid: "u", status: "open", severity: "minor", lost_days: 0, onset_date: "2026-11-10", description: "Cut" });
    expect(item.reported_by).toBe("");
    expect(item.witnesses).toBe("");
    expect(item.incident_time).toBeNull();
    expect(item.work_related).toBe(true);
    expect(item.closed_on).toBeNull();
    expect(item.she_reference.trim()).toBe("");
  });

  it("reads the visit link and AI fields, and defaults them when absent", async () => {
    const { normalizeIodCase } = await import("@/features/occupational-health/iod-case/iod-case.service");
    const older = normalizeIodCase({ uuid: "u" });
    expect(older.source_visit_uuid).toBeNull();
    expect(older.source_encounter_uuid).toBeNull();
    expect(older.ai_status).toBe("");
    expect(older.ai_drafted_fields).toEqual([]);
    expect(older.ai_documented_at).toBeNull();

    const linked = normalizeIodCase({
      uuid: "u",
      source_visit_uuid: "v",
      source_encounter_uuid: "e",
      ai_status: "documented",
      ai_drafted_fields: ["description", 7, "body_part"],
      ai_documented_at: "2026-11-14T10:00:00Z",
    });
    expect(linked.source_encounter_uuid).toBe("e");
    expect(linked.ai_status).toBe("documented");
    expect(linked.ai_drafted_fields).toEqual(["description", "body_part"]);
  });
});

