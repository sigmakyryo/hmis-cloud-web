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
import type { VisitEvidenceLine } from "@/features/occupational-health/lib/visit-evidence";

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

const evidence: VisitEvidenceLine[] = [
  {
    id: "vision",
    includeKey: "vision",
    label: "Vision",
    result: "Not recorded",
    statusLabel: "Not recorded",
    tone: "muted",
    available: false,
    panel: "health-checks",
  },
  {
    id: "hearing",
    includeKey: "hearing",
    label: "Hearing",
    result: "Fit · mild dip at 4000 Hz",
    statusLabel: "Flagged",
    tone: "attention",
    available: true,
    panel: "health-checks",
  },
];

afterEach(cleanup);

it("leads an exam with vitals and answered fields, hiding empty ones until asked", () => {
  const onEdit = vi.fn();
  render(
    <OhExamAnswersView
      heading="Periodic medical"
      family="exam"
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
  expect(screen.getByText("AL")).toBeVisible();
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
  expect(screen.queryByTestId("oh-exam-answers-field-notes")).toBeNull();
  expect(screen.getByRole("button", { name: "1 not recorded" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "1 not recorded" }));
  expect(screen.getByTestId("oh-exam-answers-field-notes")).toHaveTextContent("Not recorded");
  fireEvent.click(screen.getByRole("button", { name: "Hide empty" }));
  expect(screen.queryByTestId("oh-exam-answers-field-notes")).toBeNull();

  expect(screen.queryByRole("navigation", { name: /contents/i })).toBeNull();
  expect(screen.queryByRole("button", { name: "Print" })).toBeNull();
  expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
  expect(screen.queryByTestId("oh-exam-answers-evidence")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(onEdit).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Export" }));
  const confirm = screen.getByRole("link", { name: "Export PDF" });
  expect(confirm).toHaveAttribute(
    "href",
    expect.stringContaining("/api/occupational-health/oh-ext/oh-examinations/exam-1/pdf"),
  );
  expect(confirm).toHaveAttribute("target", "_blank");
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
  expect(screen.getByRole("button", { name: "Export" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Print" })).toBeNull();
});

it("leads a certificate with the outcome, keeps form answers collapsed, and has no Selected prefix", () => {
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
      family="cof"
      sections={examAnswerSections(snapshot, answers)}
      summary={examAnswerSummary(snapshot, answers, "cof")}
      completedAt="2026-11-13T08:30:00"
      completedBy="Dr Ada"
      testId="oh-cof-answers-view"
      evidence={evidence}
    />,
  );

  expect(screen.getAllByRole("heading", { name: "Certificate of fitness" }).length).toBeGreaterThan(0);
  const outcome = screen.getByTestId("oh-exam-answers-outcome");
  expect(outcome).toHaveTextContent("Fit with restrictions");
  expect(outcome).toHaveAttribute("data-tone", "restricted");
  expect(outcome).toHaveTextContent("Valid 13 Nov 2026 → 13 Nov 2027 · 12 months");
  expect(screen.getByTestId("oh-exam-answers-remaining")).toHaveTextContent("12 months left");
  expect(screen.getByTestId("oh-exam-answers-validity-bar")).toBeVisible();
  expect(screen.getByTestId("oh-exam-answers-restrictions")).toHaveTextContent("No work at height");
  expect(screen.getByTestId("oh-exam-answers-signed")).toHaveTextContent(
    "Signed by Dr Ada · 13 Nov 2026, 08:30",
  );
  expect(screen.getByTestId("oh-cof-answers-view").querySelector("header")).toHaveTextContent(
    "Dr Ada · 13 Nov 2026, 08:30",
  );

  expect(screen.getByTestId("oh-exam-answers-evidence")).toHaveTextContent("Visit evidence");
  expect(screen.getByTestId("oh-exam-answers-evidence")).toHaveTextContent("Hearing");
  expect(screen.queryByText("Role and duties covered by this certificate")).toBeNull();

  const toggle = screen.getByTestId("oh-exam-answers-form-toggle");
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(toggle.textContent).toMatch(/Form answers \(\d+\)/);
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(
    screen.getByRole("heading", { name: "Restrictions, Review and Clinician Certification" }),
  ).toBeVisible();
  expect(screen.getByText("Role and duties covered by this certificate")).toBeVisible();
  expect(screen.getByText("ferf")).toBeVisible();
  expect(screen.queryByText("Selected")).toBeNull();
  expect(
    screen.queryByText("Restrictions, Review and Clinician Certification · Role and duties covered by this certificate"),
  ).toBeNull();
});

it("opens an export dialog with available sections ticked and builds an include query", () => {
  const onOpenPanel = vi.fn();
  render(
    <OhExamAnswersView
      heading="Certificate of fitness"
      family="cof"
      sections={sections}
      summary={{ outcome: "Fit", restrictions: ["No climbing"], highlights: [] }}
      completedAt="2026-11-13T08:30:00"
      completedBy="Dr Ada"
      pdfUrl="/api/occupational-health/oh-ext/oh-cof-responses/cof-1/pdf"
      evidence={evidence}
      onOpenPanel={onOpenPanel}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Open Hearing" }));
  expect(onOpenPanel).toHaveBeenCalledWith("health-checks");
  fireEvent.click(screen.getByRole("button", { name: "Record Vision" }));
  expect(onOpenPanel).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole("button", { name: "Export" }));
  const dialog = screen.getByRole("dialog", { name: "Export PDF" });
  expect(dialog).toBeVisible();

  expect(screen.getByRole("checkbox", { name: /Worker details/ })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /COF answers/ })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /Fitness outcome/ })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /Hearing/ })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /Vision/ })).not.toBeChecked();
  expect(screen.getByRole("checkbox", { name: /Vision/ }).closest("label")).toHaveTextContent("Not recorded");

  const confirm = screen.getByTestId("oh-exam-answers-export-confirm");
  expect(confirm).toHaveAttribute("target", "_blank");
  const href = confirm.getAttribute("href") ?? "";
  expect(href).toContain("/api/occupational-health/oh-ext/oh-cof-responses/cof-1/pdf");
  expect(href).toContain("include=");
  expect(href).toContain("hearing");
  expect(href).toContain("worker");
  expect(href).toContain("answers");
  expect(href).not.toMatch(/include=[^&]*vision/);

  fireEvent.click(screen.getByRole("button", { name: "Select all" }));
  expect(screen.getByRole("checkbox", { name: /Vision/ })).toBeChecked();
  expect(screen.getByTestId("oh-exam-answers-export-confirm").getAttribute("href")).toContain("vision");

  fireEvent.click(screen.getByRole("button", { name: "Select none" }));
  expect(screen.getByRole("checkbox", { name: /Worker details/ })).not.toBeChecked();
  expect(screen.getByTestId("oh-exam-answers-export-confirm")).toHaveAttribute("aria-disabled", "true");
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
      family="exam"
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
