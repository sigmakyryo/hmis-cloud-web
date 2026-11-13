import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { OhExamAnswersView } from "@/features/occupational-health/components/OhExamAnswersView";
import type { ExamAnswerSectionView } from "@/features/occupational-health/lib/exam-answers-display";

const sections: ExamAnswerSectionView[] = [
  {
    code: "history",
    name: "Medical history",
    rows: [
      { key: "complaint", label: "Presenting complaint", value: "Cough", empty: false },
      { key: "bp", label: "Blood pressure", value: "120 mmHg", empty: false },
      { key: "notes", label: "Notes", value: "Not recorded", empty: true },
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
  expect(screen.getByText("Cough")).toBeVisible();
  expect(screen.getByText("120 mmHg")).toBeVisible();
  expect(screen.getByText("Not recorded")).toBeVisible();

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
