export type ReportChartKind = "area" | "bar" | "donut";

export type ReportValueFormat = "number" | "money";

export type ReportChartSeries = {
  name: string;
  values: number[];
  color?: string;
};

export type ReportChartModel = {
  id: string;
  title: string;
  caption: string;
  kind: ReportChartKind;
  valueFormat: ReportValueFormat;
  categories: string[];
  series: ReportChartSeries[];
  horizontal?: boolean;
};

export type ReportKpi = {
  label: string;
  value: string;
};

export type ReportVisual = {
  kpis: ReportKpi[];
  charts: ReportChartModel[];
};

export function chartHasValues(chart: ReportChartModel): boolean {
  return chart.series.some((series) =>
    series.values.some((value) => value !== 0),
  );
}
