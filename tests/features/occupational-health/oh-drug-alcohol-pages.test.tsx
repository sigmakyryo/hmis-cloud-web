import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { DaAuditPage } from "@/app/(app)/drug-alcohol/_components/audit/DaAuditPage";
import { DaDuePage } from "@/app/(app)/drug-alcohol/_components/due/DaDuePage";
import { DaMroPage } from "@/app/(app)/drug-alcohol/_components/mro/DaMroPage";
import { DaPoliciesPage } from "@/app/(app)/drug-alcohol/_components/policies/DaPoliciesPage";
import { DaRandomPage } from "@/app/(app)/drug-alcohol/_components/random/DaRandomPage";
import { DaReportsPage } from "@/app/(app)/drug-alcohol/_components/reports/DaReportsPage";
import { DaRtdPage } from "@/app/(app)/drug-alcohol/_components/rtd/DaRtdPage";
import { DaTestsPage } from "@/app/(app)/drug-alcohol/_components/tests/DaTestsPage";
import { OhDrugAlcoholVisitPanel } from "@/features/occupational-health/components/OhDrugAlcoholVisitPanel";
import { BffError } from "@/lib/bff-client";

const mocks = vi.hoisted(() => ({
  due: vi.fn(),
  notify: vi.fn(),
  mro: vi.fn(),
  panel: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/drug-alcohol/due",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/providers/toast-provider", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/features/occupational-health/services/drug-alcohol.service", () => ({
  fetchDaDue: (...args: unknown[]) => mocks.due(...args),
  notifyDaSelection: (...args: unknown[]) => mocks.notify(...args),
  noShowDaSelection: vi.fn(),
  excuseDaSelection: vi.fn(),
  fetchDaTests: vi.fn(async () => ({ results: [], count: 0 })),
  fetchDaTest: vi.fn(),
  downloadDaCcf: vi.fn(),
  downloadDaLetter: vi.fn(),
  fetchDaMroQueue: (...args: unknown[]) => mocks.mro(...args),
  recordDaMroInterview: vi.fn(),
  verifyDaMro: vi.fn(),
  requestDaSplit: vi.fn(),
  recordDaSplitResult: vi.fn(),
  fetchDaPools: vi.fn(async () => []),
  fetchDaDraws: vi.fn(async () => []),
  fetchDaCompliance: vi.fn(async () => []),
  fetchDaPolicies: vi.fn(async () => []),
  fetchDaPolicy: vi.fn(),
  createDaPolicy: vi.fn(),
  publishDaPolicy: vi.fn(),
  seedDaPolicies: vi.fn(),
  createDaPool: vi.fn(),
  previewDaPool: vi.fn(),
  drawDaPool: vi.fn(),
  fetchDaRtdCases: vi.fn(async () => []),
  recordDaSapStep: vi.fn(),
  fetchDaReport: vi.fn(async () => ({
    from: "2026-01-01",
    to: "2026-11-10",
    k_threshold: 5,
    totals: { tests: 3, verified: 2, in_progress: 1, cancelled: 0, refusals: null, non_negative: null, positivity_rate: null },
    by_reason: [{ group: "random", tests: 3, verified: 2, non_negative: null, rate: null, suppressed: true }],
    by_employer: [],
    by_month: [],
    by_substance: [],
    turnaround_hours: { collection_to_verified: 26.5, lab_order_to_result: null, mro_review: null },
    random_compliance: [],
  })),
  downloadDaReportCsv: vi.fn(),
  fetchDaAudits: vi.fn(async () => []),
  fetchDaNotifications: vi.fn(async () => []),
  runDaRetention: vi.fn(),
  fetchDaVisitPanel: (...args: unknown[]) => mocks.panel(...args),
  startDaTest: vi.fn(),
  recordDaConsent: vi.fn(),
  recordDaCustody: vi.fn(),
  recordDaShy: vi.fn(),
  recordDaAlcohol: vi.fn(),
  recordDaScreen: vi.fn(),
  recordDaRefusal: vi.fn(),
  cancelDaTest: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.due.mockResolvedValue({ rows: [], counts: { total: 0, overdue: 0, mro_pending: 0 } });
  mocks.mro.mockResolvedValue([]);
});

function renderPage(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

it("due page is standalone and shows the empty state", async () => {
  renderPage(<DaDuePage />);
  expect(screen.getByTestId("oh-da-due-page")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Due & overdue" })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("Nothing due")).toBeVisible());
});

it("due page lists a random pick and can notify the worker", async () => {
  mocks.due.mockResolvedValue({
    rows: [
      {
        kind: "random",
        uuid: "sel-11111111",
        customer_uuid: "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f",
        customer_initials: "J.D.",
        label: "Random drug test",
        due_at: null,
        status: "selected",
        links: { random_selection_uuid: "sel-11111111" },
      },
    ],
    counts: { total: 1, overdue: 0, random: 1, mro_pending: 0 },
  });
  mocks.notify.mockResolvedValue({});
  renderPage(<DaDuePage />);
  await waitFor(() => expect(screen.getByText("Random drug test")).toBeVisible());
  fireEvent.click(screen.getByRole("button", { name: "Notify" }));
  await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith("sel-11111111"));
});

it("MRO page explains when the user is not a medical review officer", async () => {
  mocks.mro.mockRejectedValue(new BffError("Forbidden", 403));
  renderPage(<DaMroPage />);
  await waitFor(() =>
    expect(screen.getByText("Only the medical review officer (MRO) can open this list.")).toBeVisible(),
  );
});

it("other pages render standalone without crashing", async () => {
  const pages: Array<[ReactElement, string]> = [
    [<DaTestsPage key="t" />, "oh-da-tests-page"],
    [<DaRandomPage key="r" />, "oh-da-random-page"],
    [<DaRtdPage key="rtd" />, "oh-da-rtd-page"],
    [<DaPoliciesPage key="p" />, "oh-da-policies-page"],
    [<DaAuditPage key="a" />, "oh-da-audit-page"],
  ];
  for (const [ui, testId] of pages) {
    const { unmount } = renderPage(ui);
    expect(screen.getByTestId(testId)).toBeVisible();
    unmount();
  }
});

it("reports hide small numbers", async () => {
  renderPage(<DaReportsPage />);
  await waitFor(() => expect(screen.getByText(/Numbers below 5 are hidden/)).toBeVisible());
  expect(screen.getAllByText("Hidden").length).toBeGreaterThan(0);
});

it("visit panel shows the breath alcohol wait countdown", async () => {
  const soon = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const later = new Date(Date.now() + 25 * 60 * 1000).toISOString();
  mocks.panel.mockResolvedValue({
    visit_uuid: "visit-1234",
    customer_uuid: "cust-1234",
    policy: {
      uuid: "pol-1",
      name: "Workplace example",
      version: 1,
      reasons: ["pre_employment", "random"],
      specimen_types: ["urine", "breath"],
      panel: [{ code: "THC", name: "Cannabis" }],
      alcohol: { unit: "g/210L" },
      collection: {},
      is_example: true,
    },
    status: null,
    tests: [
      {
        uuid: "test-1234",
        reference: "DA-ABC123",
        customer_initials: "J.D.",
        reason: "random",
        specimen_types: ["breath"],
        status: "awaiting_alcohol_confirm",
        consent_given: true,
        id_verified: true,
        id_method: "photo_id",
        custody: { limits: { temp_min_c: 32, temp_max_c: 38, temp_read_within_minutes: 4 }, observed: false, split_specimen: false },
        shy: { type: "", started_at: null, deadline_at: null, ended_at: null, outcome: "", max_fluid_oz: 40, lung_attempts: 3 },
        alcohol: {
          outcome: "pending_confirm",
          screen_value: 0.03,
          confirm_value: null,
          confirm_earliest_at: soon,
          confirm_latest_at: later,
          unit: "g/210L",
        },
        screen_outcome: "",
        poct_results: [],
        fitness_outcome: "pending",
        created_at: null,
      },
    ],
    open: { random_selections: [], followups: [], rtd_cases: [] },
    refusal_reasons: ["refused_to_test"],
    can_view_results: false,
  });
  renderPage(<OhDrugAlcoholVisitPanel customerUuid="cust-1234" encounterUuid="enc-1234" />);
  await waitFor(() => expect(screen.getByTestId("oh-da-active-test")).toBeVisible());
  expect(screen.getByText(/Confirm in/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Save confirmation" })).toBeDisabled();
});
