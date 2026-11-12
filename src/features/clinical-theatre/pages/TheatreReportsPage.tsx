"use client";

import { useState } from "react";

import { CareProviderCombobox } from "@/features/appointments/components/CareProviderCombobox";
import type { CareProvider } from "@/features/appointments/types/appointment.types";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TheatreClinicSelect } from "@/features/clinical-theatre/components/TheatreClinicSelect";
import {
  TheatrePerformanceReportSection,
  TheatreWaitingListReportSection,
} from "@/features/clinical-theatre/components/TheatrePlanningReports";
import { ReportTable, Stat } from "@/features/clinical-theatre/components/TheatreReportPrimitives";
import { TheatreRoomSelect } from "@/features/clinical-theatre/components/TheatreRoomSelect";
import { useTheatreReportSummary } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import { shiftDateInput, toDateInputValue } from "@/features/clinical-theatre/pages/TheatreBoardPage";
import type {
  TheatreReportSummary,
  TheatreRoom,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { cn } from "@/lib/utils";
import { CANCELLATION_CATEGORY_LABELS } from "@/features/clinical-theatre/utils/theatre-cancellation-display";
import {
  errorMessage,
  formatMinutes,
} from "@/features/clinical-theatre/utils/theatre-record-display";

const DEFAULT_RANGE_DAYS = 30;

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
      {report.obstetrics && (report.obstetrics.caesareans > 0 || report.obstetrics.babies > 0) ? (
        <section className="space-y-3" data-testid="theatre-report-obstetrics">
          <h2 className="text-sm font-semibold text-brand-navy">Caesareans & births</h2>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Caesareans" value={report.obstetrics.caesareans} />
            <Stat label="Babies" value={report.obstetrics.babies} />
            <Stat label="Live births" value={report.obstetrics.live_births} />
            <Stat label="Stillbirths" value={report.obstetrics.stillbirths} />
            <Stat label="Apgar < 7 at 5 min" value={report.obstetrics.low_apgar_5} />
            <Stat label="Low birth weight" value={report.obstetrics.low_birth_weight} />
          </div>
          <p className="text-xs text-muted-foreground">
            {report.obstetrics.registered_newborns} newborn(s) registered;{" "}
            {report.obstetrics.unregistered_live_births} live birth(s) not yet registered.
          </p>
          <ReportTable
            title="Caesareans by urgency category"
            headers={["Category", "Cases"]}
            empty="No caesareans in this period."
            rows={report.obstetrics.by_category.map((row) => [row.label, row.cases])}
          />
        </section>
      ) : null}
      {report.ipd_conversions && report.ipd_conversions.converted > 0 ? (
        <ReportTable
          title={`Day cases converted to inpatient (${report.ipd_conversions.converted} of ${report.ipd_conversions.day_cases}, ${(report.ipd_conversions.rate * 100).toFixed(1)}%)`}
          headers={["Converted", "Patient", "Procedure", "Reason"]}
          empty="No conversions."
          rows={report.ipd_conversions.cases.map((row) => [
            new Date(row.converted_at).toLocaleString(),
            row.customer_name || "—",
            row.procedure_description || "—",
            row.reason || "—",
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

type ReportTab = "activity" | "performance" | "waiting-list";

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: "activity", label: "Activity" },
  { id: "performance", label: "Utilisation & starts" },
  { id: "waiting-list", label: "Waiting list" },
];

/** Theatre reports: activity, session performance and the elective waiting list. */
export function TheatreReportsPage() {
  const today = toDateInputValue(new Date());
  const [tab, setTab] = useState<ReportTab>("activity");
  const [dateFrom, setDateFrom] = useState(shiftDateInput(today, -DEFAULT_RANGE_DAYS));
  const [dateTo, setDateTo] = useState(today);
  const [clinic, setClinic] = useState("");
  const [sessionHours, setSessionHours] = useState("8");
  const [room, setRoom] = useState<TheatreRoom | null>(null);
  const [surgeon, setSurgeon] = useState<CareProvider | null>(null);
  const filters = {
    date_from: dateFrom,
    date_to: dateTo,
    clinic: clinic || undefined,
    session_hours: sessionHours || undefined,
  };
  const { data, isLoading, error } = useTheatreReportSummary(filters, {
    enabled: tab === "activity" && Boolean(dateFrom && dateTo),
  });
  const planningFilters = {
    date_from: dateFrom,
    date_to: dateTo,
    clinic: clinic || undefined,
    surgeon: surgeon ? String(surgeon.id) : undefined,
  };

  return (
    <div className="space-y-4 p-4" data-testid="theatre-reports-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">Theatre reports</h1>
          <p className="text-sm text-muted-foreground">
            Cases, utilisation against session time, on-time starts and waiting times.
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
          {tab === "activity" ? (
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
          ) : null}
          {tab === "performance" ? (
            <div className="w-48">
              <TheatreRoomSelect
                label="Room"
                clinicUuid={clinic || undefined}
                value={room}
                onChange={setRoom}
              />
            </div>
          ) : null}
          {tab !== "activity" ? (
            <div className="w-56">
              <CareProviderCombobox
                id="theatre-report-surgeon"
                label="Surgeon"
                clinicUuid={clinic || undefined}
                value={surgeon?.id ?? null}
                displayName={surgeon?.name ?? null}
                onSelect={setSurgeon}
              />
            </div>
          ) : null}
          <TheatreClinicSelect value={clinic} onChange={setClinic} />
        </div>
      </div>
      <nav
        aria-label="Theatre report"
        className="inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
      >
        {REPORT_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === item.id
                ? "bg-white text-brand-navy shadow-sm"
                : "text-brand-muted hover:text-brand-navy",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {tab === "performance" ? (
        <TheatrePerformanceReportSection
          filters={{ ...planningFilters, room: room?.uuid }}
        />
      ) : tab === "waiting-list" ? (
        <TheatreWaitingListReportSection filters={planningFilters} />
      ) : isLoading ? (
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
