import { describe, expect, it } from "vitest";

import { formatPayerAdvisoriesLine } from "@/features/catalog/utils/payer-advisories";

describe("formatPayerAdvisoriesLine", () => {
  it("returns null when advisories are empty", () => {
    expect(formatPayerAdvisoriesLine(undefined)).toBeNull();
    expect(formatPayerAdvisoriesLine([])).toBeNull();
  });

  it("joins advisory messages with a middle dot", () => {
    expect(
      formatPayerAdvisoriesLine([
        { code: "requires_preauthorization", message: "Pre-authorisation required" },
        { code: "gender_not_allowed", message: "Not allowed for this patient's gender" },
      ]),
    ).toBe(
      "Pre-authorisation required · Not allowed for this patient's gender",
    );
  });
});
