import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import type { ExamTemplateSnapshot } from "@/features/occupational-health/lib/exam-template-snapshot";

afterEach(cleanup);

const snapshot: ExamTemplateSnapshot = {
  schema_version: 3,
  sections: [
    {
      code: "IMMUNIZATIONS",
      name: "Immunizations",
      content_mode: "direct",
      selection_mode: "inclusive",
      is_mandatory: false,
      response_fields: [
        {
          code: "TETANUS_VACCINE",
          label: "Tetanus vaccine",
          response_type: "text",
        },
      ],
      items: [],
    },
    {
      code: "RESPIRATORY",
      name: "Respiratory",
      content_mode: "direct",
      selection_mode: "inclusive",
      is_mandatory: false,
      response_fields: [
        {
          code: "SPIROMETRY",
          label: "Spirometry",
          response_type: "text",
        },
      ],
      items: [],
    },
  ],
};

describe("exam capture dedicated-page review", () => {
  it("flags immunization fields and leaves clinical fields alone", () => {
    render(<OhExamTemplateCaptureForm snapshot={snapshot} onChange={vi.fn()} />);
    const flags = screen.getAllByTestId("oh-form-review-flag");
    expect(flags.length).toBeGreaterThanOrEqual(1);
    expect(flags[0]).toHaveTextContent("Immunizations are recorded on the Immunizations page");
    expect(flags[0]).toHaveTextContent("Remove this field and record doses on the Immunizations page");
    expect(flags[0].querySelector("a")).toHaveAttribute("href", "/occupational-health/immunizations");
    expect(screen.getByText("Spirometry")).toBeInTheDocument();
    expect(screen.queryByText("Spirometry")?.closest("div")?.querySelector("[data-testid=oh-form-review-flag]")).toBeNull();
    expect(screen.queryAllByText(/^Issue$/i)).toHaveLength(0);
    const icons = screen.getAllByTestId("oh-form-review-issue-icon");
    expect(icons.length).toBeGreaterThanOrEqual(1);
    for (const icon of icons) {
      expect(icon).toHaveAttribute("aria-label", "Issue");
    }
    for (const flag of flags) {
      expect(flag.querySelector("[data-testid=oh-form-review-issue-icon]")).toBeNull();
      expect(flag).not.toHaveTextContent(/^Issue$/);
      const messages = [...flag.querySelectorAll("p")].filter((paragraph) =>
        paragraph.className.includes("break-words"),
      );
      expect(messages.length).toBeGreaterThanOrEqual(1);
      for (const paragraph of messages) {
        expect(paragraph.className).toMatch(/whitespace-normal/);
        expect(paragraph.className).toMatch(/break-words/);
      }
    }
  });

  it("shows an employment issue once, with an icon on the title and wrapping text below", () => {
    const employment: ExamTemplateSnapshot = {
      schema_version: 3,
      sections: [
        {
          code: "HISTORY",
          name: "History",
          content_mode: "direct",
          selection_mode: "inclusive",
          is_mandatory: false,
          response_fields: [
            {
              code: "EMPLOYMENT_HISTORY",
              label: "Employment History",
              response_type: "text",
            },
          ],
          items: [],
        },
      ],
    };
    render(<OhExamTemplateCaptureForm snapshot={employment} onChange={vi.fn()} />);
    expect(screen.getByText("Employment History")).toBeInTheDocument();
    const flags = screen.getAllByTestId("oh-form-review-flag");
    expect(flags).toHaveLength(1);
    expect(flags[0]).toHaveTextContent("Employment is recorded on the Employment page; this field duplicates it.");
    expect(flags[0]).toHaveTextContent("Remove this field and record employment on the Employment page.");
    expect(flags[0].querySelector("a")).toHaveAttribute("href", "/occupational-health/employment");
    expect(screen.queryAllByText(/^Issue$/i)).toHaveLength(0);
    expect(flags[0].querySelector("[data-testid=oh-form-review-issue-icon]")).toBeNull();
    const icons = screen.getAllByTestId("oh-form-review-issue-icon");
    expect(icons).toHaveLength(1);
    expect(icons[0]).toHaveAttribute("aria-label", "Issue");
    const heading = screen.getByText("Employment History").closest("legend, h3, span, div");
    expect(heading?.querySelector("[data-testid=oh-form-review-issue-icon]") ?? icons[0].parentElement).toBeTruthy();
    const messages = [...flags[0].querySelectorAll("p")].filter((paragraph) =>
      paragraph.className.includes("break-words"),
    );
    expect(messages.length).toBeGreaterThanOrEqual(2);
    for (const paragraph of messages) {
      expect(paragraph.className).toMatch(/whitespace-normal/);
      expect(paragraph.className).toMatch(/break-words/);
    }
  });
});
