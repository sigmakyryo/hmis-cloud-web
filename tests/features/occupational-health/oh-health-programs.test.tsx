import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  seedReference: vi.fn(),
  due: vi.fn(),
  results: vi.fn(),
  record: vi.fn(),
  trend: vi.fn(),
  policies: vi.fn(),
  reports: vi.fn(),
  toast: vi.fn(),
  ohServiceRequest: vi.fn(),
  requireAccessToken: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/health-programs/due",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/server/oh-service", () => ({
  OH_SERVICE_URL: "http://ohs.test/api",
  ohServiceRequest: (...args: unknown[]) => mocks.ohServiceRequest(...args),
}));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: () => mocks.requireAccessToken() }));
vi.mock("@/lib/server/bff-response", () => ({
  bffSuccess: (data: unknown, status = 200) => Response.json(data, { status }),
  bffError: () => Response.json({ message: "error" }, { status: 500 }),
}));
vi.mock("@/features/occupational-health/services/health-programs.service", async (orig) => {
  const actual = await orig<typeof import("@/features/occupational-health/services/health-programs.service")>();
  return {
    HP_PROGRAMS: actual.HP_PROGRAMS,
    fetchHpDue: (...a: unknown[]) => mocks.due(...a),
    fetchHpResults: (...a: unknown[]) => mocks.results(...a),
    recordHpResult: (...a: unknown[]) => mocks.record(...a),
    fetchHpTrend: (...a: unknown[]) => mocks.trend(...a),
    voidHpResult: vi.fn(),
    fetchHpPolicies: (...a: unknown[]) => mocks.policies(...a),
    publishHpPolicy: vi.fn(),
    seedHpPolicies: vi.fn(),
    seedHpReferencePolicies: (...a: unknown[]) => mocks.seedReference(...a),
    fetchHpReports: (...a: unknown[]) => mocks.reports(...a),
  };
});

import { HpDuePage } from "@/app/(app)/health-programs/_components/due/HpDuePage";
import { HpPoliciesPage } from "@/app/(app)/health-programs/_components/policies/HpPoliciesPage";
import { HpProgramPage } from "@/app/(app)/health-programs/_components/program/HpProgramPage";
import { HpReportsPage } from "@/app/(app)/health-programs/_components/reports/HpReportsPage";
import { healthProgramsProxy } from "@/lib/server/health-programs-bff";

const CU = "11111111-2222-4333-8444-555555555555";

function result(over: Record<string, unknown> = {}) {
  return {
    uuid: `r-${Math.random()}`,
    customer_uuid: CU,
    worker_label: "Pat Fitter",
    program: "hearing",
    performed_at: "2026-11-01T08:00:00+02:00",
    is_baseline: false,
    data: {},
    computed: { average_234: { left: 28, right: 12 }, shift_db: { left: 18, right: 0 }, flags: ["sts", "recordable"] },
    outcome: "restricted",
    outcome_overridden: false,
    referral: true,
    restrictions: ["Must wear hearing protection; refit and retrain"],
    next_due_on: "2027-11-01",
    visit_uuid: null,
    billed: false,
    recorded_by_initials: "NN",
    notes: "",
    is_active: true,
    ...over,
  };
}

function renderWith(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccessToken.mockResolvedValue({ accessToken: "t" });
  mocks.due.mockResolvedValue({
    counts: { total: 1, overdue: 0, never: 1, due: 0, hearing: 1 },
    rows: [
      {
        customer_uuid: CU,
        worker_label: "Pat Fitter",
        employee_number: "E1",
        employer_name: "Acme",
        job_title: "Fitter",
        site: "Mill",
        program: "hearing",
        policy_uuid: "p1",
        policy_name: "Hearing conservation",
        due_on: "2026-11-10",
        state: "never",
        last_performed_at: null,
        last_outcome: null,
      },
    ],
  });
  mocks.results.mockResolvedValue([result()]);
  mocks.trend.mockResolvedValue({ program: "hearing", customer_uuid: CU, worker_label: "Pat Fitter", results: [result({ is_baseline: true, computed: { average_234: { left: 10, right: 10 } } }), result()] });
  mocks.record.mockResolvedValue(result());
  mocks.reports.mockResolvedValue({
    from: "2025-11-10",
    to: "2026-11-10",
    programs: [{ program: "hearing", label: "Hearing", tests: 4, workers: 3, fit: 3, restricted: 1, unfit: 0, referrals: 1, overdue: 2, flags: { sts: 1 }, by_month: [{ month: "2026-11", tests: 4, referrals: 1 }] }],
  });
});

afterEach(() => cleanup());

describe("health programmes", () => {
  it("BFF allows programme endpoints only", () => {
    expect(healthProgramsProxy.resolve("GET", ["workers", CU, "hearing"])?.path).toBe(`/oh-hp/workers/${CU}/hearing`);
    expect(healthProgramsProxy.resolve("GET", ["workers", CU, "teeth"])).toBeNull();
    expect(healthProgramsProxy.resolve("POST", ["results"])).not.toBeNull();
    expect(healthProgramsProxy.resolve("PATCH", ["results"])).toBeNull();
  });

  it("due list records a hearing result with both ears", async () => {
    renderWith(<HpDuePage />);
    expect(await screen.findByText("Pat Fitter")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    expect(await screen.findByTestId("oh-hp-form-hearing")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("L 2k"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("R 4k"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Save result" }));
    await waitFor(() => expect(mocks.record).toHaveBeenCalled());
    const body = mocks.record.mock.calls[0][0];
    expect(body).toMatchObject({ program: "hearing", customer_uuid: CU, policy_uuid: "p1" });
    expect(body.data.left["2000"]).toBe(20);
    expect(body.data.right["4000"]).toBe(25);
  });

  it("programme page shows findings and opens the trend chart", async () => {
    renderWith(<HpProgramPage program="hearing" />);
    expect(await screen.findByText(/shift L 18/)).toBeTruthy();
    expect(screen.getByText("Hearing shift, Recordable shift")).toBeTruthy();
    fireEvent.click(screen.getByTestId("oh-hp-result-row"));
    expect(await screen.findByTestId("oh-hp-trend-chart")).toBeTruthy();
  });

  it("reports list each programme", async () => {
    renderWith(<HpReportsPage />);
    expect(await screen.findByText("Hearing")).toBeTruthy();
    expect(screen.getByText("Hearing shift 1")).toBeTruthy();
  });
});

it("policies page loads the cited reference standards", async () => {
  mocks.policies.mockResolvedValue([]);
  mocks.seedReference.mockResolvedValue({ created: 6, results: [] });
  renderWith(<HpPoliciesPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Load reference standards" }));
  await waitFor(() => expect(mocks.seedReference).toHaveBeenCalled());
  expect(healthProgramsProxy.resolve("POST", ["policies", "seed-reference"])).not.toBeNull();
  expect(healthProgramsProxy.resolve("GET", ["reference-standards"])).not.toBeNull();
});
