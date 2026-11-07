"use client";

import type { ECharts } from "echarts/core";

import { ChartEmptyState } from "@/features/reports/components/ChartEmptyState";
import { ReportEChart } from "@/features/reports/components/ReportEChart";
import {
  chartHasValues,
  type ReportChartModel,
} from "@/features/reports/types/report-visual.types";
import { buildReportChartOption } from "@/features/reports/utils/report-chart-options";

type ReportVisualChartsProps = {
  charts: ReportChartModel[];
  onChartReady: (chartId: string, chart: ECharts) => void;
};

function ReportChartCard({
  chart,
  wide,
  onChartReady,
}: {
  chart: ReportChartModel;
  wide: boolean;
  onChartReady: (chartId: string, chart: ECharts) => void;
}) {
  const hasValues = chartHasValues(chart);
  const height = chart.kind === "donut" ? 280 : 300;

  return (
    <section
      className={wide ? "lg:col-span-2" : undefined}
      data-testid={`report-chart-${chart.id}`}
    >
      <h3 className="text-[15px] font-semibold tracking-tight text-brand-navy">
        {chart.title}
      </h3>
      <p className="mt-1 max-w-xl text-xs leading-relaxed text-brand-muted">
        {chart.caption}
      </p>
      <div className="mt-2">
        {hasValues ? (
          <ReportEChart
            option={buildReportChartOption(chart)}
            height={height}
            ariaLabel={chart.title}
            onReady={(instance) => onChartReady(chart.id, instance)}
          />
        ) : (
          <ChartEmptyState message="Nothing to chart for this period." />
        )}
      </div>
    </section>
  );
}

export function ReportVisualCharts({
  charts,
  onChartReady,
}: ReportVisualChartsProps) {
  if (charts.length === 0) {
    return null;
  }

  const [primary, ...rest] = charts;

  return (
    <div className="grid gap-x-12 gap-y-14 lg:grid-cols-2">
      {primary ? (
        <ReportChartCard chart={primary} wide onChartReady={onChartReady} />
      ) : null}
      {rest.map((chart) => (
        <ReportChartCard
          key={chart.id}
          chart={chart}
          wide={rest.length === 1}
          onChartReady={onChartReady}
        />
      ))}
    </div>
  );
}
