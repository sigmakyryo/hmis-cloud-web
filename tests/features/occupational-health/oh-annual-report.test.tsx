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
import { rangeToPeriod } from "@/features/occupational-health/components/annual/OhAnnualPeriodPicker";
import { rowLabel } from "@/features/occupational-health/components/AnnualReportSections";
import { areaLayout, tickCounts } from "@/features/occupational-health/components/annual/annual-areas";
import { annualChanges, describeChange, rankChanges } from "@/features/occupational-health/components/annual/annual-changes";
import { breakdownShares, customPeriodError, sectionChartRows, toNumber, yoyDelta } from "@/features/occupational-health/components/annual/annual-utils";
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
    expect(screen.queryByTestId("oh-annual-copy-hint")).toBeNull();
    fireEvent.keyDown(await screen.findByRole("combobox", { name: "Employer" }), { key: "Enter" });
    fireEvent.keyDown(await screen.findByRole("option", { name: "Acme" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("radio", { name: "Regulator copy" }));
    await waitFor(() =>
      expect(mocks.report).toHaveBeenLastCalledWith(expect.objectContaining({ employer_uuid: ACME, audience: "regulator" })),
    );
    expect(mocks.trend).toHaveBeenLastCalledWith(expect.objectContaining({ employer_uuid: ACME, audience: "regulator", years: 5 }));
    expect(screen.getByText(/layout is generic/)).toBeTruthy();
    expect(screen.getByTestId("oh-annual-pdf").getAttribute("href")).toContain(`employer_uuid=${ACME}`);
  });

  it("shows the key figures with the change on last year, and leaves suppressed years out of the charts", async () => {
    renderPage();
    const exams = await screen.findByTestId("oh-annual-kpi-examinations");
    expect(within(exams).getByText("90")).toBeTruthy();
    expect(exams).toHaveTextContent("+20+28.6%");
    expect(within(exams).getByRole("img", { name: "Examinations by year: 2024 70, 2025 90" })).toBeTruthy();
    // Fewer injuries is good news, so the drop reads in the brand colour, not red.
    const iod = screen.getByTestId("oh-annual-kpi-iod_cases");
    expect(within(iod).getByText("-3").className).toContain("text-brand-primary");
    // Days lost is "<5" this year: shown, no change is computed from it, and its line has too few points to draw.
    const lost = screen.getByTestId("oh-annual-kpi-days_lost");
    expect(within(lost).getByText("<5")).toBeTruthy();
    expect(lost).not.toHaveTextContent("%");
    expect(within(lost).queryByRole("img")).toBeNull();
    expect(screen.getByText(/left as gaps/)).toBeTruthy();
  });

  it("lays each area out as headline counts and breakdowns, with no bar or share while a part is hidden", async () => {
    renderPage();
    const medicals = await screen.findByTestId("annual-section-medicals");
    expect(within(medicals).getByText("Periodic")).toBeTruthy();
    expect(within(medicals).getByText("Pre employment")).toBeTruthy();
    expect(within(medicals).getByText("Shares are left out while a count is hidden.")).toBeTruthy();
    expect(within(medicals).queryByRole("img")).toBeNull();
    expect(within(medicals).getByText("By examination type")).toBeTruthy();
    expect(rowLabel("HEPB · up_to_date")).toBe("HEPB · up to date");
    expect(rowLabel("Outcome: fit_with_restrictions", "Outcome: ")).toBe("Fit with restrictions");
    // Rows with mixed units are never drawn against each other.
    expect(sectionChartRows("exposure", { "Exposure results recorded": 86, "Overexposure events": 9 }).data).toEqual([]);
  });

  it("points to a year with records when this one is empty", async () => {
    const zero = { year: 2025, workers: 0, examinations: 0, certificates: 0, surveillance_completion: null, iod_cases: 0, days_lost: 0, sick_leave_days: 0, da_tests: 0 };
    mocks.report.mockImplementation(async (params: { year: number }) => (params.year === 2025 ? { ...REPORT, sections: { workforce: { "Workers on file during the year": 0 } } } : REPORT));
    mocks.trend.mockResolvedValue({ ...TREND, series: [TREND.series[0], zero] });
    renderPage();
    expect(await screen.findByTestId("oh-annual-empty")).toHaveTextContent("Nothing was recorded across all employers in 2025.");
    fireEvent.click(screen.getByRole("button", { name: /Open 2024, the latest year with records/ }));
    await waitFor(() => expect(mocks.report).toHaveBeenLastCalledWith(expect.objectContaining({ year: 2024 })));
  });

  it("charts the chosen headline figure, and an empty year is never compared with the year before", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Examinations by year" })).toBeTruthy();
    fireEvent.click(screen.getByTestId("oh-annual-kpi-iod_cases"));
    expect(screen.getByTestId("oh-annual-kpi-iod_cases").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { name: "Injury on duty cases by year" })).toBeTruthy();
    cleanup();

    const zero = { year: 2025, workers: 0, examinations: 0, certificates: 0, surveillance_completion: null, iod_cases: 0, days_lost: 0, sick_leave_days: 0, da_tests: 0 };
    mocks.report.mockResolvedValue({ ...REPORT, sections: { workforce: { "Workers on file during the year": 0 }, injuries: { "Injury on duty cases": 0 } } });
    mocks.trend.mockResolvedValue({ ...TREND, series: [TREND.series[0], zero] });
    renderPage();
    await screen.findByTestId("oh-annual-empty");
    expect(screen.queryByTestId("oh-annual-better")).toBeNull();
    expect(screen.getByTestId("oh-annual-changes")).toHaveTextContent("Nothing to compare yet.");
    expect(screen.getByTestId("oh-annual-kpi-iod_cases")).not.toHaveTextContent("on 2024");
  });

  it("opens straight on the figures, with no masthead", async () => {
    renderPage();
    await screen.findByTestId("oh-annual-kpi-examinations");

    expect(screen.queryByText("Occupational health annual report")).toBeNull();
    expect(screen.queryByText(/^Generated /)).toBeNull();
    expect(screen.queryByText(/Employer copy · small counts hidden/)).toBeNull();
    expect(within(screen.getByTestId("oh-annual-paper")).queryByText(/^\d+ \w+ 2025 to /)).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "All employers, 2025" }).className).toContain("sr-only");
    expect(screen.getByText("2025 in brief")).toBeTruthy();
  });

  it("says in words what moved most since last year, and what did not move", async () => {
    renderPage();

    const better = await screen.findByTestId("oh-annual-better");
    expect(within(better).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Injury on duty cases fell 33.3% (9 → 6)",
      "Examinations rose 28.6% (70 → 90)",
      "Workers on file rose 20% (100 → 120)",
    ]);
    // Days lost is hidden this year, so it is neither good nor bad news.
    expect(within(screen.getByTestId("oh-annual-worse")).getByText("Nothing moved noticeably the wrong way.")).toBeTruthy();
    expect(screen.getByText("What changed since 2024")).toBeTruthy();
  });

  it("gives each breakdown row its share on the regulator copy, and none while a part is hidden", async () => {
    mocks.report.mockImplementation(async (params: { audience: string }) =>
      params.audience === "regulator"
        ? { ...REPORT, audience: "regulator", sections: { ...REPORT.sections, medicals: { Examinations: 91, "Examinations: periodic": 60, "Examinations: pre_employment": 28, "Examinations: exit": 3 } } }
        : REPORT,
    );
    renderPage();
    const medicals = await screen.findByTestId("annual-section-medicals");
    expect(within(medicals).queryByLabelText(/percent/)).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Regulator copy" }));
    await waitFor(() => expect(within(screen.getByTestId("annual-section-medicals")).getByLabelText("66 percent")).toBeTruthy());
    expect(within(screen.getByTestId("annual-section-medicals")).getByLabelText("31 percent")).toBeTruthy();
    expect(within(screen.getByTestId("annual-section-medicals")).getByLabelText("3 percent")).toBeTruthy();
  });

  it("puts every earlier year beside this one, with hidden counts left as they are", async () => {
    renderPage();
    const table = await screen.findByTestId("oh-annual-key-figures");

    expect(within(table).getByRole("columnheader", { name: "2024" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "2025" })).toBeTruthy();
    const days = within(table).getByRole("row", { name: /Days lost to injury/ });
    expect(within(days).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["20", "<5", "–"]);
    expect(within(within(table).getByRole("row", { name: /Surveillance completed/ })).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["80%", "85%", "+5 pts"]);
  });

  it("works out changes, sentences and rankings without the page", () => {
    const series = [
      { year: 2024, workers: 100, examinations: 70, certificates: 50, surveillance_completion: 80, iod_cases: 9, days_lost: 20, sick_leave_days: 40, da_tests: 10 },
      { year: 2025, workers: 100, examinations: 90, certificates: 50, surveillance_completion: 85, iod_cases: "<5", days_lost: 30, sick_leave_days: 40, da_tests: 10 },
    ];
    const report = {
      ...REPORT,
      sections: {
        workforce: { "Workers on file during the year": 100 },
        medicals: { Examinations: 90 },
        surveillance: { "Completion %": 85 },
        injuries: { "Injury on duty cases": "<5", "Days lost": 30 },
        sick_leave: { "Sick-leave days": 40 },
        drug_alcohol: { "Tests collected": 10 },
      },
    };
    const changes = annualChanges(report as never, series, 2024);
    const by = (key: string) => changes.find((change) => change.figure.key === key)!;

    expect(describeChange(by("examinations"))).toBe("Examinations rose 28.6% (70 → 90)");
    expect(describeChange(by("surveillance_completion"))).toBe("Surveillance completed rose 5 pts (80% → 85%)");
    expect(describeChange(by("days_lost"))).toBe("Days lost to injury rose 50% (20 → 30)");
    expect(by("days_lost").good).toBe(false);
    expect(by("iod_cases").delta).toBeNull();
    expect(by("workers").good).toBeNull();
    expect(rankChanges(changes).better.map((change) => change.figure.key)).toEqual(["examinations", "surveillance_completion"]);
    expect(rankChanges(changes).worse.map((change) => change.figure.key)).toEqual(["days_lost"]);
    expect(annualChanges(report as never, series, null).every((change) => change.delta === null)).toBe(true);
  });

  it("splits an area into headline counts and breakdowns", () => {
    const layout = areaLayout({
      Examinations: 91,
      "Examinations: periodic": 60,
      "Examinations: pre_employment": 31,
      "Completion %": "85",
      "HEPB · up_to_date": 8,
      "HEPB · overdue": "<5",
    });
    expect(layout.stats).toEqual([
      { key: "Examinations", label: "Examinations", value: 91 },
      { key: "Completion %", label: "Completion", value: "85%" },
    ]);
    expect(layout.breakdowns.map((b) => [b.title, b.hasHidden, b.parts.map((p) => [p.label, p.share])])).toEqual([
      ["By examination type", false, [["Periodic", 66], ["Pre employment", 34]]],
      ["HEPB", true, [["Up to date", null], ["Overdue", null]]],
    ]);
  });

  it("shares ticks out in proportion, keeping a tick for every part above zero", () => {
    expect(tickCounts([60, 28, 12], 48).reduce((a, b) => a + b, 0)).toBe(48);
    expect(tickCounts([1000, 1], 48)).toEqual([47, 1]);
    expect(tickCounts([5, 0, 5], 10)).toEqual([5, 0, 5]);
    expect(tickCounts([0, 0], 48)).toEqual([0, 0]);
  });

  it("shares a row only when every part of its group is a plain number", () => {
    expect(breakdownShares("medicals", { Examinations: 100, "Examinations: a": 75, "Examinations: b": 25 })).toEqual({ "Examinations: a": 75, "Examinations: b": 25 });
    expect(breakdownShares("medicals", { "Examinations: a": 75, "Examinations: b": "<5" })).toEqual({});
    expect(breakdownShares("medicals", { "Examinations: a": 75 })).toEqual({});
    expect(breakdownShares("health_programmes", { "hearing · fit": 5, "lung · fit": 5 })).toEqual({});
  });

  it("shows the period as a date range and keeps a whole calendar year as the statutory period", async () => {
    renderPage();
    await screen.findByText("Injury on duty");
    expect(screen.getByTestId("oh-annual-period-trigger")).toHaveTextContent("1 Jan 2025 to 31 Dec 2025");
    expect(rangeToPeriod({ from: "2024-01-01", to: "2024-12-31" })).toEqual({ mode: "year", year: 2024 });
    expect(rangeToPeriod({ from: "2025-07-01", to: "2026-06-30" })).toEqual({ mode: "custom", from: "2025-07-01", to: "2026-06-30" });
  });

  it("switches to a custom period through the date range picker and validates it", async () => {
    renderPage();
    await screen.findByText("Injury on duty");
    fireEvent.click(screen.getByRole("button", { name: /Change period/ }));
    const dialog = await screen.findByTestId("oh-annual-period-dialog");
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
