import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { FitBoardPage } from "@/app/(app)/fitness/_components/board/FitBoardPage";
import { FitIntegrationsPage } from "@/app/(app)/fitness/_components/integrations/FitIntegrationsPage";
import { FitTrainingPage } from "@/app/(app)/fitness/_components/training/FitTrainingPage";
import { OhFitnessVisitPanel } from "@/features/occupational-health/components/OhFitnessVisitPanel";
import { BffError } from "@/lib/bff-client";

const mocks = vi.hoisted(() => ({
  board: vi.fn(),
  worker: vi.fn(),
  clients: vi.fn(),
  courses: vi.fn(),
  seed: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/fitness/board",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/occupational-health/services/fitness.service", () => ({
  fetchFitBoard: (...args: unknown[]) => mocks.board(...args),
  fetchFitWorker: (...args: unknown[]) => mocks.worker(...args),
  refreshFitness: vi.fn(async () => ({ refreshed: 2 })),
  fetchFitCourses: (...args: unknown[]) => mocks.courses(...args),
  createFitCourse: vi.fn(),
  updateFitCourse: vi.fn(),
  seedFitCourses: (...args: unknown[]) => mocks.seed(...args),
  fetchFitTraining: vi.fn(async () => []),
  recordFitTraining: vi.fn(),
  revokeFitTraining: vi.fn(),
  fetchFitClients: (...args: unknown[]) => mocks.clients(...args),
  createFitClient: vi.fn(),
  updateFitClient: vi.fn(),
  testFitClient: vi.fn(),
  fetchFitOutbox: vi.fn(async () => []),
}));

const CU = "11111111-2222-4333-8444-555555555555";
const WORKER = {
  customer_uuid: CU,
  worker_label: "Tom Miner",
  employee_number: "E100",
  employer_uuid: null,
  employer_name: "Acme",
  site: "North pit",
  department: "Plant",
  job_title: "Rigger",
  overall: "not_fit",
  reasons: [{ source: "training", status: "blocked", message: "Training missing: Working at height" }],
  restrictions: ["No work at height"],
  earliest_expiry: "2027-01-01",
  items: [
    { source: "medical", label: "Medical", status: "ok", message: "Medical: fit", expires_on: "2027-01-01", restriction: null },
    { source: "training", label: "Working at height", status: "blocked", message: "Training missing: Working at height", expires_on: null, restriction: null },
  ],
  zones: [{ code: "LAB", name: "Laboratories", status: "cleared", valid_until: "2027-01-01" }],
  role_clearance: { job_title: "Rigger", status: "not_cleared" },
  computed_at: "2026-11-10T05:00:00+02:00",
};

function renderWith(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.board.mockResolvedValue({
    counts: { fit: 3, fit_with_restrictions: 1, not_fit: 1, unknown: 0, due_soon: 2 },
    employers: [{ uuid: "e1", name: "Acme" }],
    sites: ["North pit"],
    results: [
      {
        customer_uuid: CU,
        worker_label: "Tom Miner",
        employee_number: "E100",
        employer_name: "Acme",
        site: "North pit",
        department: "Plant",
        job_title: "Rigger",
        overall: "not_fit",
        reason: "Training missing: Working at height",
        reason_count: 2,
        earliest_expiry: "2027-01-01",
        computed_at: null,
      },
    ],
  });
  mocks.worker.mockResolvedValue(WORKER);
  mocks.courses.mockResolvedValue([]);
});

afterEach(() => cleanup());

it("board shows status counts and opens the worker detail drawer", async () => {
  renderWith(<FitBoardPage />);
  expect(await screen.findByText("Tom Miner")).toBeTruthy();
  expect(screen.getAllByText("Not fit").length).toBeGreaterThan(0);
  expect(screen.getByText("+1 more")).toBeTruthy();
  fireEvent.click(screen.getByTestId("oh-fit-board-row"));
  expect(await screen.findByTestId("oh-fit-summary")).toBeTruthy();
  expect(screen.getByText("No work at height")).toBeTruthy();
  expect(screen.getByText("Laboratories")).toBeTruthy();
});

it("board filters pass the chosen status to the service", async () => {
  renderWith(<FitBoardPage />);
  await screen.findByText("Tom Miner");
  fireEvent.click(screen.getByRole("button", { name: /With restrictions/ }));
  await waitFor(() => expect(mocks.board).toHaveBeenLastCalledWith(expect.objectContaining({ status: "fit_with_restrictions" })));
});

it("integrations explains that only administrators can manage it", async () => {
  mocks.clients.mockRejectedValue(new BffError("Only an administrator can manage integrations.", 403));
  renderWith(<FitIntegrationsPage />);
  expect(await screen.findByText("Only an administrator can manage integrations.")).toBeTruthy();
  expect(screen.queryByText("Connect a system")).toBeNull();
});

it("training courses tab offers example courses when empty", async () => {
  mocks.seed.mockResolvedValue({ created: 5 });
  renderWith(<FitTrainingPage />);
  fireEvent.click(screen.getByRole("button", { name: /Courses/ }));
  const buttons = await screen.findAllByRole("button", { name: "Load examples" });
  fireEvent.click(buttons[0]);
  await waitFor(() => expect(mocks.seed).toHaveBeenCalled());
});

it("visit panel shows the fit-for-duty summary", async () => {
  renderWith(<OhFitnessVisitPanel customerUuid={CU} />);
  expect(await screen.findByText("Training missing: Working at height")).toBeTruthy();
  expect(mocks.worker).toHaveBeenCalledWith(CU);
  expect(screen.getByText("Not cleared until the items below are resolved.")).toBeTruthy();
  expect(screen.getByTestId("oh-fit-source-training").textContent).toContain("Working at height");
  expect(screen.getByTestId("oh-fit-source-medical").textContent).toContain("OK");
  expect(screen.getByTestId("oh-fit-source-fit_test").textContent).toContain("Not on file");
  expect(screen.getByText("Tom Miner")).toBeTruthy();
  expect(screen.getByRole("img", { name: /1 of 6 checks clear/ })).toBeTruthy();
  expect(screen.getByTestId("oh-fit-timeline").textContent).toContain("Medical");

  fireEvent.click(screen.getByTestId("oh-fit-source-medical").querySelector("button") as HTMLButtonElement);
  expect(screen.getByText("Medical: fit")).toBeTruthy();
});
