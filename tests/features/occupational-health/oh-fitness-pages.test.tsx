import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  audit: vi.fn(),
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
  fetchOhAudit: (...args: unknown[]) => mocks.audit(...args),
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

it("integrations shows the OH audit log to administrators", async () => {
  mocks.clients.mockResolvedValue([]);
  mocks.audit.mockResolvedValue([
    {
      uuid: "a1",
      module: "fitness",
      entity_type: "training_record",
      entity_uuid: null,
      action: "revoked",
      actor_type: "user",
      actor_name: "OH Admin",
      summary: "Training revoked: Working at height",
      meta: null,
      occurred_at: "2026-11-11T08:00:00Z",
    },
  ]);
  renderWith(<FitIntegrationsPage />);
  fireEvent.click(await screen.findByRole("button", { name: /Audit log/ }));
  expect(await screen.findByText("Training revoked: Working at height")).toBeTruthy();
  expect(screen.getByText("OH Admin")).toBeTruthy();
});

it("training courses tab offers example courses when empty", async () => {
  mocks.seed.mockResolvedValue({ created: 5 });
  renderWith(<FitTrainingPage />);
  fireEvent.click(screen.getByRole("button", { name: /Courses/ }));
  const buttons = await screen.findAllByRole("button", { name: "Load examples" });
  fireEvent.click(buttons[0]);
  await waitFor(() => expect(mocks.seed).toHaveBeenCalled());
});

it("visit panel shows a decision summary and grouped requirement cards", async () => {
  const onOpenPanel = vi.fn();
  renderWith(<OhFitnessVisitPanel customerUuid={CU} onOpenPanel={onOpenPanel} />);
  expect(await screen.findByTestId("oh-fit-verdict")).toHaveTextContent("Not fit");
  expect(mocks.worker).toHaveBeenCalledWith(CU);
  expect(screen.getByTestId("oh-fit-decision-badge")).toHaveTextContent("Not fit");
  expect(screen.getByTestId("oh-fit-summary-headline").textContent).toMatch(/required item/);
  expect(screen.getByTestId("oh-fit-progress-label").textContent).toContain("1 of 6 required done");
  expect(screen.queryByText("Holding this up")).toBeNull();
  expect(screen.queryByText("Checks on file")).toBeNull();

  expect(screen.getByTestId("oh-fit-needs-attention")).toBeTruthy();
  expect(screen.getByTestId("oh-fit-completed")).toBeTruthy();
  expect(screen.getByTestId("oh-fit-locked")).toBeTruthy();

  const medical = screen.getByTestId("oh-fit-check-medical");
  const training = screen.getByTestId("oh-fit-check-training");
  const fitTest = screen.getByTestId("oh-fit-check-fit_test");
  expect(medical.getAttribute("data-group")).toBe("completed");
  expect(medical.textContent).toContain("Medical: fit");
  expect(training.getAttribute("data-group")).toBe("needs_attention");
  expect(training.textContent).toContain("Blocking");
  expect(training.textContent).toContain("Training missing: Working at height");
  expect(training.getAttribute("data-blocker")).toBe("true");
  expect(fitTest.getAttribute("data-group")).toBe("needs_attention");
  expect(fitTest.textContent).toContain("Nothing recorded yet");

  expect(screen.queryByTestId("oh-fit-restrictions")).toBeNull();
  expect(screen.queryByText("No work at height")).toBeNull();
  expect(screen.getByTestId("oh-fit-areas").textContent).toContain("Laboratories");

  fireEvent.click(within(medical).getByRole("button", { name: "View" }));
  expect(onOpenPanel).toHaveBeenCalledWith("medical-examinations");
  expect(
    within(screen.getByTestId("oh-fit-check-certificate")).getByRole("button", { name: "Open certificate" }),
  ).toBeDisabled();
  expect(
    within(screen.getByTestId("oh-fit-check-fit_test")).getByRole("link", { name: /Open fit-test board/ }),
  ).toHaveAttribute("href", "/fitness/board");
  expect(
    within(training).getByRole("link", { name: /Open training system/ }),
  ).toHaveAttribute("href", "/fitness/training");
});
it("visit panel shows certificate history at the bottom and a download when it is issued", async () => {
  mocks.worker.mockResolvedValue({
    ...WORKER,
    overall: "fit",
    reasons: [],
    restrictions: [],
    items: [
      { source: "medical", label: "Medical", status: "ok", message: "Medical: fit", expires_on: "2027-01-01", restriction: null },
    ],
    role_clearance: { job_title: "Rigger", status: "cleared" },
  });
  const onOpenPanel = vi.fn();
  const certificates = [
    {
      id: 2,
      uuid: "cert-2",
      assessment: 10,
      version: 2,
      status: "issued",
      valid_from: "2026-01-01",
      valid_to: "2027-01-01",
      signed_at: "2026-01-02T08:00:00Z",
      signed_by: 7,
      payload: {},
      previous_certificate: 1,
      created_at: "2026-01-02T08:00:00Z",
      updated_at: "2026-01-02T08:00:00Z",
    },
    {
      id: 1,
      uuid: "cert-1",
      assessment: 10,
      version: 1,
      status: "superseded",
      valid_from: "2025-01-01",
      valid_to: "2026-01-01",
      signed_at: "2025-01-02T08:00:00Z",
      signed_by: 7,
      payload: {},
      previous_certificate: null,
      created_at: "2025-01-02T08:00:00Z",
      updated_at: "2026-01-02T08:00:00Z",
    },
  ];
  renderWith(
    <OhFitnessVisitPanel
      customerUuid={CU}
      onOpenPanel={onOpenPanel}
      certificates={certificates}
      assessments={[{ id: 10, uuid: "a1", examination: 1, outcome: "fit", assessed_at: "2026-01-02T08:00:00Z", review_date: null, clinician: 7 }]}
    />,
  );
  expect(await screen.findByTestId("oh-fit-verdict")).toHaveTextContent("Fit");
  expect(screen.getByTestId("oh-fit-download-certificate")).toHaveAttribute("href", expect.stringContaining("cert-2"));
  fireEvent.click(
    within(screen.getByTestId("oh-fit-check-certificate")).getByRole("button", { name: "Open certificate" }),
  );
  expect(onOpenPanel).toHaveBeenCalledWith("certificate");
  const history = screen.getByTestId("oh-fit-cert-history");
  const summary = screen.getByTestId("oh-fit-summary-card");
  expect(summary.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(history.textContent).toContain("v2");
  expect(history.textContent).toContain("v1");
  expect(history.textContent).toMatch(/Superseded/i);
  expect(screen.getByTestId("oh-fit-hero-meta").textContent).toMatch(/Issued/);
  expect(screen.getByTestId("oh-fit-hero-meta").textContent).toMatch(/v2/);
});

it("visit panel shows a Record medical exam CTA when nothing is on file", async () => {
  mocks.worker.mockResolvedValue({
    ...WORKER,
    overall: "unknown",
    reasons: [],
    restrictions: [],
    earliest_expiry: null,
    items: [],
    zones: [],
    role_clearance: { job_title: "", status: "unknown" },
  });
  const onOpenPanel = vi.fn();
  renderWith(<OhFitnessVisitPanel customerUuid={CU} onOpenPanel={onOpenPanel} />);
  expect(await screen.findByTestId("oh-fit-verdict")).toHaveTextContent("Not yet known");
  expect(screen.getByTestId("oh-fit-decision-badge")).toHaveTextContent("Decision pending");
  expect(screen.getByTestId("oh-fit-progress-label").textContent).toContain("0 of 6 required done");
  fireEvent.click(screen.getByTestId("oh-fit-summary-cta"));
  expect(onOpenPanel).toHaveBeenCalledWith("medical-examinations");
  fireEvent.click(within(screen.getByTestId("oh-fit-check-medical")).getByRole("button", { name: "Record exam" }));
  expect(onOpenPanel).toHaveBeenCalledWith("medical-examinations");
  expect(screen.queryByTestId("oh-fit-restrictions")).toBeNull();
  expect(screen.queryByTestId("oh-fit-check-iod")).toBeNull();
  expect(screen.queryByTestId("oh-fit-cert-history")).toBeNull();
});

it("visit panel shows injury on duty in needs attention before the locked certificate", async () => {
  const onOpenPanel = vi.fn();
  renderWith(
    <OhFitnessVisitPanel
      customerUuid={CU}
      onOpenPanel={onOpenPanel}
      iod={{ status: null }}
    />,
  );
  const needs = await screen.findByTestId("oh-fit-needs-attention");
  const iod = within(needs).getByTestId("oh-fit-check-iod");
  const locked = screen.getByTestId("oh-fit-locked");
  const certificate = within(locked).getByTestId("oh-fit-check-certificate");
  expect(iod.compareDocumentPosition(certificate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(iod).toHaveTextContent("Not started");
  expect(iod).toHaveTextContent("Open to record the injury.");
  expect(screen.getByTestId("oh-fit-progress-label")).toHaveTextContent("1 of 6 required done");
  fireEvent.click(within(iod).getByRole("button", { name: "Open" }));
  expect(onOpenPanel).toHaveBeenCalledWith("injuries");
});
it("visit panel marks injury on duty recorded when a case exists", async () => {
  renderWith(<OhFitnessVisitPanel customerUuid={CU} iod={{ status: "under_review" }} />);
  const iod = await screen.findByTestId("oh-fit-check-iod");
  expect(iod).toHaveAttribute("data-status", "recorded");
  expect(iod).toHaveTextContent("Recorded");
  expect(iod).toHaveTextContent("Under review");
});

it("visit panel shows an error state when fitness cannot be loaded", async () => {
  mocks.worker.mockRejectedValue(new Error("Fitness service down"));
  renderWith(<OhFitnessVisitPanel customerUuid={CU} />);
  expect(await screen.findByText("Fitness service down")).toBeTruthy();
});
