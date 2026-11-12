"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TheatreClinicSelect } from "@/features/clinical-theatre/components/TheatreClinicSelect";
import { useTheatreReportSummary } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import { shiftDateInput, toDateInputValue } from "@/features/clinical-theatre/pages/TheatreBoardPage";
import type { TheatreReportSummary } from "@/features/clinical-theatre/types/clinical-theatre.types";
import { CANCELLATION_CATEGORY_LABELS } from "@/features/clinical-theatre/utils/theatre-cancellation-display";
import {
  errorMessage,
  formatMinutes,
} from "@/features/clinical-theatre/utils/theatre-record-display";

const DEFAULT_RANGE_DAYS = 30;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-brand-navy">{value}</p>
    </div>
  );
}

function ReportTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="py-1 pr-3">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-t">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="py-1 pr-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TheatreReportBody({ report }: { report: TheatreReportSummary }) {
  const { totals } = report;
  return (
    <div className="space-y-6" data-testid="theatre-report-body">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Cases" value={totals.cases} />
        <Stat label="Completed" value={totals.completed} />
        <Stat label="Cancelled" value={totals.cancelled} />
        <Stat label="Postponed" value={totals.postponed} />
        <Stat label="Operating time" value={formatMinutes(totals.operating_minutes)} />
        <Stat label="Average case" value={formatMinutes(totals.average_case_minutes)} />
      </div>
      <ReportTable
        title="By room"
        headers={["Room", "Cases", "Completed", "Cancelled", "Operating time", "Utilisation"]}
        empty="No cases in this period."
        rows={report.by_room.map((row) => [
          row.room_name,
          row.cases,
          row.completed,
          row.cancelled,
          formatMinutes(row.operating_minutes),
          row.utilisation_percent === null ? "—" : `${row.utilisation_percent}%`,
        ])}
      />
      <ReportTable
        title="By surgeon"
        headers={["Surgeon", "Cases", "Completed", "Cancelled", "Operating time"]}
        empty="No cases in this period."
        rows={report.by_surgeon.map((row) => [
          row.surgeon_name,
          row.cases,
          row.completed,
          row.cancelled,
          formatMinutes(row.operating_minutes),
        ])}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <ReportTable
          title="By status"
          headers={["Status", "Cases"]}
          empty="No cases."
          rows={report.by_status.map((row) => [row.label, row.count])}
        />
        <ReportTable
          title="By urgency"
          headers={["Urgency", "Cases"]}
          empty="No cases."
          rows={report.by_urgency.map((row) => [row.label, row.count])}
        />
      </div>
      {report.cancellation_summary ? (
        <section className="space-y-3" data-testid="theatre-report-cancellation-summary">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="On-the-day cancellation rate"
              value={
                report.cancellation_summary.on_the_day_rate_percent === null
                  ? "—"
                  : `${report.cancellation_summary.on_the_day_rate_percent}%`
              }
            />
            <Stat label="On the day" value={report.cancellation_summary.on_the_day} />
            <Stat
              label="Cancelled / postponed"
              value={report.cancellation_summary.total}
            />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <ReportTable
              title="Cancellations by category"
              headers={["Category", "Cases", "On the day"]}
              empty="No cancellations in this period."
              rows={report.cancellation_summary.by_category.map((row) => [
                row.label,
                row.count,
                row.on_the_day,
              ])}
            />
            <ReportTable
              title="Cancellations by reason"
              headers={["Reason", "Cases", "On the day"]}
              empty="No cancellations in this period."
              rows={report.cancellation_summary.by_reason.map((row) => [
                row.label,
                row.count,
                row.on_the_day,
              ])}
            />
          </div>
        </section>
      ) : null}
      <ReportTable
        title="Cancellations & postponements"
        headers={[
          "Scheduled",
          "Procedure",
          "Room",
          "Surgeon",
          "Status",
          "Category",
          "On the day",
          "Reason",
        ]}
        empty="No cancellations in this period."
        rows={report.cancellations.map((row) => [
          row.scheduled_start ? new Date(row.scheduled_start).toLocaleString() : "—",
          row.procedure_description || "—",
          row.room_name || "—",
          row.surgeon_name || "—",
          row.status === "cancelled" ? "Cancelled" : "Postponed",
          row.category ? CANCELLATION_CATEGORY_LABELS[row.category] : "—",
          row.on_the_day ? "Yes" : "No",
          row.reason || "—",
        ])}
      />
      {report.stock_returns && report.stock_returns.returns > 0 ? (
        <ReportTable
          title={`Stock returned to inventory (${report.stock_returns.returns} returns)`}
          headers={["Item", "Returns", "Quantity"]}
          empty="No stock returns."
          rows={report.stock_returns.by_product.map((row) => [
            row.product_name,
            row.returns,
            row.quantity,
          ])}
        />
      ) : null}
      {report.returns ? (
        <section className="space-y-3" data-testid="theatre-report-returns">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat
              label={`Unplanned return rate (≤${report.returns.window_days} d)`}
              value={
                report.returns.unplanned_return_rate_percent === null
                  ? "—"
                  : `${report.returns.unplanned_return_rate_percent}%`
              }
            />
            <Stat label="Returns to theatre" value={report.returns.total} />
            <Stat label="Unplanned" value={report.returns.unplanned} />
            <Stat label="Planned (staged)" value={report.returns.planned} />
          </div>
          <ReportTable
            title="Returns to theatre"
            headers={["Procedure", "Type", "Days after", "Surgeon", "Reason"]}
            empty="No returns to theatre in this period."
            rows={report.returns.cases.map((row) => [
              row.procedure_description || "—",
              row.planned ? "Planned" : row.planned === false ? "Unplanned" : "—",
              row.days_after ?? "—",
              row.surgeon_name || "—",
              row.reason || "—",
            ])}
          />
        </section>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
        {report.crash ? (
          <ReportTable
            title={`Emergency timing (crash cases: ${report.crash.total}, paperwork open: ${report.crash.paperwork_outstanding})`}
            headers={["NCEPOD", "Cases", "Median decision → incision"]}
            empty="No NCEPOD-classified cases."
            rows={report.crash.by_ncepod.map((row) => [
              row.label,
              row.cases,
              row.median_decision_to_incision_minutes === null
                ? "—"
                : formatMinutes(row.median_decision_to_incision_minutes),
            ])}
          />
        ) : null}
        {report.by_procedure ? (
          <ReportTable
            title="Top procedures"
            headers={["Procedure", "Done", "As primary"]}
            empty="No procedures recorded."
            rows={report.by_procedure.map((row) => [row.procedure, row.count, row.as_primary])}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Theatre activity report: volumes, utilisation and cancellations. */
export function TheatreReportsPage() {
  const today = toDateInputValue(new Date());
  const [dateFrom, setDateFrom] = useState(shiftDateInput(today, -DEFAULT_RANGE_DAYS));
  const [dateTo, setDateTo] = useState(today);
  const [clinic, setClinic] = useState("");
  const [sessionHours, setSessionHours] = useState("8");
  const filters = {
    date_from: dateFrom,
    date_to: dateTo,
    clinic: clinic || undefined,
    session_hours: sessionHours || undefined,
  };
  const { data, isLoading, error } = useTheatreReportSummary(filters, {
    enabled: Boolean(dateFrom && dateTo),
  });

  return (
    <div className="space-y-4 p-4" data-testid="theatre-reports-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">Theatre reports</h1>
          <p className="text-sm text-muted-foreground">
            Cases, utilisation and cancellations for a date range.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="theatre-report-from">From</Label>
            <Input
              id="theatre-report-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="theatre-report-to">To</Label>
            <Input
              id="theatre-report-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="theatre-report-hours">Session hours / day</Label>
            <Input
              id="theatre-report-hours"
              type="number"
              min={1}
              max={24}
              className="w-24"
              value={sessionHours}
              onChange={(event) => setSessionHours(event.target.value)}
            />
          </div>
          <TheatreClinicSelect value={clinic} onChange={setClinic} />
        </div>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : error ? (
        <p className="text-sm text-red-600">
          {errorMessage(error, "Could not load the theatre report.")}
        </p>
      ) : data ? (
        <TheatreReportBody report={data} />
      ) : null}
    </div>
  );
}
