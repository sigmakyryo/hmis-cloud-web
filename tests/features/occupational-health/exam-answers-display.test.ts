import { describe, expect, it } from "vitest";

import {
  examAnswerSections,
  examAnswerSummary,
  examAnswersAreComplete,
  emptyAnswerCount,
  formatCompletedAt,
  formatExamFieldValue,
  sectionAnswerRows,
} from "@/features/occupational-health/lib/exam-answers-display";
import { parseExamTemplateSnapshot } from "@/features/occupational-health/lib/exam-template-snapshot";

const snapshot = parseExamTemplateSnapshot({
  schema_version: 3,
  sections: [
    {
      code: "history",
      name: "Medical history",
      content_mode: "direct",
      response_fields: [
        { code: "complaint", label: "Presenting complaint", response_type: "text" },
        { code: "bp", label: "Blood pressure", response_type: "number", unit: "mmHg" },
        { code: "exam_date", label: "Exam date", response_type: "date" },
        { code: "seen_at", label: "Seen at", response_type: "datetime" },
        { code: "smoker", label: "Smoker", response_type: "boolean" },
        {
          code: "laterality",
          label: "Laterality",
          response_type: "multi_select",
          options: [
            { code: "L", label: "Left" },
            { code: "R", label: "Right" },
          ],
        },
        { code: "consent", label: "Consent form", response_type: "file" },
        { code: "sign", label: "Signature", response_type: "signature" },
        { code: "empty", label: "Notes", response_type: "textarea" },
      ],
      items: [],
    },
    {
      code: "findings",
      name: "Findings",
      content_mode: "items",
      items: [
        {
          code: "lungs",
          name: "Lungs clear",
          response_fields: [{ code: "note", label: "Note", response_type: "text" }],
        },
        { code: "heart", name: "Heart", response_fields: [] },
      ],
    },
  ],
});

const cofSnapshot = parseExamTemplateSnapshot({
  schema_version: 3,
  sections: [
    {
      code: "certificate",
      name: "Certificate of fitness",
      content_mode: "items",
      items: [
        {
          code: "review",
          name: "Restrictions, Review and Clinician Certification",
          response_fields: [
            {
              code: "role",
              label: "Role and duties covered by this certificate",
              response_type: "textarea",
            },
            {
              code: "outcome",
              label: "Fitness outcome",
              response_type: "single_select",
              options: [
                { code: "fit", label: "Fit" },
                { code: "fit_with_restrictions", label: "Fit with restrictions" },
              ],
            },
            { code: "restrictions", label: "Restrictions", response_type: "textarea" },
            { code: "valid_from", label: "Valid from", response_type: "date" },
            { code: "valid_to", label: "Valid to", response_type: "date" },
            { code: "clinical", label: "Clinical review complete", response_type: "boolean" },
            { code: "notes", label: "Other notes", response_type: "textarea" },
          ],
        },
      ],
    },
  ],
});

const cofAnswers = {
  picks: { certificate: ["review"] },
  fields: {
    "certificate:review": {
      role: "ferf",
      outcome: "fit_with_restrictions",
      restrictions: "No work at height",
      valid_from: "2026-11-13",
      valid_to: "2027-11-13",
      clinical: "true",
      notes: "",
    },
  },
};

describe("formatExamFieldValue", () => {
  it("formats choices, numbers with units, dates, files and signatures", () => {
    expect(formatExamFieldValue({ response_type: "boolean" }, "true")).toBe("Yes");
    expect(formatExamFieldValue({ response_type: "boolean" }, "0")).toBe("No");
    expect(formatExamFieldValue({ response_type: "number", unit: "mmHg" }, "120")).toBe("120 mmHg");
    expect(formatExamFieldValue({ response_type: "date" }, "2026-11-13")).toBe("13 Nov 2026");
    expect(formatExamFieldValue({ response_type: "datetime" }, "2026-11-13T08:30:00")).toBe(
      "13 Nov 2026, 08:30",
    );
    expect(
      formatExamFieldValue(
        {
          response_type: "single_select",
          options: [{ code: "fit", label: "Fit" }],
        },
        "fit",
      ),
    ).toBe("Fit");
    expect(
      formatExamFieldValue(
        {
          response_type: "multi_select",
          options: [
            { code: "L", label: "Left" },
            { code: "R", label: "Right" },
          ],
        },
        "L,R",
      ),
    ).toBe("Left, Right");
    expect(
      formatExamFieldValue({ response_type: "file" }, JSON.stringify({ name: "audiogram.pdf" })),
    ).toBe("audiogram.pdf");
    expect(formatExamFieldValue({ response_type: "signature" }, "data:image/png;base64,abc")).toBe(
      "Signed",
    );
    expect(formatExamFieldValue({ response_type: "text" }, "")).toBe("Not recorded");
  });
});

describe("examAnswerSections", () => {
  it("groups answers by section with field labels only, and keeps empty fields marked", () => {
    const sections = examAnswerSections(snapshot, {
      picks: { findings: ["lungs"] },
      fields: {
        history: {
          complaint: "Cough",
          bp: "120",
          exam_date: "2026-11-13",
          seen_at: "2026-11-13T08:30:00",
          smoker: "false",
          laterality: "L,R",
          consent: JSON.stringify({ filename: "consent.pdf" }),
          sign: "data:image/png;base64,xx",
          empty: "",
        },
        "findings:lungs": { note: "Clear" },
      },
    });
    expect(sections.map((section) => section.name)).toEqual(["Medical history", "Findings"]);
    const history = Object.fromEntries(sectionAnswerRows(sections[0]!).map((row) => [row.label, row.value]));
    expect(history["Presenting complaint"]).toBe("Cough");
    expect(history["Blood pressure"]).toBe("120 mmHg");
    expect(history["Exam date"]).toBe("13 Nov 2026");
    expect(history.Smoker).toBe("No");
    expect(history.Laterality).toBe("Left, Right");
    expect(history["Consent form"]).toBe("consent.pdf");
    expect(history.Signature).toBe("Signed");
    expect(history.Notes).toBe("Not recorded");
    expect(sectionAnswerRows(sections[0]!).find((row) => row.label === "Notes")?.empty).toBe(true);
    const findings = sections[1]!;
    expect(findings.groups.map((group) => group.name)).toEqual(["Lungs clear"]);
    expect(sectionAnswerRows(findings).map((row) => [row.label, row.value])).toEqual([["Note", "Clear"]]);
    expect(sectionAnswerRows(findings).some((row) => row.label === "Selected")).toBe(false);
    expect(emptyAnswerCount(sections)).toBe(1);
  });

  it("treats a picked item with fields as a sub-group, not a Selected meta row", () => {
    const sections = examAnswerSections(cofSnapshot, cofAnswers);
    const certificate = sections[0]!;
    expect(certificate.name).toBe("Certificate of fitness");
    expect(certificate.groups).toHaveLength(1);
    expect(certificate.groups[0]!.name).toBe("Restrictions, Review and Clinician Certification");
    const labels = sectionAnswerRows(certificate).map((row) => row.label);
    expect(labels).toEqual([
      "Role and duties covered by this certificate",
      "Fitness outcome",
      "Restrictions",
      "Valid from",
      "Valid to",
      "Clinical review complete",
      "Other notes",
    ]);
    expect(labels.some((label) => label.includes("·"))).toBe(false);
    expect(labels).not.toContain("Selected");
    expect(sectionAnswerRows(certificate).map((row) => row.value)).not.toContain(
      "Restrictions, Review and Clinician Certification",
    );
  });

  it("shows picks without follow-up fields as chips, not a Selected row", () => {
    const sections = examAnswerSections(snapshot, {
      picks: { findings: ["heart"] },
      fields: {},
    });
    expect(sections[1]!.groups[0]!.chips).toEqual(["Heart"]);
    expect(sectionAnswerRows(sections[1]!).some((row) => row.label === "Selected")).toBe(false);
  });

  it("treats valid answers as complete for the session step", () => {
    expect(
      examAnswersAreComplete(snapshot, {
        picks: {},
        fields: { history: { complaint: "Cough" } },
      }),
    ).toBe(true);
  });
});

describe("examAnswerSummary", () => {
  it("picks the COF verdict, validity and restriction chips", () => {
    const summary = examAnswerSummary(cofSnapshot, cofAnswers, "cof");
    expect(summary.outcome).toBe("Fit with restrictions");
    expect(summary.validFrom).toBe("13 Nov 2026");
    expect(summary.validTo).toBe("13 Nov 2027");
    expect(summary.restrictions).toEqual(["No work at height"]);
    expect(summary.highlights.some((item) => item.role === "validity" && item.value.includes("13 Nov 2026"))).toBe(
      true,
    );
  });

  it("picks exam vitals and finding chips", () => {
    const summary = examAnswerSummary(
      snapshot,
      {
        picks: { findings: ["heart"] },
        fields: { history: { bp: "120", complaint: "Cough" } },
      },
      "exam",
    );
    expect(summary.highlights.filter((item) => item.role === "vital").map((item) => item.value)).toEqual([
      "120 mmHg",
    ]);
    expect(summary.highlights.filter((item) => item.role === "finding").map((item) => item.value)).toEqual([
      "Heart",
    ]);
  });
});

describe("formatCompletedAt", () => {
  it("formats a date-only value and a timestamp", () => {
    expect(formatCompletedAt("2026-11-13")).toBe("13 Nov 2026");
    expect(formatCompletedAt("2026-11-13T08:30:00")).toBe("13 Nov 2026, 08:30");
    expect(formatCompletedAt(null)).toBeNull();
  });
});
