import { describe, expect, it } from "vitest";

import { REPORT_CATALOG } from "@/features/reports/constants/report-catalog";
import {
  describeReportPeriod,
  initialReportFilterValues,
  insightsFiltersForReport,
} from "@/features/reports/utils/report-visual-range";
import { buildReportChartOption } from "@/features/reports/utils/report-chart-options";
import type { ReportChartModel } from "@/features/reports/types/report-visual.types";

describe("report visual range", () => {
  it("starts sales orders on the current month", () => {
    const report = REPORT_CATALOG.find((item) => item.id === "sales_orders");
    expect(report).toBeDefined();
    if (!report) {
      return;
    }

    const values = initialReportFilterValues(report);
    expect(values.date_from.endsWith("-01")).toBe(true);
    expect(values.date_to >= values.date_from).toBe(true);
    expect(describeReportPeriod(values)).toContain(" to ");
  });

  it("uses a coarser insights period for long ranges", () => {
    expect(
      insightsFiltersForReport({
        date_from: "2026-01-01",
        date_to: "2026-06-01",
      }).period,
    ).toBe("month");
    expect(
      insightsFiltersForReport({
        date_from: "2026-11-01",
        date_to: "2026-11-07",
      }).period,
    ).toBe("day");
  });
});

describe("buildReportChartOption", () => {
  it("builds a smooth area chart for a money series", () => {
    const chart: ReportChartModel = {
      id: "sales-activity",
      title: "Sales activity",
      caption: "Totals",
      kind: "area",
      valueFormat: "money",
      categories: ["Nov 1", "Nov 2"],
      series: [
        { name: "Sales orders", values: [10, 20], color: "#0b6e6e" },
      ],
    };

    const option = buildReportChartOption(chart);
    const series = option.series;
    expect(Array.isArray(series)).toBe(true);
    if (!Array.isArray(series)) {
      return;
    }
    expect(series[0]).toMatchObject({ type: "line", smooth: 0.35 });
  });
});
