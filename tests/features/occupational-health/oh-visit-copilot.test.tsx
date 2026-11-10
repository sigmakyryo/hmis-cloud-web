import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { OhCertificateForm } from "@/features/occupational-health/components/OhCertificateTabPanel";
import { OhCopilotResult } from "@/features/occupational-health/components/OhCopilotResult";
import { OhVisitCopilot } from "@/features/occupational-health/components/OhVisitCopilot";
import { createFitnessCertificate } from "@/features/occupational-health/services/oh.service";
import { fetchVisitBrief } from "@/features/occupational-health/services/visit-copilot.service";
import type { CopilotResponse } from "@/features/occupational-health/services/visit-copilot.service";

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/providers/user-provider", () => ({
  useUser: () => ({ userData: { id: 7 } }),
}));

vi.mock("@/features/occupational-health/services/oh.service", () => ({
  createFitnessCertificate: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/features/occupational-health/services/visit-copilot.service", () => ({
  fetchVisitBrief: vi.fn(),
  askVisitCopilot: vi.fn(),
}));

afterEach(cleanup);

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const RESULT: CopilotResponse = {
  refused: false,
  message: "Open items",
  points: [
    {
      fact_id: "fitness-overall",
      source: "fitness",
      label: "Fitness unknown",
      panel: "fitness",
      text: "No medical on file.",
    },
    {
      fact_id: "ghost",
      source: "invented",
      label: "Ghost",
      panel: "",
      text: "Should not show.",
    },
  ],
  draft: {
    vaccine_code: "HEPB",
    status: "overdue",
    doses_received: 1,
    doses_required: 3,
    next_due_date: "2026-12-01",
    clinician_explanation: "Give dose 2 on 2099-01-01.",
  },
};

it("shows the visit check and write-up without a question first", async () => {
  vi.mocked(fetchVisitBrief).mockResolvedValue({
    refused: false,
    message: "Two items are still open.",
    points: [
      {
        fact_id: "fitness-overall",
        source: "fitness",
        label: "Fitness unknown",
        panel: "fitness",
        text: "No medical on file.",
      },
    ],
    draft: { wording: "Not ready to certify.", restrictions: ["No night shift"] },
  });

  renderWithQuery(<OhVisitCopilot visitUuid="visit-1" />);

  expect(await screen.findByText("Two items are still open.")).toBeTruthy();
  expect(screen.getByText("No medical on file.")).toBeTruthy();
  expect(screen.getByText(/Not ready to certify/)).toBeTruthy();
  expect(screen.getByText(/No night shift/)).toBeTruthy();
});

it("renders only points that cite a known source and shows the service due date", () => {
  render(<OhCopilotResult result={RESULT} />);

  expect(screen.getByText("No medical on file.")).toBeTruthy();
  expect(screen.queryByText("Should not show.")).toBeNull();
  expect(screen.getByText("2026-12-01")).toBeTruthy();
});

it("issues a certificate with the accepted wording and restrictions", async () => {
  renderWithQuery(
    <OhCertificateForm
      onCreated={() => undefined}
      assessments={[
        {
          id: 4,
          uuid: "assessment-1",
          examination: 1,
          outcome: "fit",
          assessed_at: "2026-11-01T00:00:00Z",
          review_date: null,
          clinician: 7,
        },
      ]}
    />,
  );

  fireEvent.change(screen.getByLabelText("Certificate wording"), { target: { value: "Fit with limits." } });
  fireEvent.change(screen.getByLabelText("Restrictions, one per line"), {
    target: { value: "No night shift\nNo heights" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Issue certificate" }));

  await waitFor(() => {
    expect(createFitnessCertificate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          outcome: "fit",
          restrictions: ["No night shift", "No heights"],
          wording: "Fit with limits.",
        },
      }),
    );
  });
});
