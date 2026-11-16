import { EmptyIllustration } from "@/components/illustrations/empty-illustration";
import type { ReportChartKind } from "@/features/reports/types/report-visual.types";

type ChartEmptyStateProps = {
  message: string;
  kind?: ReportChartKind;
};

/** Stands in for a chart with nothing to draw: a quiet picture of the chart, and a line saying why. */
export function ChartEmptyState({ message, kind = "area" }: ChartEmptyStateProps) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center" data-testid="report-chart-empty">
      <EmptyIllustration variant={kind === "donut" ? "donut" : "chart"} className="h-24" />
      <p className="text-sm text-brand-muted">{message}</p>
    </div>
  );
}
