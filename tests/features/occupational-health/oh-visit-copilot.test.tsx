import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { OhCertificateForm } from "@/features/occupational-health/components/OhCertificateTabPanel";
import { OhCopilotResult } from "@/features/occupational-health/components/OhCopilotResult";
import { OhCertificateReadiness } from "@/features/occupational-health/components/OhCertificateReadiness";
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

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
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

it("checks the visit on open and marks each record area in the readiness rail", async () => {
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

  const onOpenPanel = vi.fn();
  const onUseDraft = vi.fn();
  renderWithQuery(
    <OhCertificateReadiness
      visitUuid="visit-1"
      gateWarnings={["HepB booster due"]}
      onOpenPanel={onOpenPanel}
      onUseDraft={onUseDraft}
    />,
  );

  expect(await screen.findByText("Two items are still open.")).toBeTruthy();
  expect(screen.getByTestId("oh-cof-check-fitness").getAttribute("data-state")).toBe("review");
  expect(screen.getByTestId("oh-cof-check-vaccine").getAttribute("data-state")).toBe("review");
  expect(screen.getByTestId("oh-cof-check-hearing").getAttribute("data-state")).toBe("clear");
  expect(screen.getByText("No medical on file.")).toBeTruthy();
  expect(screen.getByTestId("oh-cof-readiness-summary").textContent).toBe("2 to review");
  expect(screen.getByText("Not ready to certify.")).toBeTruthy();
  expect(screen.getByText("No night shift")).toBeTruthy();

  expect(screen.getAllByTestId(/^oh-cof-check-/).at(-1)?.getAttribute("data-testid")).toBe("oh-cof-check-exam");
  fireEvent.click(screen.getByRole("button", { name: "Open Fitness" }));
  expect(onOpenPanel).toHaveBeenCalledWith("fitness");

  fireEvent.click(screen.getByRole("button", { name: "Accept" }));
  expect(onUseDraft).toHaveBeenCalledWith({ wording: "Not ready to certify.", restrictions: ["No night shift"] });
  expect(screen.getByTestId("oh-cof-use-draft").textContent).toBe("Accepted");
});

it("marks vaccines blocked when the immunisation gate blocks the certificate", async () => {
  vi.mocked(fetchVisitBrief).mockResolvedValue({ refused: false, message: "", points: [], draft: {} });

  renderWithQuery(<OhCertificateReadiness visitUuid="visit-2" gateBlocked="Missing HepB series" />);

  await waitFor(() => expect(screen.getByTestId("oh-cof-check-fitness").getAttribute("data-state")).toBe("clear"));
  expect(screen.getByTestId("oh-cof-check-vaccine").getAttribute("data-state")).toBe("blocked");
  expect(screen.getByTestId("oh-imm-fitness-blocked").textContent).toContain("Missing HepB series");
  expect(screen.getByTestId("oh-cof-readiness-summary").textContent).toBe("Not ready");
  expect(screen.queryByTestId("oh-cof-draft")).toBeNull();
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

it("lets the clinician edit a suggestion before accepting and dismiss it", async () => {
  vi.mocked(fetchVisitBrief).mockResolvedValue({
    refused: false,
    message: "",
    points: [],
    draft: { wording: "Not ready to certify.", restrictions: ["No night shift"] },
  });

  const onUseDraft = vi.fn();
  renderWithQuery(<OhCertificateReadiness visitUuid="visit-3" onUseDraft={onUseDraft} />);

  expect(await screen.findByText("Not ready to certify.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const wording = screen.getByTestId("oh-cof-draft-edit-wording");
  fireEvent.change(wording, { target: { value: "Fit with limits." } });
  fireEvent.click(screen.getByRole("button", { name: "Accept" }));
  expect(onUseDraft).toHaveBeenCalledWith({ wording: "Fit with limits.", restrictions: ["No night shift"] });

  // Remount to test dismiss independently.
  cleanup();
  const onUseDraftAgain = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <OhCertificateReadiness visitUuid="visit-3" onUseDraft={onUseDraftAgain} />
    </QueryClientProvider>,
  );
  expect(await screen.findByRole("button", { name: "Dismiss" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  expect(screen.queryByTestId("oh-cof-draft")).toBeNull();
  expect(onUseDraftAgain).not.toHaveBeenCalled();
});

it("shows the assessment outcome as a readable group and does not auto-fill AI wording", async () => {
  vi.mocked(fetchVisitBrief).mockResolvedValue({
    refused: false,
    message: "",
    points: [],
    draft: { wording: "Auto wording.", restrictions: ["Auto limit"] },
  });

  renderWithQuery(
    <OhCertificateForm
      visitUuid="visit-4"
      onCreated={() => undefined}
      assessments={[
        {
          id: 4,
          uuid: "assessment-1",
          examination: 1,
          outcome: "fit_with_restrictions",
          assessed_at: "2026-11-01T00:00:00Z",
          review_date: null,
          clinician: 7,
        },
      ]}
    />,
  );

  const outcome = await screen.findByTestId("oh-cert-outcome");
  expect(outcome.textContent).toContain("Fit with restrictions");
  expect(outcome.querySelector('[data-selected="true"]')?.textContent).toBe("Fit with restrictions");
  expect(screen.getByLabelText("Certificate wording")).toHaveValue("");
  expect(screen.getByLabelText("Restrictions, one per line")).toHaveValue("");
  expect(await screen.findByText("Auto wording.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Accept" }));
  expect(screen.getByLabelText("Certificate wording")).toHaveValue("Auto wording.");
  expect(screen.getByLabelText("Restrictions, one per line")).toHaveValue("Auto limit");
});
