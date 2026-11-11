import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { OhCompliancePage } from "@/features/occupational-health/pages/OhCompliancePage";

const ext = vi.hoisted(() => ({
  fetchComplianceInsights: vi.fn(),
  fetchCancellationReport: vi.fn(),
  cancellationReportCsvUrl: vi.fn(() => "/api/occupational-health/oh-ext/oh/reports/visit-cancellations/csv?from=x"),
}));
const oh = vi.hoisted(() => ({
  downloadOhComplianceExtract: vi.fn(),
  fetchOhExamBatteryRules: vi.fn(),
  fetchOhHazardProfiles: vi.fn(),
  createOhExamBatteryRule: vi.fn(),
  updateOhExamBatteryRule: vi.fn(),
  runOhSurveillanceSchedule: vi.fn(),
}));
const dash = vi.hoisted(() => ({ data: undefined as unknown, error: null as unknown, isLoading: false }));
const user = vi.hoisted(() => ({ groups: ["OccupationalHealth"] as string[] }));
const toast = vi.hoisted(() => vi.fn());

vi.mock("@/features/occupational-health/services/oh-ext.service", () => ext);
vi.mock("@/features/occupational-health/services/oh.service", () => oh);
vi.mock("@/providers/toast-provider", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/providers/user-provider", () => ({
  useUser: () => ({ isLoading: false, userData: { groups: user.groups, enabled_modules: ["OccupationalHealth"] } }),
}));
vi.mock("@/features/occupational-health/hooks/use-occupational-health", () => ({
  useOhComplianceDashboard: () => ({ ...dash, isFetching: false, refetch: vi.fn() }),
}));

const INSIGHTS = {
  generated_at: "2026-11-11T00:00:00Z",
  months: 12,
  totals: { open: 9, due: 6, overdue: 3, completed: 40, waived: 1 },
  compliance: { rate_3m: 84.2, rate_prev_3m: 80, rate_period: 82 },
  completed: { last_30_days: 12, previous_30_days: 9 },
  due_windows: { overdue_30_plus: 1, overdue: 2, next_7: 1, next_30: 3, next_90: 2, later: 0 },
  trend: [{ month: "2026-10", label: "Oct 2026", due: 10, completed: 8, open: 2, waived: 0, rate: 80 }],
  by_exam: [],
  by_site: [{ key: "Plant A", due: 1, overdue: 1, total: 2 }],
  by_department: [{ key: "Mill", due: 2, overdue: 0, total: 2 }],
  by_hazard_profile: [{ key: "Noise zone", due: 3, overdue: 2, total: 5 }],
  by_employer: [{ key: "Acme", due: 4, overdue: 1, total: 5 }],
};

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OhCompliancePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  user.groups = ["OccupationalHealth"];
  dash.data = { open_episodes: 120, due: 6, overdue: 3, due_within_30_days: 4, fitness_validity_alerts: 2 };
  dash.error = null;
  ext.fetchComplianceInsights.mockResolvedValue(INSIGHTS);
  ext.fetchCancellationReport.mockResolvedValue({
    from: "2026-08-01", to: "2026-11-11", total_visits: 0, cancelled: 0, no_show: 0, no_show_rate: null,
    by_reason: [], by_month: [], by_visit_type: {}, by_employer: {}, rows: [],
  });
  oh.fetchOhExamBatteryRules.mockResolvedValue([]);
  oh.fetchOhHazardProfiles.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("shows KPIs from the dashboard and insights with the compliance delta", async () => {
  renderPage();
  expect(screen.getByTestId("oh-compliance-page")).toBeInTheDocument();
  expect(within(screen.getByTestId("oh-compliance-metric-overdue")).getByText("3")).toBeInTheDocument();
  expect(within(screen.getByTestId("oh-compliance-metric-open_episodes")).getByText("120")).toBeInTheDocument();
  const rate = screen.getByTestId("oh-compliance-metric-rate");
  expect(await within(rate).findByText("84%")).toBeInTheDocument();
  expect(within(rate).getByLabelText(/\+4\.2 pts vs prior 3/)).toBeInTheDocument();
  expect(ext.fetchComplianceInsights).toHaveBeenCalledWith(12);
  expect(screen.getByText("Exam battery rules")).toBeInTheDocument();
  expect(screen.getByTestId("oh-cancellations-report")).toBeInTheDocument();
});

it("has no page header and keeps refresh, rules and export in a toolbar", async () => {
  renderPage();
  expect(screen.queryByText(/How well medical surveillance keeps up/)).toBeNull();
  expect(screen.getByRole("heading", { level: 1, name: "Compliance" }).className).toContain("sr-only");
  const toolbar = screen.getByRole("toolbar", { name: "Compliance actions" });
  expect(within(toolbar).getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  expect(within(toolbar).getByRole("link", { name: /Rules/ }).getAttribute("href")).toBe("#oh-exam-battery-rules");
  expect(within(toolbar).getByRole("button", { name: /Export/ })).toBeInTheDocument();
  expect(screen.getByTestId("oh-compliance-metric-overdue").className).not.toMatch(/\bborder\b|rounded-xl|shadow/);
  expect(document.getElementById("oh-exam-battery-rules")).not.toBeNull();
});

it("switches the trend period and the breakdown dimension", async () => {
  renderPage();
  await screen.findByText("84%");
  fireEvent.click(screen.getByRole("radio", { name: "24 mo" }));
  await waitFor(() => expect(ext.fetchComplianceInsights).toHaveBeenCalledWith(24));
  const breakdown = screen.getByTestId("oh-compliance-breakdown");
  expect(within(breakdown).getByText(/Noise zone/)).toBeInTheDocument();
  fireEvent.click(within(breakdown).getByRole("radio", { name: "Employer" }));
  expect(await within(breakdown).findByText(/Acme/)).toBeInTheDocument();
});

it("downloads the compliance extract from the export dialog", async () => {
  oh.downloadOhComplianceExtract.mockResolvedValue({ blob: new Blob(["a"]), filename: "x.csv" });
  const createUrl = vi.fn(() => "blob:x");
  Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: /Export/ }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByText("Compliance extract (CSV)"));
  const go = within(dialog).getAllByRole("button").find((b) => /download|export/i.test(b.textContent ?? "") && b.textContent !== "Export");
  fireEvent.click(go!);
  await waitFor(() => expect(oh.downloadOhComplianceExtract).toHaveBeenCalled());
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Compliance CSV downloaded" })));
  click.mockRestore();
});

it("shows an error with retry when the dashboard fails, and denies users without access", async () => {
  dash.data = undefined;
  dash.error = new Error("boom");
  renderPage();
  expect(screen.getByRole("alert")).toHaveTextContent(/Could not load compliance dashboard/);
  cleanup();
  user.groups = [];
  renderPage();
  expect(screen.queryByText("Exam battery rules")).toBeNull();
});
