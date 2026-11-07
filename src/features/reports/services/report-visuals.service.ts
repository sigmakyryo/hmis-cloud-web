import { fetchAppointmentSummaryStats } from "@/features/appointments/services/appointments.service";
import { REPORT_CHART_PALETTE } from "@/features/reports/constants/chart-config";
import type { ReportCatalogItem } from "@/features/reports/constants/report-catalog";
import {
  fetchSalesActivity,
  fetchSalesByProvider,
  fetchVisitsByPeriod,
} from "@/features/reports/services/insights.service";
import type {
  ReportChartModel,
  ReportKpi,
  ReportVisual,
} from "@/features/reports/types/report-visual.types";
import { insightsFiltersForReport } from "@/features/reports/utils/report-visual-range";
import { fetchInternalOrders } from "@/features/inventory/services/internal-orders.service";
import { fetchPurchaseOrders } from "@/features/inventory/services/purchase-orders.service";
import { fetchInvoiceSummaryStats } from "@/features/invoices/services/invoices.service";
import { fetchPaymentSummaryStats } from "@/features/payments/services/payments.service";
import { fetchReceivablesSummaryStats } from "@/features/receivables/services/receivables.service";
import { RECEIVABLES_AGING_BUCKETS } from "@/features/receivables/types/receivables.types";
import { fetchSalesOrderSummaryStats } from "@/features/sales-orders/services/sales-orders.service";
import { formatAmountNumber } from "@/features/sales-orders/utils/format-sales-order";
import type { SalesActivityPoint } from "@/features/reports/types/insights.types";

const PERIOD_CAPTION = "Totals for the selected period.";
const QUEUE_CAPTION = "Current queue. The date range applies to the visits chart.";
const OPEN_BALANCE_CAPTION = "Open balances on file. Aging does not use the export filters.";
const DOCUMENT_CAPTION = "Documents currently on file. Status counts ignore the date filters.";

function amount(value: string | number | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function countLabel(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatPeriodLabel(label: string): string {
  const parsed = new Date(`${label}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return label;
  }
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function colorAt(index: number): string {
  return REPORT_CHART_PALETTE[index % REPORT_CHART_PALETTE.length];
}

function activityChart(
  points: SalesActivityPoint[],
  title: string,
): ReportChartModel {
  return {
    id: "sales-activity",
    title,
    caption: PERIOD_CAPTION,
    kind: "area",
    valueFormat: "money",
    categories: points.map((point) => formatPeriodLabel(point.label)),
    series: [
      {
        name: "Sales orders",
        values: points.map((point) => amount(point.sales_orders)),
        color: colorAt(0),
      },
      {
        name: "Invoices",
        values: points.map((point) => amount(point.invoices)),
        color: colorAt(1),
      },
      {
        name: "Payments",
        values: points.map((point) => amount(point.payments)),
        color: colorAt(2),
      },
    ],
  };
}

function donutChart(
  id: string,
  title: string,
  caption: string,
  slices: Array<{ label: string; value: number }>,
  valueFormat: ReportChartModel["valueFormat"],
): ReportChartModel {
  return {
    id,
    title,
    caption,
    kind: "donut",
    valueFormat,
    categories: slices.map((slice) => slice.label),
    series: [
      {
        name: title,
        values: slices.map((slice) => slice.value),
        color: colorAt(0),
      },
    ],
  };
}

async function statusCounts(
  options: Array<{ value: string; label: string }>,
  loadCount: (status: string) => Promise<number>,
): Promise<Array<{ label: string; value: number }>> {
  const counts = await Promise.all(
    options.map(async (option) => ({
      label: option.label,
      value: await loadCount(option.value),
    })),
  );
  return counts;
}

function listCount(paginationCount: number | undefined, resultCount: number): number {
  return paginationCount ?? resultCount;
}

async function loadSalesVisual(
  values: Record<string, string>,
  title: string,
): Promise<ReportVisual> {
  const filters = insightsFiltersForReport(values);
  const [activity, providers, summary] = await Promise.all([
    fetchSalesActivity(filters),
    fetchSalesByProvider(filters, 8),
    fetchSalesOrderSummaryStats({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      state: values.state || undefined,
    }),
  ]);

  const kpis: ReportKpi[] = [
    { label: "Orders", value: countLabel(summary.all.count) },
    { label: "Order value", value: formatAmountNumber(summary.all.total) },
    { label: "Confirmed", value: formatAmountNumber(summary.confirmed.total) },
    { label: "Open", value: formatAmountNumber(summary.open.total) },
  ];

  return {
    kpis,
    charts: [
      activityChart(activity.series, title),
      {
        id: "sales-by-provider",
        title: "Sales by provider",
        caption: PERIOD_CAPTION,
        kind: "bar",
        valueFormat: "money",
        horizontal: providers.providers.length > 5,
        categories: providers.providers.map(
          (provider) => provider.provider_name || "Unassigned",
        ),
        series: [
          {
            name: "Sales",
            values: providers.providers.map((provider) => amount(provider.total)),
            color: colorAt(0),
          },
        ],
      },
      donutChart(
        "order-mix",
        "Order mix",
        PERIOD_CAPTION,
        [
          { label: "Open", value: summary.open.count },
          { label: "Confirmed", value: summary.confirmed.count },
          { label: "Cancelled", value: summary.cancelled.count },
        ],
        "number",
      ),
    ],
  };
}

async function loadInvoiceVisual(values: Record<string, string>): Promise<ReportVisual> {
  const filters = insightsFiltersForReport(values);
  const [activity, summary] = await Promise.all([
    fetchSalesActivity(filters),
    fetchInvoiceSummaryStats({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      state: values.state || undefined,
    }),
  ]);

  return {
    kpis: [
      { label: "Invoices", value: countLabel(summary.all.count) },
      { label: "Invoiced", value: formatAmountNumber(summary.all.total) },
      { label: "Paid", value: formatAmountNumber(summary.paid.total) },
      { label: "Unpaid", value: formatAmountNumber(summary.not_paid.total) },
    ],
    charts: [
      activityChart(activity.series, "Billing activity"),
      donutChart(
        "invoice-mix",
        "Invoice balances",
        PERIOD_CAPTION,
        [
          { label: "Paid", value: amount(summary.paid.total) },
          { label: "Partially paid", value: amount(summary.partially_paid.total) },
          { label: "Not paid", value: amount(summary.not_paid.total) },
        ],
        "money",
      ),
    ],
  };
}

async function loadPaymentVisual(values: Record<string, string>): Promise<ReportVisual> {
  const filters = insightsFiltersForReport(values);
  const [activity, summary] = await Promise.all([
    fetchSalesActivity(filters),
    fetchPaymentSummaryStats({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      state: values.state || undefined,
    }),
  ]);

  return {
    kpis: [
      { label: "Payments", value: countLabel(summary.all.count) },
      { label: "Amount", value: formatAmountNumber(summary.all.total) },
      { label: "Posted", value: formatAmountNumber(summary.posted.total) },
      { label: "Draft", value: formatAmountNumber(summary.draft.total) },
    ],
    charts: [
      activityChart(activity.series, "Payment activity"),
      donutChart(
        "payment-mix",
        "Payment status",
        PERIOD_CAPTION,
        [
          { label: "Posted", value: amount(summary.posted.total) },
          { label: "Draft", value: amount(summary.draft.total) },
          { label: "Cancelled", value: amount(summary.cancelled.total) },
        ],
        "money",
      ),
    ],
  };
}

async function loadReceivablesVisual(): Promise<ReportVisual> {
  const summary = await fetchReceivablesSummaryStats();
  const slices = RECEIVABLES_AGING_BUCKETS.map((bucket) => ({
    label: `${bucket} days`,
    value: amount(summary.aging[bucket]?.total),
  }));

  return {
    kpis: [
      { label: "Debtors", value: countLabel(summary.debtors_count) },
      { label: "Open invoices", value: countLabel(summary.open_invoice_count) },
      { label: "Receivable", value: formatAmountNumber(summary.total_receivable) },
    ],
    charts: [
      {
        id: "aging",
        title: "Aging buckets",
        caption: OPEN_BALANCE_CAPTION,
        kind: "bar",
        valueFormat: "money",
        categories: slices.map((slice) => slice.label),
        series: [
          {
            name: "Balance",
            values: slices.map((slice) => slice.value),
            color: colorAt(0),
          },
        ],
      },
    ],
  };
}

async function loadAppointmentsVisual(
  values: Record<string, string>,
): Promise<ReportVisual> {
  const filters = insightsFiltersForReport(values);
  const [visits, summary] = await Promise.all([
    fetchVisitsByPeriod(filters),
    fetchAppointmentSummaryStats(),
  ]);

  return {
    kpis: [
      { label: "Today", value: countLabel(summary.todays_appointments) },
      { label: "Upcoming", value: countLabel(summary.upcoming_appointments) },
      { label: "In progress", value: countLabel(summary.in_progress) },
      { label: "Cancelled today", value: countLabel(summary.cancelled_today) },
    ],
    charts: [
      {
        id: "visits",
        title: "Visits",
        caption: PERIOD_CAPTION,
        kind: "area",
        valueFormat: "number",
        categories: visits.series.map((point) => formatPeriodLabel(point.label)),
        series: [
          {
            name: "Visits",
            values: visits.series.map((point) => point.count),
            color: colorAt(1),
          },
        ],
      },
      donutChart(
        "appointment-queue",
        "Appointment queue",
        QUEUE_CAPTION,
        [
          { label: "Today", value: summary.todays_appointments },
          { label: "Upcoming", value: summary.upcoming_appointments },
          { label: "In progress", value: summary.in_progress },
          { label: "Cancelled today", value: summary.cancelled_today },
        ],
        "number",
      ),
    ],
  };
}

async function loadDocumentStatusVisual(
  report: ReportCatalogItem,
): Promise<ReportVisual> {
  const statusField = report.filters.find((field) => field.name === "status");
  const options = statusField?.options ?? [];
  const slices = await statusCounts(options, async (status) => {
    if (report.id === "internal_orders") {
      const response = await fetchInternalOrders({ status, page: 1, pageSize: 1 });
      return listCount(response.pagination?.count, response.results.length);
    }
    const response = await fetchPurchaseOrders({ status, page: 1, pageSize: 1 });
    return listCount(response.pagination?.count, response.results.length);
  });
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return {
    kpis: [
      { label: "Documents", value: countLabel(total) },
      ...slices.slice(0, 3).map((slice) => ({
        label: slice.label,
        value: countLabel(slice.value),
      })),
    ],
    charts: [
      donutChart(
        "document-status",
        "By status",
        DOCUMENT_CAPTION,
        slices,
        "number",
      ),
      {
        id: "document-status-bar",
        title: "Status counts",
        caption: DOCUMENT_CAPTION,
        kind: "bar",
        valueFormat: "number",
        horizontal: slices.length > 4,
        categories: slices.map((slice) => slice.label),
        series: [
          {
            name: "Documents",
            values: slices.map((slice) => slice.value),
            color: colorAt(0),
          },
        ],
      },
    ],
  };
}

/** Load the charts and headline figures for one catalog report. */
export async function loadReportVisual(
  report: ReportCatalogItem,
  values: Record<string, string>,
): Promise<ReportVisual> {
  switch (report.id) {
    case "sales_orders":
    case "sales_order_lines":
      return loadSalesVisual(values, "Sales activity");
    case "invoices":
      return loadInvoiceVisual(values);
    case "payments":
      return loadPaymentVisual(values);
    case "receivables_aging":
      return loadReceivablesVisual();
    case "appointments":
      return loadAppointmentsVisual(values);
    case "purchase_orders":
    case "internal_orders":
      return loadDocumentStatusVisual(report);
    default:
      return { kpis: [], charts: [] };
  }
}
