import { describe, expect, it } from "vitest";

import { breakdown, facts, headlines, metricSeries, readRow, shareOf } from "@/features/employer-portal/annual/annual-dashboard";
import type { AnnualReport } from "@/features/occupational-health/services/oh-annual-report.service";

function report(year: number, sections: AnnualReport["sections"]): AnnualReport {
  return { year, audience: "employer", employer: null, generated_at: "", suppression: null, sections };
}

const y2025 = report(2025, {
  workforce: { "Workers on file during the year": 40 },
  medicals: { Examinations: 30, "Examinations: pre employment": 20, "Examinations: periodic": 8, "Examinations: exit": "<5" },
  fitness: { "Outcome: fit": 25, "Outcome: not fit": 3, "Certificates issued": 28 },
  surveillance: { "Completion %": "80" },
});
const y2026 = report(2026, {
  workforce: { "Workers on file during the year": 45 },
  medicals: { Examinations: 24, "Examinations: pre employment": 14, "Examinations: periodic": 10 },
  fitness: { "Certificates issued": "<5" },
  surveillance: { "Completion %": "—" },
});

describe("annual dashboard figures", () => {
  it("compares each headline with the year before", () => {
    const [workers, exams, certs, surveillance] = headlines(y2026, y2025, 2026);
    expect(workers).toMatchObject({ value: "45", note: "+5 vs 2025", tone: "good" });
    expect(exams).toMatchObject({ value: "24", note: "−6 vs 2025", tone: "bad" });
    expect(certs.value).toBe("<5");
    expect(certs.note).toBeUndefined();
    expect(surveillance.value).toBe("—");
  });

  it("shows percentages for surveillance and says when nothing changed", () => {
    const [, , , surveillance] = headlines(y2025, y2025, 2025);
    expect(surveillance).toMatchObject({ value: "80%", note: "same as 2024", tone: "muted" });
  });

  it("copes with a missing report", () => {
    expect(headlines(null, null, 2026).every((item) => item.value === "—" && item.note === undefined)).toBe(true);
  });

  it("reads one measure and builds a series with gaps for suppressed years", () => {
    expect(readRow(y2025, "medicals", "Examinations")).toBe(30);
    expect(readRow(y2026, "fitness", "Certificates issued")).toBeNull();
    expect(metricSeries([{ year: 2025, report: y2025 }, { year: 2026, report: y2026 }, { year: 2027, report: null }], "certificates")).toEqual([
      { year: "2025", value: 28 },
      { year: "2026", value: null },
      { year: "2027", value: null },
    ]);
  });

  it("builds slices from breakdown rows, largest first, and counts suppressed ones", () => {
    const { slices, suppressed } = breakdown(y2025, "medicals", "Examinations: ");
    expect(slices.map((slice) => slice.label)).toEqual(["Pre employment", "Periodic"]);
    expect(suppressed).toBe(1);
    expect(shareOf(20, slices)).toBe(71);
    expect(shareOf(1, [])).toBe(0);
  });

  it("lists plain facts and skips breakdown prefixes", () => {
    expect(facts(y2025, "fitness", ["Outcome: "])).toEqual([{ label: "Certificates issued", value: "28" }]);
  });
});
