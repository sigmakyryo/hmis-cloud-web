import { describe, expect, it } from "vitest";

import { sessionFormSteps } from "@/features/occupational-health/lib/oh-session-forms";

describe("sessionFormSteps", () => {
  it("starts pre-employment with the employee form and keeps later visits to the exam and certificate", () => {
    expect(sessionFormSteps({ code: "pre_employment" }).map((step) => step.kind)).toEqual([
      "employee",
      "examination",
      "certificate",
    ]);
    for (const code of ["periodic", "change_of_function", "return_to_work", "post_incident", "exit", "injury_on_duty"]) {
      expect(sessionFormSteps({ code }).map((step) => step.kind)).toEqual(["examination", "certificate"]);
    }
    expect(sessionFormSteps(null).map((step) => step.kind)).toEqual(["examination", "certificate"]);
  });

  it("lists an extra attached form once and skips built-in copies", () => {
    const steps = sessionFormSteps({
      code: "periodic",
      forms: [
        { uuid: "exam-form", name: "Examination", system_type: "examination" },
        { uuid: "extra", name: "Audiometry", system_type: null },
        { uuid: "extra", name: "Audiometry", system_type: null },
      ],
    });
    expect(steps.map((step) => step.title)).toEqual(["Examination", "Certificate of fitness", "Audiometry"]);
  });
});
