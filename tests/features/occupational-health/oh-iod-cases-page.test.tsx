import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/features/occupational-health/services/oh.service", () => ({
  fetchIodCases: vi.fn(async () => [
    {
      id: 1,
      uuid: "iod-1",
      customer: 42,
      employment_episode: null,
      encounter: 9,
      she_reference: "SHE-1",
      severity: "moderate",
      lost_days: 2,
      status: "open",
      onset_date: "2026-11-10",
      mechanism: "slip",
      body_part: "right wrist",
      incident_location: "workshop",
      safety_classification: "medical_treatment",
      work_related: true,
      description: "Slipped on a wet floor.",
      created_at: "2026-11-10T08:00:00Z",
      updated_at: "2026-11-10T08:00:00Z",
    },
  ]),
  fetchOhEmployees: vi.fn(async () => ({ results: [], pagination: null })),
  createIodCase: vi.fn(),
  updateIodCase: vi.fn(),
  downloadIodStatutoryPack: vi.fn(),
}));

import { OhIodCasesPage } from "@/features/occupational-health/pages/OhIodCasesPage";

afterEach(() => {
  cleanup();
});

describe("OhIodCasesPage", () => {
  it("lists injury cases with edit and open actions", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <OhIodCasesPage />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("slip")).toBeTruthy();
    const open = screen.getByRole("link", { name: "Open" });
    expect(open.getAttribute("href")).toBe("/occupational-health/records/iod/iod-1");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("oh-iod-case-dialog")).toBeTruthy();
    expect(screen.getByTestId("oh-iod-form")).toBeTruthy();
  });
});
