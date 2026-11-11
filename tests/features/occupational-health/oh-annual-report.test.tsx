import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ report: vi.fn(), employers: vi.fn() }));

vi.mock("@/lib/server/oh-service", () => ({ OH_SERVICE_URL: "http://ohs.test/api", ohServiceRequest: vi.fn() }));
vi.mock("@/lib/server/require-access-token", () => ({ requireAccessToken: vi.fn() }));
vi.mock("@/features/occupational-health/services/oh.service", () => ({ fetchOhEmployers: () => mocks.employers() }));
vi.mock("@/features/occupational-health/services/oh-annual-report.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/occupational-health/services/oh-annual-report.service")>();
  return { ...actual, fetchAnnualReport: (...a: unknown[]) => mocks.report(...a) };
});

import { OhAnnualReportPage } from "@/features/occupational-health/pages/OhAnnualReportPage";
import { annualReportFileUrl, portalAnnualFileUrl } from "@/features/occupational-health/services/oh-annual-report.service";
import { employerPortalProxy } from "@/lib/server/employer-portal-bff";
import { ohAnnualReportProxy } from "@/lib/server/oh-annual-report-bff";

const ACME = "0b7c3f9e-1d2a-4c5b-8e6f-7a8b9c0d1e2f";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("annual report", () => {
  it("builds the report for the chosen employer and audience", async () => {
    mocks.employers.mockResolvedValue([{ uuid: ACME, name: "Acme" }]);
    mocks.report.mockResolvedValue({
      year: 2025,
      audience: "employer",
      employer: null,
      generated_at: "2026-01-01T00:00:00+02:00",
      suppression: "Counts from 1 to 4 are shown as <5.",
      sections: { injuries: { "Injury on duty cases": 6, "Days lost": "<5" }, sick_leave: {} },
    });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <OhAnnualReportPage />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Injury on duty")).toBeTruthy();
    expect(screen.getByText("<5")).toBeTruthy();
    expect(screen.getByText("Nothing recorded.")).toBeTruthy();
    await screen.findByRole("option", { name: "Acme" });
    fireEvent.change(screen.getByLabelText("Employer"), { target: { value: ACME } });
    fireEvent.change(screen.getByLabelText("Audience"), { target: { value: "regulator" } });
    await waitFor(() =>
      expect(mocks.report).toHaveBeenLastCalledWith(expect.objectContaining({ employer_uuid: ACME, audience: "regulator" })),
    );
    expect(screen.getByText(/layout is generic/)).toBeTruthy();
  });

  it("builds file links and proxies only read-only report paths", () => {
    expect(annualReportFileUrl({ year: 2025, audience: "employer" }, "pdf")).toBe(
      "/api/occupational-health/annual-reports/annual/pdf?year=2025&audience=employer",
    );
    expect(portalAnnualFileUrl(2025, "csv")).toBe("/api/employer-portal/annual-summary/csv?year=2025");
    expect(ohAnnualReportProxy.resolve("GET", ["annual", "pdf"])?.binary?.type).toBe("application/pdf");
    expect(ohAnnualReportProxy.resolve("POST", ["annual"])).toBeNull();
    expect(employerPortalProxy.resolve("GET", ["annual-summary", "csv"])?.binary?.type).toContain("text/csv");
    expect(employerPortalProxy.resolve("GET", ["annual-summary"])?.binary).toBeNull();
  });
});
