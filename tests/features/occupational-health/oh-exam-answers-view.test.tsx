import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { OhExamAnswersView } from "@/features/occupational-health/components/OhExamAnswersView";
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
          { key: "notes", label: "Notes", value: "Not recorded", empty: true, kind: "long", compact: false },
        ],
      },
    ],
  },
];

afterEach(cleanup);

it("renders section answers, a Completed badge and an Export PDF action", () => {
  const onEdit = vi.fn();
  render(
    <OhExamAnswersView
      heading="Periodic medical"
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
  expect(screen.getByText("Completed 13 Nov 2026, 08:30 by Dr Ada")).toBeVisible();
  expect(screen.getByText("Medical history")).toBeVisible();
  expect(screen.getByText("Presenting complaint")).toBeVisible();
  expect(screen.getAllByText("Cough").length).toBeGreaterThan(0);
  expect(screen.getAllByText("120 mmHg").length).toBeGreaterThan(0);
  expect(screen.getByText("No")).toBeVisible();
  expect(screen.queryByText("Not recorded")).toBeNull();
  expect(screen.getByRole("button", { name: "Show empty (1)" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Show empty (1)" }));
  expect(screen.getByText("Not recorded")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Hide empty fields" }));
  expect(screen.queryByText("Not recorded")).toBeNull();

  const pdf = screen.getByRole("link", { name: "Export PDF" });
  expect(pdf).toHaveAttribute(
    "href",
    "/api/occupational-health/oh-ext/oh-examinations/exam-1/pdf",
  );
  expect(pdf).toHaveAttribute("target", "_blank");
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
      },
    },
  };
  render(
    <OhExamAnswersView
      sections={examAnswerSections(snapshot, answers)}
      summary={examAnswerSummary(snapshot, answers, "cof")}
      testId="oh-cof-answers-view"
    />,
  );

  expect(screen.getByRole("heading", { name: "Certificate of fitness" })).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Restrictions, Review and Clinician Certification" }),
  ).toBeVisible();
  expect(screen.getByText("Role and duties covered by this certificate")).toBeVisible();
  expect(screen.getByText("ferf")).toBeVisible();
  expect(screen.queryByText("Selected")).toBeNull();
  expect(
    screen.queryByText("Restrictions, Review and Clinician Certification · Role and duties covered by this certificate"),
  ).toBeNull();
  expect(screen.getByTestId("oh-exam-answers-outcome")).toHaveTextContent("Fit with restrictions");
  expect(screen.getByTestId("oh-exam-answers-restrictions")).toHaveTextContent("No work at height");
});
