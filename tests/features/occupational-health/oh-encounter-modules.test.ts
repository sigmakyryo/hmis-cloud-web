import { describe, expect, it } from "vitest";

import { OH_ENCOUNTER_MODULES } from "@/features/occupational-health/lib/oh-encounter-modules";

describe("OH_ENCOUNTER_MODULES", () => {
  it("keeps the certificate after the examination and leaves injury on duty off the visit", () => {
    const ids = OH_ENCOUNTER_MODULES.map((module) => module.id);
    expect(ids.indexOf("medical-examinations")).toBeLessThan(ids.indexOf("certificate"));
    expect(ids).not.toContain("iod");
    expect(ids).toContain("immunizations");
    expect(ids).toContain("drug-alcohol");
    expect(ids).toContain("fitness");
    expect(ids).toContain("health-checks");
    expect(
      OH_ENCOUNTER_MODULES.find((module) => module.id === "certificate")?.label,
    ).toBe("Occupational Health Certificate");
  });
});
