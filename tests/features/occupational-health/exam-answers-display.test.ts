import { describe, expect, it } from "vitest";

import {
  examAnswerSections,
  examAnswersAreComplete,
  formatCompletedAt,
  formatExamFieldValue,
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
  it("groups answers by section and keeps empty fields as Not recorded", () => {
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
    const history = Object.fromEntries(sections[0]!.rows.map((row) => [row.label, row.value]));
    expect(history["Presenting complaint"]).toBe("Cough");
    expect(history["Blood pressure"]).toBe("120 mmHg");
    expect(history["Exam date"]).toBe("13 Nov 2026");
    expect(history.Smoker).toBe("No");
    expect(history.Laterality).toBe("Left, Right");
    expect(history["Consent form"]).toBe("consent.pdf");
    expect(history.Signature).toBe("Signed");
    expect(history.Notes).toBe("Not recorded");
    expect(sections[0]!.rows.find((row) => row.label === "Notes")?.empty).toBe(true);
    expect(sections[1]!.rows.map((row) => [row.label, row.value])).toEqual([
      ["Selected", "Lungs clear"],
      ["Lungs clear · Note", "Clear"],
    ]);
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

describe("formatCompletedAt", () => {
  it("formats a date-only value and a timestamp", () => {
    expect(formatCompletedAt("2026-11-13")).toBe("13 Nov 2026");
    expect(formatCompletedAt("2026-11-13T08:30:00")).toBe("13 Nov 2026, 08:30");
    expect(formatCompletedAt(null)).toBeNull();
  });
});
