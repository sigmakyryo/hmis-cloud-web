import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/clinical-opd/pages/ClinicalQueuePage", () => ({
  ClinicalQueuePage: ({
    routing,
  }: {
    routing: { specialty: { code: string; basePath: string } };
  }) => (
    <div>
      queue:{routing.specialty.code}:{routing.specialty.basePath}
    </div>
  ),
}));

import { TheatreQueuePage } from "@/features/clinical-theatre/pages/TheatreQueuePage";

describe("TheatreQueuePage", () => {
  it("renders the shared clinical queue for the theatre specialty", () => {
    render(<TheatreQueuePage />);
    expect(screen.getByText("queue:theatre:/clinical/theatre")).toBeTruthy();
  });
});
