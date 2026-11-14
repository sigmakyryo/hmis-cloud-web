import { describe, expect, it } from "vitest";

import { evaluationLabel, formatNumber, formatRatio } from "@/features/exposure-management/lib/exposure-format";
import { measurementFormSchema } from "@/features/exposure-management/lib/measurement.schema";

describe("exposure formatting", () => {
  it("formats ratios as percentages and shows a dash when missing", () => {
    expect(formatRatio(0.824)).toBe("82%");
    expect(formatRatio(0.05)).toBe("5.0%");
    expect(formatRatio(1.236)).toBe("124%");
    expect(formatRatio(null)).toBe("—");
  });

  it("keeps significant digits and handles zero and null", () => {
    expect(formatNumber(0.012345)).toBe("0.0123");
    expect(formatNumber(12345.6)).toBe("12,346");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(undefined)).toBe("—");
  });

  it("labels evaluations, including unknown ones", () => {
    expect(evaluationLabel("exceeds_limit")).toBe("Exceeds limit");
    expect(evaluationLabel("")).toBe("Not evaluated");
  });
});

describe("measurement form schema", () => {
  const base = {
    group_uuid: "g", agent_uuid: "a", sample_type: "personal" as const, sampled_at: "2026-11-01T08:00",
    duration_minutes: "480", result_value: "0.4", result_unit: "mg/m3", below_lod: false, lod_value: "",
  };

  it("accepts a valid result", () => {
    expect(measurementFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a negative result and a missing group", () => {
    expect(measurementFormSchema.safeParse({ ...base, result_value: "-1" }).success).toBe(false);
    expect(measurementFormSchema.safeParse({ ...base, group_uuid: "" }).success).toBe(false);
  });

  it("requires a limit of detection when the result is below it", () => {
    expect(measurementFormSchema.safeParse({ ...base, below_lod: true }).success).toBe(false);
    expect(measurementFormSchema.safeParse({ ...base, below_lod: true, lod_value: "0.01" }).success).toBe(true);
  });
});
