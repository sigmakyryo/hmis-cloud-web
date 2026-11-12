import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let capabilities: string[] = [];

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

vi.mock("@/features/clinical-opd/hooks/use-clinical-opd", () => ({
  useMyClinicalCapabilities: () => ({ data: { capabilities } }),
}));

vi.mock("@/features/clinical-theatre/components/TheatreCrashCaseDialog", () => ({
  TheatreCrashCaseDialog: () => <button type="button">Crash case</button>,
}));

import { TheatreQueuePage } from "@/features/clinical-theatre/pages/TheatreQueuePage";

afterEach(() => cleanup());

describe("TheatreQueuePage", () => {
  it("renders the shared clinical queue for the theatre specialty", () => {
    capabilities = [];
    render(<TheatreQueuePage />);
    expect(screen.getByText("queue:theatre:/clinical/theatre")).toBeTruthy();
    expect(screen.queryByText("Crash case")).toBeNull();
  });

  it("offers the crash case button to users who may start one", () => {
    capabilities = ["start_theatre_crash_case"];
    render(<TheatreQueuePage />);
    expect(screen.getByText("Crash case")).toBeTruthy();
  });
});
