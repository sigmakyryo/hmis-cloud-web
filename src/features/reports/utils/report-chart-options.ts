import type { EChartsOption } from "echarts";
import * as echarts from "echarts/core";

import { REPORT_CHART_PALETTE } from "@/features/reports/constants/chart-config";
import type { ReportChartModel } from "@/features/reports/types/report-visual.types";
import { formatAmountNumber } from "@/features/sales-orders/utils/format-sales-order";
import { formatCompactNumber } from "@/utils/format-compact-number";

const INK = "#1f2a24";
const MUTED = "#7a6e62";
const GRID = "#efe6dc";
const SURFACE = "#ffffff";

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace("#", "");
  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function seriesColor(chart: ReportChartModel, index: number): string {
  return (
    chart.series[index]?.color ??
    REPORT_CHART_PALETTE[index % REPORT_CHART_PALETTE.length]
  );
}

export function formatReportChartValue(
  value: number,
  format: ReportChartModel["valueFormat"],
): string {
  if (format === "money") {
    return formatAmountNumber(value);
  }
  return formatCompactNumber(value);
}

function tooltipFormatter(chart: ReportChartModel) {
  return (params: unknown): string => {
    const rows = Array.isArray(params) ? params : [params];
    const first = rows[0] as { dataIndex?: number; name?: string } | undefined;
    const index = first?.dataIndex ?? 0;
    const title = chart.categories[index] ?? first?.name ?? "";
    const lines = chart.series
      .map((series, seriesIndex) => {
        const color = seriesColor(chart, seriesIndex);
        const value = series.values[index] ?? 0;
        return `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:${MUTED}"><i style="display:inline-block;width:8px;height:8px;border-radius:99px;background:${color};margin-right:6px"></i>${series.name}</span><b>${formatReportChartValue(value, chart.valueFormat)}</b></div>`;
      })
      .join("");
    return `<div style="font-weight:600;margin-bottom:4px">${title}</div>${lines}`;
  };
}

export function buildReportChartOption(chart: ReportChartModel): EChartsOption {
  const colors = chart.series.map((_, index) => seriesColor(chart, index));

  if (chart.kind === "donut") {
    const total = chart.series[0]?.values.reduce((sum, value) => sum + value, 0) ?? 0;
    return {
      animationDuration: 500,
      color: [...REPORT_CHART_PALETTE],
      textStyle: { fontFamily: "IBM Plex Sans, ui-sans-serif, sans-serif" },
      title: {
        text: formatReportChartValue(total, chart.valueFormat),
        subtext: "Total",
        left: "center",
        top: "38%",
        textStyle: { fontSize: 20, fontWeight: 650, color: INK },
        subtextStyle: { fontSize: 12, color: MUTED },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: SURFACE,
        borderColor: GRID,
        borderWidth: 1,
        extraCssText: "border-radius:10px;box-shadow:0 8px 24px rgba(15,23,20,0.08);",
        textStyle: { color: INK, fontSize: 12 },
      },
      legend: {
        bottom: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: MUTED, fontSize: 12 },
      },
      series: [
        {
          type: "pie",
          radius: ["58%", "76%"],
          center: ["50%", "46%"],
          avoidLabelOverlap: true,
          label: { show: false },
          itemStyle: { borderRadius: 6, borderColor: SURFACE, borderWidth: 2 },
          data: chart.categories.map((name, index) => ({
            name,
            value: chart.series[0]?.values[index] ?? 0,
          })),
        },
      ],
    };
  }

  const horizontal = Boolean(chart.horizontal);
  const categoryAxis = {
    type: "category" as const,
    data: chart.categories,
    axisLine: { lineStyle: { color: GRID } },
    axisTick: { show: false },
    axisLabel: { color: MUTED, fontSize: 11, hideOverlap: true },
  };
  const valueAxis = {
    type: "value" as const,
    splitNumber: 4,
    axisLabel: {
      color: MUTED,
      fontSize: 11,
      formatter: (value: number) => formatReportChartValue(value, chart.valueFormat),
    },
    splitLine: { lineStyle: { color: GRID, type: [3, 4] as [number, number] } },
  };

  return {
    animationDuration: 550,
    color: colors,
    textStyle: { fontFamily: "IBM Plex Sans, ui-sans-serif, sans-serif" },
    grid: {
      top: 16,
      right: 12,
      bottom: chart.series.length > 1 ? 36 : 24,
      left: horizontal ? 112 : 56,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: SURFACE,
      borderColor: GRID,
      borderWidth: 1,
      padding: [8, 10],
      extraCssText: "border-radius:10px;box-shadow:0 8px 24px rgba(15,23,20,0.08);",
      textStyle: { color: INK, fontSize: 12 },
      formatter: tooltipFormatter(chart),
    },
    legend:
      chart.series.length > 1
        ? {
            bottom: 0,
            icon: "circle",
            itemWidth: 8,
            itemHeight: 8,
            textStyle: { color: MUTED, fontSize: 12 },
          }
        : undefined,
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : valueAxis,
    series: chart.series.map((series, index) => {
      const color = seriesColor(chart, index);
      if (chart.kind === "area") {
        return {
          name: series.name,
          type: "line" as const,
          smooth: 0.35,
          showSymbol: false,
          data: series.values,
          lineStyle: { width: 2, color },
          itemStyle: { color },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: withAlpha(color, 0.28) },
              { offset: 1, color: withAlpha(color, 0) },
            ]),
          },
        };
      }
      return {
        name: series.name,
        type: "bar" as const,
        data: series.values,
        barMaxWidth: horizontal ? 16 : 22,
        itemStyle: {
          color,
          borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
        },
      };
    }),
  };
}
