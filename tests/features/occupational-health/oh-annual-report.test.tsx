import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ report: vi.fn(), employers: vi.fn(), trend: vi.fn() }));

vi.mock("@/lib/server/oh-service", () => ({ OH_SERVICE_URL: "http://ohs.test/api", ohServiceRequest: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: vi.fn() }));
vi.mock("@/features/occupational-health/services/oh.service", () => ({ fetchOhEmployers: () => mocks.employers() }));
vi.mock("@/features/occupational-health/services/oh-annual-report.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/occupational-health/services/oh-annual-report.service")>();
  return { ...actual, fetchAnnualReport: (...a: unknown[]) => mocks.report(...a), fetchAnnualTrend: (...a: unknown[]) => mocks.trend(...a) };
});

import { OhAnnualReportPage } from "@/features/occupational-health/pages/OhAnnualReportPage";
import { customPeriodError, sectionChartRows, toNumber, yoyDelta } from "@/features/occupational-health/components/annual/annual-utils";
import { annualReportFileUrl, portalAnnualFileUrl } from "@/features/occupational-health/services/oh-annual-report.service";
import { BffError } from "@/lib/bff-client";
import { employerPortalProxy } from "@/lib/server/employer-portal-bff";
import { ohAnnualReportProxy } from "@/lib/server/oh-annual-report-bff";

const ACME = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const REPORT = {
  year: 2025,
  period: { from: "2025-01-01", to: "2025-12-31", custom: false, label: "2025" },
  audience: "employer",
  employer: null,
  generated_at: "2026-01-01T00:00:00+02:00",
  suppression: "Counts from 1 to 4 are shown as <5.",
  sections: {
    workforce: { "Workers on file during the year": 120 },
    medicals: { Examinations: 90, "Examinations: periodic": 60, "Examinations: pre_employment": 28, "Examinations: exit": "<5" },
    injuries: { "Injury on duty cases": 6, "Work-related": 6, "Days lost": "<5" },
    sick_leave: {},
  },
};
const TREND = {
  audience: "employer",
  employer: null,
  series: [
    { year: 2024, workers: 100, examinations: 70, certificates: 50, surveillance_completion: 80, iod_cases: 9, days_lost: 20, sick_leave_days: 40, da_tests: 10 },
    { year: 2025, workers: 120, examinations: 90, certificates: 60, surveillance_completion: 85, iod_cases: 6, days_lost: "<5", sick_leave_days: 35, da_tests: 12 },
  ],
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <OhAnnualReportPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.employers.mockResolvedValue([{ uuid: ACME, name: "Acme" }]);
  mocks.report.mockResolvedValue(REPORT);
  mocks.trend.mockResolvedValue(TREND);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("annual report", () => {
  it("builds the report for the chosen employer and audience", async () => {
    renderPage();
    expect(await screen.findByText("Injury on duty")).toBeTruthy();
    expect(screen.getAllByText("<5").length).toBeGreaterThan(0);
    expect(screen.getByText("Nothing recorded.")).toBeTruthy();
    expect(screen.getByText(/Employer copy · small counts hidden/)).toBeTruthy();
    await screen.findByRole("option", { name: "Acme" });
    fireEvent.change(screen.getByLabelText("Employer"), { target: { value: ACME } });
    fireEvent.click(screen.getByRole("radio", { name: "Regulator copy" }));
    await waitFor(() =>
      expect(mocks.report).toHaveBeenLastCalledWith(expect.objectContaining({ employer_uuid: ACME, audience: "regulator" })),
    );
    expect(mocks.trend).toHaveBeenLastCalledWith(expect.objectContaining({ employer_uuid: ACME, audience: "regulator", years: 5 }));
    expect(screen.getByText(/layout is generic/)).toBeTruthy();
    expect(screen.getByTestId("oh-annual-pdf").getAttribute("href")).toContain(`employer_uuid=${ACME}`);
  });

  it("shows highlights with year-on-year deltas and keeps suppressed counts out of charts", async () => {
    renderPage();
    const exams = await screen.findByTestId("oh-annual-kpi-examinations");
    expect(within(exams).getByText("90")).toBeTruthy();
    expect(within(exams).getByLabelText(/\+20 vs 2024/)).toBeTruthy();
    const iod = screen.getByTestId("oh-annual-kpi-iod_cases");
    expect(within(iod).getByLabelText(/-3 vs 2024/)).toBeTruthy();
    // Days lost is "<5" this year: shown, but no delta is computed from it.
    const lost = screen.getByTestId("oh-annual-kpi-days_lost");
    expect(within(lost).getByText("<5")).toBeTruthy();
    expect(within(screen.getByTestId("annual-section-medicals")).getByText("1 small count is shown in the table only.")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Injury & absence" }));
    expect(await screen.findByText(/left as gaps/)).toBeTruthy();
  });

  it("switches to a custom period through the dialog and validates it", async () => {
    renderPage();
    await screen.findByText("Injury on duty");
    fireEvent.click(screen.getByRole("button", { name: /Change period/ }));
    const dialog = await screen.findByTestId("oh-annual-period-dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: "Custom range" }));
    fireEvent.change(within(dialog).getByLabelText("From"), { target: { value: "2025-07-01" } });
    fireEvent.change(within(dialog).getByLabelText("To"), { target: { value: "2025-03-01" } });
    expect(within(dialog).getByRole("alert").textContent).toMatch(/start date must be on or before/);
    expect(within(dialog).getByRole("button", { name: "Apply" })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("To"), { target: { value: "2026-06-30" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(mocks.report).toHaveBeenLastCalledWith(expect.objectContaining({ from: "2025-07-01", to: "2026-06-30" })),
    );
    expect(screen.getByTestId("oh-annual-csv").getAttribute("href")).toContain("from=2025-07-01&to=2026-06-30");
    expect(screen.getByTestId("oh-annual-csv").getAttribute("href")).not.toContain("year=");
  });

  it("explains a regulator 403 and offers the employer copy", async () => {
    mocks.report.mockImplementation((p: { audience?: string }) =>
      p.audience === "regulator" ? Promise.reject(new BffError("Forbidden", 403)) : Promise.resolve(REPORT),
    );
    renderPage();
    await screen.findByText("Injury on duty");
    fireEvent.click(screen.getByRole("radio", { name: "Regulator copy" }));
    expect(await screen.findByText("Only an administrator can produce the regulator summary.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show the employer copy" }));
    expect(await screen.findByText("Injury on duty")).toBeTruthy();
  });

  it("opens the PDF preview", async () => {
    renderPage();
    await screen.findByText("Injury on duty");
    fireEvent.click(screen.getByRole("button", { name: /Preview/ }));
    const dialog = await screen.findByTestId("oh-annual-preview-dialog");
    expect(within(dialog).getByTitle(/PDF preview/).getAttribute("src")).toContain("/annual/pdf?year=");
  });

  it("annual helpers treat <5 as not plottable and mirror the period rules", () => {
    expect(toNumber("<5")).toBeNull();
    expect(toNumber("85")).toBe(85);
    expect(yoyDelta("<5", 3)).toBeNull();
    expect(sectionChartRows("medicals", REPORT.sections.medicals)).toEqual({
      data: [
        { key: "Examinations: periodic", label: "periodic", value: 60 },
        { key: "Examinations: pre_employment", label: "pre_employment", value: 28 },
      ],
      hidden: 1,
    });
    expect(sectionChartRows("workforce", REPORT.sections.workforce).data).toEqual([]);
    expect(customPeriodError("2025-01-01", "2025-12-31", "2026-11-11")).toBeNull();
    expect(customPeriodError("2025-01-01", "2026-12-31", "2026-11-11")).toMatch(/future/);
    expect(customPeriodError("2020-01-01", "2025-12-31", "2026-11-11")).toMatch(/3 years/);
  });

  it("builds file links and proxies only read-only report paths", () => {
    expect(annualReportFileUrl({ year: 2025, audience: "employer" }, "pdf")).toBe(
      "/api/occupational-health/annual-reports/annual/pdf?year=2025&audience=employer",
    );
    expect(portalAnnualFileUrl(2025, "csv")).toBe("/api/employer-portal/annual-summary/csv?year=2025");
    expect(ohAnnualReportProxy.resolve("GET", ["annual", "pdf"])?.binary?.type).toBe("application/pdf");
    expect(ohAnnualReportProxy.resolve("POST", ["annual"])).toBeNull();
    expect(ohAnnualReportProxy.resolve("GET", ["annual", "trend"])).not.toBeNull();
    expect(employerPortalProxy.resolve("GET", ["annual-summary", "csv"])?.binary?.type).toContain("text/csv");
    expect(employerPortalProxy.resolve("GET", ["annual-summary"])?.binary).toBeNull();
  });
});
