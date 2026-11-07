import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReportExportShell } from "@/features/reports/components/ReportExportShell";
import { ReportsWorkspace } from "@/features/reports/components/ReportsWorkspace";

vi.mock("@/features/reports/services/report-visuals.service", () => ({
  loadReportVisual: vi.fn(async () => ({
    kpis: [{ label: "Orders", value: "4" }],
    charts: [
      {
        id: "sales-activity",
        title: "Sales activity",
        caption: "Totals for the selected period.",
        kind: "area",
        valueFormat: "money",
        categories: ["Nov 1"],
        series: [{ name: "Sales orders", values: [120] }],
      },
    ],
  })),
}));

vi.mock("@/features/reports/components/ReportEChart", () => ({
  ReportEChart: () => <div data-testid="report-echart" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/reports",
  useSearchParams: () => new URLSearchParams(),
}));

function renderWorkspace() {
  return render(
    <ReportExportShell>
      <ReportsWorkspace />
    </ReportExportShell>,
  );
}

afterEach(() => {
  cleanup();
});

describe("ReportsWorkspace", () => {
  it("shows the date range, filters, and export actions", async () => {
    renderWorkspace();

    expect(screen.getByTestId("reports-nav")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    expect(screen.getByTestId("report-filters-button")).toHaveTextContent("Filters");
    expect(screen.getByTestId("report-export-csv")).toBeInTheDocument();
    expect(screen.getByTestId("report-export-pdf")).toBeInTheDocument();
    expect(screen.getByTestId("report-export-history-link")).toHaveAttribute(
      "href",
      "/reports/history",
    );
    expect(screen.queryByText("Pick a report, review the charts, then export CSV or PDF.")).not.toBeInTheDocument();
    expect(await screen.findByText("Sales activity")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("opens extra filters in a popover and switches reports", async () => {
    renderWorkspace();
    await screen.findByText("Sales activity");

    fireEvent.click(screen.getByTestId("report-filters-button"));
    expect(await screen.findByTestId("report-filters-popover")).toBeInTheDocument();
    expect(screen.getByLabelText("State")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("report-nav-appointments"));

    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByTestId("report-nav-appointments")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
