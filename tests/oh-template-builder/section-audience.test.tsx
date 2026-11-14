import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import {
  SectionAudienceToggle,
  sectionAudienceLabel,
  type SectionAudience,
} from "@/features/oh-template-builder/components/SectionAudienceToggle";
import { parseExamTemplateSnapshot } from "@/features/occupational-health/lib/exam-template-snapshot";

afterEach(cleanup);

function Harness({ initial = null as SectionAudience }) {
  const [value, setValue] = useState<SectionAudience>(initial);
  return (
    <>
      <SectionAudienceToggle value={value} onChange={setValue} />
      <output data-testid="value">{String(value)}</output>
    </>
  );
}

describe("SectionAudienceToggle", () => {
  it("offers Everyone, Male only and Female only and saves the choice", () => {
    render(<Harness />);
    expect(screen.getByRole("radio", { name: "Everyone" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Female only" }));
    expect(screen.getByTestId("value")).toHaveTextContent("female");
    expect(screen.getByText(/Hidden and not required for male workers/)).toBeInTheDocument();
  });

  it("is keyboard operable with arrow keys", () => {
    render(<Harness />);
    const group = screen.getByRole("radiogroup", { name: "Who sees this section" });
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(screen.getByTestId("value")).toHaveTextContent("male");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(screen.getByTestId("value")).toHaveTextContent("female");
  });

  it("labels restricted sections for the canvas badge", () => {
    expect(sectionAudienceLabel("male")).toBe("Male only");
    expect(sectionAudienceLabel("female")).toBe("Female only");
    expect(sectionAudienceLabel(null)).toBeNull();
  });
});

describe("capture filtering by worker sex", () => {
  const snapshot = {
    sections: [
      { library_section: { code: "identity", name: "Identity", content_mode: "direct", response_fields: [] } },
      { library_section: { code: "prostate", name: "Prostate", content_mode: "direct", applies_to_sex: "male", response_fields: [] } },
      { library_section: { code: "pregnancy", name: "Pregnancy", content_mode: "direct", applies_to_sex: "female", response_fields: [] } },
    ],
  };

  it("hides sections for the other sex", () => {
    const names = (sex: string) => parseExamTemplateSnapshot(snapshot, sex)?.sections.map((section) => section.name);
    expect(names("M")).toEqual(["Identity", "Prostate"]);
    expect(names("female")).toEqual(["Identity", "Pregnancy"]);
  });
});
