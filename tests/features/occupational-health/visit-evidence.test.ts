import { expect, it } from "vitest";

import {
  buildVisitEvidence,
  medicalExamEvidenceLine,
  pdfExportSections,
  withPdfInclude,
} from "@/features/occupational-health/lib/visit-evidence";
import type { DaVisitPanel } from "@/features/occupational-health/services/drug-alcohol.service";
import type { HpResult } from "@/features/occupational-health/services/health-programs.service";
import type { OhImmPatientRecord } from "@/features/occupational-health/services/immunisation.service";
import type { OhExamination } from "@/features/occupational-health/types";

function hp(partial: Partial<HpResult> & Pick<HpResult, "program" | "outcome">): HpResult {
  return {
    uuid: partial.uuid ?? `${partial.program}-1`,
    customer_uuid: "cust-1",
    worker_label: "Ada",
    performed_at: "2026-11-13T08:00:00Z",
    is_baseline: false,
    data: {},
    computed: { flags: [] },
    outcome_overridden: false,
    referral: false,
    restrictions: [],
    next_due_on: null,
    visit_uuid: "visit-1",
    billed: false,
    recorded_by_initials: "DA",
    notes: "",
    is_active: true,
    ...partial,
  };
}

it("builds compact evidence lines from visit health checks, D&A and immunizations", () => {
  const hearing = hp({
    program: "hearing",
    outcome: "fit",
    computed: { flags: ["sts"], average_234: { left: 28, right: 12 } },
    data: { left: { "500": 15, "1000": 20, "2000": 25, "4000": 40 }, right: { "500": 10, "1000": 10, "2000": 15, "4000": 20 } },
    notes: "mild dip",
  });
  const da = {
    visit_uuid: "visit-1",
    customer_uuid: "cust-1",
    policy: { uuid: "p1", name: "Policy", version: 1 },
    status: null,
    tests: [
      {
        uuid: "t1",
        final_result: "negative",
        fitness_outcome: "fit",
        status: "verified",
        created_at: "2026-11-13T09:00:00Z",
        verified_at: "2026-11-13T10:00:00Z",
      },
    ],
    open: { random_selections: [], followups: [], rtd_cases: [] },
    refusal_reasons: [],
    can_view_results: true,
  } as unknown as DaVisitPanel;
  const imm: OhImmPatientRecord = {
    customer_uuid: "cust-1",
    statuses: [
      {
        uuid: "s1",
        customer_uuid: "cust-1",
        vaccine_uuid: "v1",
        vaccine_code: "hep_b",
        vaccine_name: "Hepatitis B",
        status: "complete",
        doses_received: 3,
        doses_required: 3,
        next_due_date: null,
        last_dose_date: "2025-01-01",
      },
    ],
    doses: [],
    exemptions: [],
    aefi: [],
  };

  const lines = buildVisitEvidence({
    healthChecks: [hearing],
    healthReady: true,
    drugAlcohol: da,
    drugAlcoholReady: true,
    immunizations: imm,
    immunizationsReady: true,
    examLine: medicalExamEvidenceLine([
      {
        id: 1,
        uuid: "exam-1",
        encounter: 1,
        employment_episode: null,
        exam_type: "periodic",
        occupational_attendance: true,
        template_code: "exam",
        notes: "",
        examined_at: "2026-11-13T08:00:00Z",
        created_at: "2026-11-13T08:00:00Z",
        updated_at: "2026-11-13T08:00:00Z",
        checklist_complete: true,
      } as OhExamination,
    ]),
  });

  const exam = lines.find((line) => line.id === "exam");
  expect(exam?.available).toBe(true);
  expect(exam?.statusLabel).toBe("Completed");
  expect(exam?.result).toContain("Periodic");

  const hearingLine = lines.find((line) => line.id === "hearing");
  expect(hearingLine?.available).toBe(true);
  expect(hearingLine?.statusLabel).toBe("Flagged");
  expect(hearingLine?.result).toContain("Fit");
  expect(hearingLine?.result).toMatch(/Hearing shift|sts/i);
  expect(hearingLine?.displayValue).toContain("L 28");
  expect(hearingLine?.displayValue).toContain("R 12");
  expect(hearingLine?.displayUnit).toBe("dB");
  expect(hearingLine?.visual?.bars).toEqual([
    { label: "L", value: 28, max: 80 },
    { label: "R", value: 12, max: 80 },
  ]);
  expect(hearingLine?.visual?.spark?.[0]?.points.length).toBeGreaterThanOrEqual(2);

  const vision = lines.find((line) => line.id === "vision");
  expect(vision?.available).toBe(false);
  expect(vision?.statusLabel).toBe("Not recorded");

  const daLine = lines.find((line) => line.id === "drug-alcohol");
  expect(daLine?.available).toBe(true);
  expect(daLine?.result).toMatch(/Negative/i);
  expect(daLine?.displayValue).toMatch(/Negative/i);

  const immLine = lines.find((line) => line.id === "immunizations");
  expect(immLine?.available).toBe(true);
  expect(immLine?.statusLabel).toBe("Up to date");
});

it("does not invent not-recorded lines while queries are still pending", () => {
  expect(buildVisitEvidence({ healthReady: false, drugAlcoholReady: false, immunizationsReady: false })).toEqual([]);
});

it("lists export sections with available records ticked by default and builds an include query", () => {
  const hearing: ReturnType<typeof buildVisitEvidence>[number] = {
    id: "hearing",
    includeKey: "hearing",
    label: "Hearing",
    result: "Fit",
    statusLabel: "Fit",
    tone: "ok",
    available: true,
    panel: "health-checks",
  };
  const vision: ReturnType<typeof buildVisitEvidence>[number] = {
    id: "vision",
    includeKey: "vision",
    label: "Vision",
    result: "Not recorded",
    statusLabel: "Not recorded",
    tone: "muted",
    available: false,
    panel: "health-checks",
  };
  const sections = pdfExportSections({
    family: "cof",
    hasAnswers: true,
    hasFitness: true,
    hasSignature: true,
    evidence: [hearing, vision],
  });
  const available = sections.filter((section) => section.available).map((section) => section.key);
  expect(available).toContain("worker");
  expect(available).toContain("answers");
  expect(available).toContain("fitness");
  expect(available).toContain("hearing");
  expect(available).toContain("signature");
  expect(available).not.toContain("vision");
  const visionSection = sections.find((section) => section.key === "vision");
  expect(visionSection?.note).toBe("Not recorded");
  expect(sections.find((section) => section.key === "answers")?.label).toBe("COF answers");

  const withoutFitness = pdfExportSections({
    family: "exam",
    hasAnswers: true,
    hasFitness: true,
    hasSignature: true,
    evidence: [hearing, vision],
    included: ["immunizations", "drug-alcohol", "health-programs", "injuries", "employment", "exposure"],
  });
  expect(withoutFitness.map((section) => section.key)).not.toContain("fitness");
  expect(withoutFitness.map((section) => section.key)).toEqual(
    expect.arrayContaining(["worker", "answers", "hearing", "signature"]),
  );

  expect(withPdfInclude("/pdf", ["worker", "hearing"])).toBe("/pdf?include=worker,hearing");
  expect(withPdfInclude("/pdf?x=1", ["answers"])).toBe("/pdf?x=1&include=answers");
});
