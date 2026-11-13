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
  });
});
