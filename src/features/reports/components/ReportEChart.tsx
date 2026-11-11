"use client";

import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import type { EChartsOption } from "echarts";
import * as echarts from "echarts/core";
import type { ECharts } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  SVGRenderer,
]);

type ReportEChartProps = {
  option: EChartsOption;
  height: number;
  ariaLabel: string;
  onReady?: (chart: ECharts) => void;
};

/** SVG ECharts surface used by the reports workspace. */
export function ReportEChart({
  option,
  height,
  ariaLabel,
  onReady,
}: ReportEChartProps) {
  return (
    <div role="img" aria-label={ariaLabel} className="w-full min-w-0">
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        notMerge
        lazyUpdate
        opts={{ renderer: "svg" }}
        style={{ height, width: "100%" }}
        onChartReady={onReady}
      />
    </div>
  );
}

export type { ECharts };
