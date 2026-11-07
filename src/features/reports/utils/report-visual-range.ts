import type { ReportCatalogItem } from "@/features/reports/constants/report-catalog";
import { getReportDatePresets } from "@/features/reports/utils/report-date-presets";
import type {
  InsightsFilters,
  InsightsPeriod,
} from "@/features/reports/types/insights.types";

export function initialReportFilterValues(
  report: ReportCatalogItem,
): Record<string, string> {
  const preset = getReportDatePresets().find((item) => item.id === "this_month");
  const dateFrom = preset?.dateFrom ?? "";
  const dateTo = preset?.dateTo ?? "";
  const values: Record<string, string> = {};

  for (const field of report.filters) {
    if (field.name === "date_from" || field.name === "scheduled_from") {
      values[field.name] = dateFrom;
    } else if (
      field.name === "date_to" ||
      field.name === "scheduled_to" ||
      field.name === "as_of_date"
    ) {
      values[field.name] = dateTo;
    } else {
      values[field.name] = "";
    }
  }

  return values;
}

export function describeReportPeriod(values: Record<string, string>): string {
  const from = values.date_from || values.scheduled_from || "";
  const to = values.date_to || values.scheduled_to || "";
  const asOf = values.as_of_date || "";
  if (from && to) {
    return `${from} to ${to}`;
  }
  if (asOf) {
    return `As of ${asOf}`;
  }
  return "Current period";
}

function periodForRange(dateFrom: string, dateTo: string): InsightsPeriod {
  const start = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "day";
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (days > 120) {
    return "month";
  }
  if (days > 45) {
    return "week";
  }
  return "day";
}

export function insightsFiltersForReport(
  values: Record<string, string>,
): InsightsFilters {
  const preset = getReportDatePresets().find((item) => item.id === "this_month");
  const dateFrom =
    values.date_from || values.scheduled_from || values.as_of_date || preset?.dateFrom || "";
  const dateTo =
    values.date_to || values.scheduled_to || values.as_of_date || preset?.dateTo || "";
  return {
    dateFrom,
    dateTo,
    period: periodForRange(dateFrom, dateTo),
    clinicUuid: values.clinic_uuid || undefined,
  };
}
