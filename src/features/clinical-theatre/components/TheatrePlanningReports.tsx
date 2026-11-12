"use client";

import { ReportTable, Stat } from "@/features/clinical-theatre/components/TheatreReportPrimitives";
import {
  useTheatrePerformanceReport,
  useTheatreWaitingListReport,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type {
  TheatrePerformanceFilters,
  TheatrePerformanceReport,
  TheatreWaitingListReport,
} from "@/features/clinical-theatre/types/theatre-planning.types";
import {
  formatClock,
  formatPercent,
} from "@/features/clinical-theatre/utils/theatre-planning-display";
import {
  errorMessage,
  formatMinutes,
} from "@/features/clinical-theatre/utils/theatre-record-display";

export function TheatrePerformanceReportBody({ report }: { report: TheatrePerformanceReport }) {
  const { totals } = report;
  return (
    <div className="space-y-6" data-testid="theatre-performance-report">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Session utilisation" value={formatPercent(totals.utilisation_percent)} />
        <Stat
          label={`First case on time (±${report.first_case_tolerance_minutes} min)`}
          value={formatPercent(totals.first_case_on_time_rate_percent)}
        />
        <Stat label="Late starts" value={totals.late_starts} />
        <Stat label="Average late start" value={formatMinutes(totals.average_late_minutes)} />
        <Stat label="Average turnover" value={formatMinutes(totals.average_turnover_minutes)} />
        <Stat label="Overrun time" value={formatMinutes(totals.overrun_minutes)} />
      </div>
      <p className="text-xs text-muted-foreground">
        {totals.sessions} planned session(s), {formatMinutes(totals.session_minutes)} of session
        time; {totals.cases_timed} timed case(s) used {formatMinutes(totals.used_minutes)} inside
        sessions. {totals.out_of_session_cases} case(s) ran{" "}
        {formatMinutes(totals.out_of_session_minutes)} outside planned sessions. Turnovers longer
        than {report.turnover_gap_cap_minutes} min are treated as gaps, not turnovers.
      </p>
      {totals.sessions === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No theatre sessions are planned in this period. Set weekly sessions in Settings →
          Modules → Theatre → Sessions to measure utilisation against session time.
        </p>
      ) : null}
      <ReportTable
        title="By room"
        headers={["Room", "Sessions", "Utilisation", "First case on time", "Late starts", "Avg turnover", "Overrun"]}
        empty="No sessions or timed cases."
        rows={report.by_room.map((row) => [
          row.room_name || "—",
          row.sessions,
          formatPercent(row.utilisation_percent),
          formatPercent(row.first_case_on_time_rate_percent),
          row.late_starts,
          formatMinutes(row.average_turnover_minutes),
          formatMinutes(row.overrun_minutes),
        ])}
      />
      <ReportTable
        title="By surgeon"
        headers={["Surgeon", "Sessions", "Timed cases", "In theatre", "Utilisation", "Late starts", "Avg turnover"]}
        empty="No sessions or timed cases."
        rows={report.by_surgeon.map((row) => [
          row.surgeon_name,
          row.sessions,
          row.cases_timed,
          formatMinutes(row.in_room_minutes),
          formatPercent(row.utilisation_percent),
          row.late_starts,
          formatMinutes(row.average_turnover_minutes),
        ])}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <ReportTable
          title="Late starts"
          headers={["Date", "Room", "Session", "First case in", "Late by"]}
          empty="No late starts."
          rows={report.late_starts.map((row) => [
            row.date,
            row.room_name,
            `${row.start_time}–${row.end_time}`,
            formatClock(row.first_case_start),
            formatMinutes(row.late_minutes),
          ])}
        />
        <ReportTable
          title="Overruns"
          headers={["Date", "Room", "Session", "Last case out", "Over by"]}
          empty="No overruns."
          rows={report.overruns.map((row) => [
            row.date,
            row.room_name,
            `${row.start_time}–${row.end_time}`,
            formatClock(row.last_case_end),
            formatMinutes(row.overrun_minutes),
          ])}
        />
      </div>
      <ReportTable
        title="Case intervals"
        headers={["Interval", "Cases", "Average", "Median"]}
        empty="No timed cases."
        rows={report.intervals.map((row) => [
          row.label,
          row.cases,
          formatMinutes(row.average_minutes),
          formatMinutes(row.median_minutes),
        ])}
      />
      <ReportTable
        title="By day"
        headers={["Date", "Sessions", "Utilisation", "Timed cases", "Turnovers", "Avg turnover"]}
        empty="No activity."
        rows={report.by_day.map((row) => [
          row.date,
          row.sessions,
          formatPercent(row.utilisation_percent),
          row.cases_timed,
          row.turnovers,
          formatMinutes(row.average_turnover_minutes),
        ])}
      />
    </div>
  );
}

export function TheatrePerformanceReportSection({
  filters,
}: {
  filters: TheatrePerformanceFilters;
}) {
  const { data, isLoading, error } = useTheatrePerformanceReport(filters, {
    enabled: Boolean(filters.date_from && filters.date_to),
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading performance…</p>;
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {errorMessage(error, "Could not load the performance report.")}
      </p>
    );
  }
  return data ? <TheatrePerformanceReportBody report={data} /> : null;
}

export function TheatreWaitingListReportBody({ report }: { report: TheatreWaitingListReport }) {
  const { totals } = report;
  return (
    <div className="space-y-6" data-testid="theatre-waiting-list-report">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="On the list now" value={totals.active} />
        <Stat label="Breached target" value={totals.breached} />
        <Stat label="Breach rate" value={formatPercent(totals.breach_rate_percent)} />
        <Stat
          label="Median wait"
          value={totals.median_days_waited === null ? "—" : `${totals.median_days_waited} d`}
        />
        <Stat label="Added in period" value={totals.added_in_period} />
        <Stat label="Operated in period" value={totals.operated_in_period} />
      </div>
      <ReportTable
        title="Waits by urgency category"
        headers={["Category", "Target", "Waiting", "Scheduled", "Breached", "Median wait", "Longest", "Operated", "Median to surgery"]}
        empty="No categories."
        rows={report.by_category.map((row) => [
          `${row.code} · ${row.label}`,
          `${row.target_days} d`,
          row.waiting,
          row.scheduled,
          `${row.breached} (${formatPercent(row.breach_rate_percent)})`,
          row.median_days_waited === null ? "—" : `${row.median_days_waited} d`,
          row.max_days_waited === null ? "—" : `${row.max_days_waited} d`,
          row.operated,
          row.median_days_to_surgery === null ? "—" : `${row.median_days_to_surgery} d`,
        ])}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <ReportTable
          title={`Removals in period (${totals.removed_in_period})`}
          headers={["Reason", "Patients"]}
          empty="No removals in this period."
          rows={report.removals.map((row) => [row.label, row.count])}
        />
        <ReportTable
          title="Longest breaches"
          headers={["Patient", "Category", "Waited", "Over target", "Procedure"]}
          empty="No breaches."
          rows={report.breaches.map((row) => [
            row.patient_name,
            row.category,
            `${row.days_waited} d`,
            `${row.days_over} d`,
            row.procedures.join(", ") || "—",
          ])}
        />
      </div>
    </div>
  );
}

export function TheatreWaitingListReportSection({
  filters,
}: {
  filters: { date_from?: string; date_to?: string; clinic?: string; surgeon?: string };
}) {
  const { data, isLoading, error } = useTheatreWaitingListReport(filters, {
    enabled: Boolean(filters.date_from && filters.date_to),
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading waiting list…</p>;
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {errorMessage(error, "Could not load the waiting list report.")}
      </p>
    );
  }
  return data ? <TheatreWaitingListReportBody report={data} /> : null;
}
