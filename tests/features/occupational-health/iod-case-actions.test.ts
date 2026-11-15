import { describe, expect, it } from "vitest";

import { IOD_ACTIONS, IOD_RECORD_ACTIONS, stillToRecord } from "@/features/occupational-health/iod-case/iod-case.actions";
import type { IodCaseDetail } from "@/features/occupational-health/iod-case/iod-case.types";

const complete = {
  status: "open",
  immediate_action: "Isolated",
  treatment_given: "",
  root_cause: "No guard",
  return_to_work_on: "2026-11-16",
  reported_by: "Supervisor",
  she_reference: "SHE-1",
} as IodCaseDetail;

describe("stillToRecord", () => {
  it("lists nothing for a case with everything recorded", () => {
    expect(stillToRecord(complete)).toEqual([]);
  });

  it("lists each missing piece once, in the order a case is completed", () => {
    const bare = { ...complete, immediate_action: " ", root_cause: "", return_to_work_on: null, reported_by: "", she_reference: "" } as IodCaseDetail;

    expect(stillToRecord(bare).map((entry) => entry.action)).toEqual(["response", "cause", "outcome", "reporting"]);
  });

  it("counts a case as having its response when either the action or the treatment is recorded", () => {
    expect(stillToRecord({ ...complete, immediate_action: "", treatment_given: "Dressing" })).toEqual([]);
  });

  it("asks for reporting details when either the reporter or the SHE reference is missing", () => {
    expect(stillToRecord({ ...complete, she_reference: "" }).map((entry) => entry.key)).toEqual(["reporting"]);
    expect(stillToRecord({ ...complete, reported_by: "" }).map((entry) => entry.key)).toEqual(["reporting"]);
  });

  it("sends notices that need details to the notifications tab", () => {
    const todo = stillToRecord(complete, 2);

    expect(todo).toEqual([expect.objectContaining({ key: "notices", label: "2 notices need details", tab: "notifications" })]);
    expect(todo[0].action).toBeUndefined();
  });

  it("never asks for anything on a closed case", () => {
    expect(stillToRecord({ ...complete, status: "closed", root_cause: "" } as IodCaseDetail, 3)).toEqual([]);
  });
});

describe("case actions", () => {
  it("keeps Edit case to what happened and gives every other field to exactly one action", () => {
    const edit = IOD_ACTIONS.edit.fields.map((field) => field.name);
    expect(edit).toEqual(["onset_date", "incident_time", "severity", "incident_location", "body_part", "mechanism", "description", "work_related"]);

    const others = IOD_RECORD_ACTIONS.flatMap((id) => IOD_ACTIONS[id].fields.map((field) => field.name));
    expect(new Set(others).size).toBe(others.length);
    expect(others.filter((name) => edit.includes(name))).toEqual([]);
  });
});
