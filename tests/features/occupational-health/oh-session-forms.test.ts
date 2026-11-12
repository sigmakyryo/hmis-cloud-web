import { describe, expect, it } from "vitest";

import {
  isExaminationStepReady,
  isLastSessionStep,
  nextSessionStep,
  sessionFormStepKey,
  sessionFormSteps,
  sessionStepStatus,
  summarizeExamAnswers,
} from "@/features/occupational-health/lib/oh-session-forms";
import { parseExamTemplateSnapshot } from "@/features/occupational-health/lib/exam-template-snapshot";

describe("sessionFormSteps", () => {
  it("includes the employee form for pre-employment and configured visit types", () => {
    expect(sessionFormSteps({ code: "pre_employment" }).map(sessionFormStepKey)).toEqual([
      "employee",
      "examination",
      "certificate",
    ]);
    expect(sessionFormSteps({ code: "periodic" }).map(sessionFormStepKey)).toEqual([
      "examination",
      "certificate",
    ]);
    expect(
      sessionFormSteps({
        code: "periodic",
        forms: [{ uuid: "emp", name: "Employee", system_type: "employee_form" }],
      }).map(sessionFormStepKey),
    ).toEqual(["employee", "examination", "certificate"]);
  });

  it("keeps attached forms after the built-in steps", () => {
    const steps = sessionFormSteps({
      code: "periodic",
      forms: [{ uuid: "consent", name: "Consent", system_type: null }],
    });
    expect(steps.map(sessionFormStepKey)).toEqual(["examination", "certificate", "consent"]);
    expect(isLastSessionStep(steps, "certificate")).toBe(false);
    expect(sessionFormStepKey(nextSessionStep(steps, "examination")!)).toBe("certificate");
  });
});

describe("session readiness helpers", () => {
  it("locks the certificate until examinations are valid and saved", () => {
    const incomplete = [
      {
        uuid: "exam-1",
        template_snapshot: {
          schema_version: 3,
          sections: [
            {
              code: "vitals",
              name: "Vitals",
              content_mode: "direct",
              response_fields: [{ code: "bp", label: "BP", response_type: "text", required: true }],
              items: [],
            },
          ],
        },
        responses_json: {
          __exam_template__: { answers: { picks: {}, fields: { vitals: { bp: "" } } } },
        },
        is_active: true,
      },
    ] as any;
    expect(isExaminationStepReady(incomplete)).toBe(false);
    expect(
      sessionStepStatus(
        { kind: "certificate", title: "Certificate of fitness" },
        { examinations: incomplete, cofResponses: [] },
      ),
    ).toBe("locked");

    const complete = [
      {
        ...incomplete[0],
        responses_json: {
          __exam_template__: { answers: { picks: {}, fields: { vitals: { bp: "120/80" } } } },
        },
      },
    ];
    expect(isExaminationStepReady(complete)).toBe(true);
    expect(
      sessionStepStatus(
        { kind: "certificate", title: "Certificate of fitness" },
        { examinations: complete, cofResponses: [] },
      ),
    ).toBe("not_started");
  });

  it("summarizes filled employee answers with pinned labels", () => {
    const snapshot = parseExamTemplateSnapshot({
      schema_version: 3,
      sections: [
        {
          code: "identity",
          name: "Identity",
          content_mode: "direct",
          response_fields: [
            { code: "full_name", label: "Full name", response_type: "text" },
            {
              code: "role",
              label: "Role",
              response_type: "single_select",
              options: [{ code: "ops", label: "Operations" }],
            },
          ],
          items: [],
        },
      ],
    });
    expect(
      summarizeExamAnswers(snapshot, {
        picks: {},
        fields: { identity: { full_name: "Ada", role: "ops" } },
      }),
    ).toEqual([
      { key: "field:identity:full_name", label: "Full name", value: "Ada" },
      { key: "field:identity:role", label: "Role", value: "Operations" },
    ]);
  });
});
