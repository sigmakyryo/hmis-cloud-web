import { describe, expect, it } from "vitest";

import {
  IOD_APPLICABILITY_NONE,
  iodApplies,
} from "@/features/occupational-health/lib/oh-iod-applicability";

describe("iodApplies", () => {
  it("stays off when nothing is selected", () => {
    expect(iodApplies(IOD_APPLICABILITY_NONE, "return_to_work")).toBe(false);
    expect(iodApplies(IOD_APPLICABILITY_NONE, null)).toBe(false);
  });

  it("applies on every fitness visit when certificate or exam is on", () => {
    expect(iodApplies({ cof: true, exam: false, visit_type_codes: [] }, "periodic")).toBe(true);
    expect(iodApplies({ cof: false, exam: true, visit_type_codes: [] }, null)).toBe(true);
  });

  it("applies only on a selected visit type", () => {
    const setting = { cof: false, exam: false, visit_type_codes: ["return_to_work"] };
    expect(iodApplies(setting, "return_to_work")).toBe(true);
    expect(iodApplies(setting, "periodic")).toBe(false);
    expect(iodApplies(setting, null)).toBe(false);
  });
});
