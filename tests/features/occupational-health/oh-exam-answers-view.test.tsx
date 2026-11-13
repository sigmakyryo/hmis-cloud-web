import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import {
  OhExamAnswersView,
  describeValidity,
  formatSubjectLine,
  outcomeTone,
  splitVitalValue,
  visitAnswerSubject,
} from "@/features/occupational-health/components/OhExamAnswersView";
import {
  examAnswerSections,
  examAnswerSummary,
  type ExamAnswerSectionView,
} from "@/features/occupational-health/lib/exam-answers-display";
import { parseExamTemplateSnapshot } from "@/features/occupational-health/lib/exam-template-snapshot";

const sections: ExamAnswerSectionView[] = [
  {
    code: "history",
    name: "Medical history",
    groups: [
      {
        code: "history",
        name: "",
        rows: [
          { key: "complaint", label: "Presenting complaint", value: "Cough", empty: false, kind: "text", compact: false },
          { key: "bp", label: "Blood pressure", value: "120 mmHg", empty: false, kind: "number", compact: true },
          { key: "smoker", label: "Smoker", value: "No", empty: false, kind: "boolean", compact: true },
          {
            key: "sides",
            label: "Laterality",
            value: "Left, Right",
            empty: false,
            kind: "choice",
            compact: true,
          },
          { key: "notes", label: "Notes", value: "Not recorded", empty: true, kind: "long", compact: false },
          {
            key: "sign",
            label: "Signature",
            value: "Signed",
            empty: false,
            kind: "attachment",
            compact: true,
            previewSrc: "data:image/png;base64,abc",
          },
        ],
      },
    ],
  },
];

afterEach(cleanup);

it("renders a document header, vitals, definition-list fields and a per-section empty link", () => {
  const onEdit = vi.fn();
  render(
    <OhExamAnswersView
      heading="Periodic medical"
      subject={{ name: "Ada Lovelace", employeeNumber: "E-104", role: "Welder" }}
      sections={sections}
      summary={{
        restrictions: [],
        highlights: [{ key: "bp", label: "Blood pressure", value: "120 mmHg", role: "vital" }],
      }}
      completedAt="2026-11-13T08:30:00"
      completedBy="Dr Ada"
      pdfUrl="/api/occupational-health/oh-ext/oh-examinations/exam-1/pdf"
      onEdit={onEdit}
    />,
  );

  expect(screen.getByTestId("oh-exam-answers-view")).toBeVisible();
  expect(screen.getByTestId("oh-exam-answers-status")).toHaveTextContent("Completed");
  expect(screen.getByRole("heading", { name: "Periodic medical" })).toBeVisible();
  expect(screen.getByTestId("oh-exam-answers-subject")).toHaveTextContent("Ada Lovelace · E-104 · Welder");
  expect(screen.getByText("Dr Ada · 13 Nov 2026, 08:30")).toBeVisible();
  expect(screen.getByText("Medical history")).toBeVisible();
  expect(screen.getByText("Presenting complaint")).toBeVisible();
  expect(screen.getAllByText("Cough").length).toBeGreaterThan(0);
  expect(screen.getAllByText("120").length).toBeGreaterThan(0);
  expect(screen.getByText("mmHg")).toBeVisible();
  expect(screen.getByTestId("oh-exam-answers-highlights")).toHaveTextContent("BP");
  expect(screen.getByText("No")).toBeVisible();
  expect(screen.getByText("Left")).toBeVisible();
  expect(screen.getByText("Right")).toBeVisible();
  expect(screen.getByRole("img", { name: "Signature" })).toHaveAttribute(
    "src",
    "data:image/png;base64,abc",
  );
  expect(screen.queryByText("Not recorded")).toBeNull();
  expect(screen.getByRole("button", { name: "1 not recorded" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "1 not recorded" }));
  expect(screen.getByText("Not recorded")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Hide empty" }));
  expect(screen.queryByText("Not recorded")).toBeNull();

  const pdf = screen.getByRole("link", { name: "Export PDF" });
  expect(pdf).toHaveAttribute(
    "href",
    "/api/occupational-health/oh-ext/oh-examinations/exam-1/pdf",
  );
  expect(pdf).toHaveAttribute("target", "_blank");
  expect(pdf).toHaveTextContent("PDF");
  expect(screen.getByRole("button", { name: "Print" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(onEdit).toHaveBeenCalledTimes(1);
});

it("hides Edit when amendments are not allowed", () => {
  render(
    <OhExamAnswersView
      sections={sections}
      pdfUrl="/api/occupational-health/oh-ext/oh-cof-responses/cof-1/pdf"
      onEdit={null}
      testId="oh-cof-answers-view"
    />,
  );
  expect(screen.getByTestId("oh-cof-answers-view")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  expect(screen.getByRole("link", { name: "Export PDF" })).toHaveAttribute(
    "href",
    "/api/occupational-health/oh-ext/oh-cof-responses/cof-1/pdf",
  );
  expect(screen.getByRole("button", { name: "Print" })).toBeVisible();
});

it("renders a COF group hierarchy without a Selected prefix or repeated group name on labels", () => {
  const snapshot = parseExamTemplateSnapshot({
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
              { code: "role", label: "Role and duties covered by this certificate", response_type: "textarea" },
              {
                code: "outcome",
                label: "Fitness outcome",
                response_type: "single_select",
                options: [{ code: "fit_with_restrictions", label: "Fit with restrictions" }],
              },
              { code: "restrictions", label: "Restrictions", response_type: "textarea" },
              { code: "valid_from", label: "Valid from", response_type: "date" },
              { code: "valid_to", label: "Valid to", response_type: "date" },
            ],
          },
        ],
      },
    ],
  });
  const answers = {
    picks: { certificate: ["review"] },
    fields: {
      "certificate:review": {
        role: "ferf",
        outcome: "fit_with_restrictions",
        restrictions: "No work at height",
        valid_from: "2026-11-13",
        valid_to: "2027-11-13",
      },
    },
  };
  render(
    <OhExamAnswersView
      heading="Certificate of fitness"
      sections={examAnswerSections(snapshot, answers)}
      summary={examAnswerSummary(snapshot, answers, "cof")}
      completedAt="2026-11-13T08:30:00"
      completedBy="Dr Ada"
      testId="oh-cof-answers-view"
    />,
  );

  expect(screen.getAllByRole("heading", { name: "Certificate of fitness" }).length).toBeGreaterThan(0);
  expect(
    screen.getByRole("heading", { name: "Restrictions, Review and Clinician Certification" }),
  ).toBeVisible();
  expect(screen.getByText("Role and duties covered by this certificate")).toBeVisible();
  expect(screen.getByText("ferf")).toBeVisible();
  expect(screen.queryByText("Selected")).toBeNull();
  expect(
    screen.queryByText("Restrictions, Review and Clinician Certification · Role and duties covered by this certificate"),
  ).toBeNull();
  const outcome = screen.getByTestId("oh-exam-answers-outcome");
  expect(outcome).toHaveTextContent("Fit with restrictions");
  expect(outcome).toHaveAttribute("data-tone", "restricted");
  expect(outcome).toHaveTextContent("Valid 13 Nov 2026 → 13 Nov 2027 · 12 months");
  expect(screen.getByTestId("oh-exam-answers-remaining")).toHaveTextContent("12 months left");
  expect(screen.getByTestId("oh-exam-answers-restrictions")).toHaveTextContent("No work at height");
  expect(screen.getByTestId("oh-exam-answers-signed")).toHaveTextContent(
    "Signed by Dr Ada · 13 Nov 2026, 08:30",
  );
  // Signed line replaces the header meta when a verdict is present.
  expect(screen.queryByText("Dr Ada · 13 Nov 2026, 08:30")).toBeNull();
});

it("classifies certificate verdicts for the outcome accent", () => {
  expect(outcomeTone("Fit")).toBe("fit");
  expect(outcomeTone("Fit with restrictions")).toBe("restricted");
  expect(outcomeTone("Unfit")).toBe("unfit");
  expect(outcomeTone("Pending review")).toBe("neutral");
});

it("describes validity duration and remaining time against a fixed now", () => {
  const now = new Date("2026-11-13T08:00:00");
  expect(describeValidity("13 Nov 2026", "13 Nov 2027", now)).toEqual({
    label: "Valid 13 Nov 2026 → 13 Nov 2027 · 12 months",
    remaining: "12 months left",
    remainingTone: "ok",
  });
  expect(describeValidity("13 Nov 2025", "13 Nov 2026", new Date("2026-11-20T08:00:00"))).toEqual({
    label: "Valid 13 Nov 2025 → 13 Nov 2026 · 12 months",
    remaining: "Expired",
    remainingTone: "expired",
  });
  expect(describeValidity(null, "20 Nov 2026", now)).toEqual({
    label: "Valid until 20 Nov 2026",
    remaining: "7 days left",
    remainingTone: "soon",
  });
});

it("formats a worker subject line from the visit encounter", () => {
  expect(formatSubjectLine({ name: "Ada Lovelace", employeeNumber: "E-104", role: "Welder" })).toBe(
    "Ada Lovelace · E-104 · Welder",
  );
  expect(
    visitAnswerSubject(
      { first_name: "Ada", last_name: "Lovelace", customer_identifier: "E-104" },
      { employee_number: "" },
    ),
  ).toEqual({ name: "Ada Lovelace", employeeNumber: "E-104", role: null });
  expect(splitVitalValue("120 mmHg")).toEqual({ amount: "120", unit: "mmHg" });
  expect(splitVitalValue("120/80")).toEqual({ amount: "120/80", unit: null });
});

it("marks a vital as flagged only when the highlight carries a recorded-range flag", () => {
  render(
    <OhExamAnswersView
      sections={sections}
      summary={{
        restrictions: [],
        highlights: [
          { key: "temp", label: "Temperature", value: "39.5 °C", role: "vital", flagged: true },
        ],
      }}
    />,
  );
  const flagged = screen.getByTestId("oh-exam-answers-highlights").querySelector("[data-flagged]");
  expect(flagged).toHaveAttribute("data-flagged", "true");
  expect(flagged).toHaveTextContent("39.5");
  expect(screen.getByText("Outside the recorded range")).toBeInTheDocument();
});
