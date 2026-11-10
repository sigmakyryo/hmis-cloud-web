import { describe, expect, it } from "vitest";

import { applyCofDraft, findCofDraftTargets } from "@/features/occupational-health/lib/cof-draft-targets";
import type { ExamTemplateSnapshot } from "@/features/occupational-health/lib/exam-template-snapshot";
import type { OhResponseField } from "@/features/occupational-health/types";

function field(code: string, label: string, response_type = "textarea", options: OhResponseField["options"] = []): OhResponseField {
  return { code, label, response_type, options, validation: {}, prompt_after_select: true };
}

const snapshot: ExamTemplateSnapshot = {
  sections: [
    {
      code: "outcome",
      name: "Outcome",
      content_mode: "items",
      items: [
        { code: "fit_limits", name: "Fit with limits", response_fields: [field("limits", "Restrictions")] },
        { code: "fit", name: "Fit", response_fields: [field("fit_note", "Note")] },
      ],
    },
    {
      code: "remarks",
      name: "Remarks",
      content_mode: "direct",
      items: [],
      response_fields: [field("choice", "Comment type", "single_select", [{ code: "a", label: "A" }]), field("comment", "Clinician comment")],
    },
  ],
};

describe("findCofDraftTargets", () => {
  it("matches restrictions only on picked items and wording on direct free-text fields", () => {
    const unpicked = findCofDraftTargets(snapshot, { picks: {}, fields: {} });
    expect(unpicked.restrictions).toBeNull();
    expect(unpicked.wording).toEqual({ owner: "remarks", code: "comment", label: "Clinician comment" });

    const picked = findCofDraftTargets(snapshot, { picks: { outcome: ["fit_limits"] }, fields: {} });
    expect(picked.restrictions).toEqual({ owner: "outcome:fit_limits", code: "limits", label: "Restrictions" });
  });

  it("returns no targets when the form has no matching free-text fields", () => {
    const bare: ExamTemplateSnapshot = {
      sections: [{ code: "s", name: "S", content_mode: "direct", items: [], response_fields: [field("bp", "Blood pressure", "number")] }],
    };
    expect(findCofDraftTargets(bare, { picks: {}, fields: {} })).toEqual({ wording: null, restrictions: null });
  });
});

describe("applyCofDraft", () => {
  it("writes wording and restriction lines into the matched fields and keeps other answers", () => {
    const answers = { picks: { outcome: ["fit_limits"] }, fields: { remarks: { choice: "a" } } };
    const targets = findCofDraftTargets(snapshot, answers);

    const next = applyCofDraft(answers, targets, { wording: " Fit with limits. ", restrictions: ["No night shift", " ", "No heights"] });

    expect(next.fields.remarks).toEqual({ choice: "a", comment: "Fit with limits." });
    expect(next.fields["outcome:fit_limits"]).toEqual({ limits: "No night shift\nNo heights" });
    expect(next.picks).toBe(answers.picks);
  });
});
