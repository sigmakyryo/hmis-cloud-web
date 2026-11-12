"use client";

import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  OhColumnChart,
  OhStackedColumns,
} from "@/features/occupational-health/components/dashboard/OhCharts";
import {
  OhPanel,
  OhPanelState,
} from "@/features/occupational-health/components/dashboard/OhPanel";
import { OH_COLORS } from "@/features/occupational-health/components/dashboard/oh-dashboard-colors";
import {
  cancellationReportCsvUrl,
  fetchCancellationReport,
} from "@/features/occupational-health/services/oh-ext.service";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const monthLabel = (m: string) => {
  try {
    return format(parseISO(`${m}-01`), "MMM yy");
  } catch {
    return m;
  }
};

/** Cancelled and did-not-attend visits by month and reason, with a CSV download. */
export function OhVisitCancellationsReport() {
  const [from, setFrom] = useState(() => isoDaysAgo(90));
  const [to, setTo] = useState(() => isoDaysAgo(0));
  const validRange = from !== "" && to !== "" && from <= to;
  const report = useQuery({
    queryKey: ["oh-cancellation-report", from, to],
    queryFn: () => fetchCancellationReport({ from, to }),
    enabled: validRange,
  });
  const r = report.data;
  const lost = r ? r.cancelled + r.no_show : 0;

  return (
    <OhPanel
      id="oh-cancellations"
      title="Cancellations and no-shows"
      description="Visits that did not happen, by month and reason."
      data-testid="oh-cancellations-report"
      actions={
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label
              htmlFor="oh-cancel-from"
              className="text-[11px] text-dash-muted"
            >
              From
            </Label>
            <Input
              id="oh-cancel-from"
              type="date"
              className="h-8 w-[140px] text-[13px]"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label
              htmlFor="oh-cancel-to"
              className="text-[11px] text-dash-muted"
            >
              To
            </Label>
            <Input
              id="oh-cancel-to"
              type="date"
              className="h-8 w-[140px] text-[13px]"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
            <a
              href={cancellationReportCsvUrl({ from, to })}
              aria-disabled={!validRange}
            >
              <Download className="size-3.5" aria-hidden /> CSV
            </a>
          </Button>
        </div>
      }
    >
      {!validRange ? (
        <p className="text-[13px] text-red-700" role="alert">
          Choose a start date on or before the end date.
        </p>
      ) : (
        <OhPanelState
          isLoading={report.isLoading}
          error={report.error}
          onRetry={() => void report.refetch()}
          isEmpty={!r || r.total_visits === 0}
          emptyText="No visits in this period."
          height={200}
        >
          {r ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)_minmax(0,1fr)]">
              <dl className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-dash-muted">
                    Cancelled
                  </dt>
                  <dd className="text-xl font-semibold tabular-nums text-brand-navy">
                    {r.cancelled}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-dash-muted">
                    Did not attend
                  </dt>
                  <dd className="text-xl font-semibold tabular-nums text-brand-navy">
                    {r.no_show}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-dash-muted">
                    No-show rate
                  </dt>
                  <dd className="text-xl font-semibold tabular-nums text-brand-navy">
                    {r.no_show_rate !== null
                      ? `${(r.no_show_rate * 100).toFixed(1)}%`
                      : "—"}
                  </dd>
                </div>
                <p className="col-span-3 text-[12px] text-dash-muted lg:col-span-1">
                  {lost} of {r.total_visits} visits lost
                </p>
              </dl>
              <div className="min-w-0">
                <h3 className="mb-2 text-[12px] font-medium text-dash-muted">
                  By month
                </h3>
                <OhStackedColumns
                  label="Cancellations and no-shows by month"
                  xKey="label"
                  data={r.by_month.map((m) => ({
                    label: monthLabel(m.month),
                    cancelled: m.cancelled,
                    no_show: m.no_show,
                  }))}
                  series={[
                    {
                      key: "cancelled",
                      label: "Cancelled",
                      color: OH_COLORS.due,
                    },
                    {
                      key: "no_show",
                      label: "Did not attend",
                      color: OH_COLORS.overdue,
                    },
                  ]}
                  height={200}
                />
              </div>
              <div className="min-w-0">
                <h3 className="mb-2 text-[12px] font-medium text-dash-muted">
                  By reason
                </h3>
                {r.by_reason.length === 0 ? (
                  <p className="text-[13px] text-dash-muted">
                    No reasons recorded.
                  </p>
                ) : (
                  <OhColumnChart
                    horizontal
                    label="Cancellations by reason"
                    valueLabel="Visits"
                    color={OH_COLORS.info}
                    data={r.by_reason.map((x) => ({
                      key: x.code,
                      label: x.label,
                      value: x.count,
                    }))}
                  />
                )}
              </div>
            </div>
          ) : null}
        </OhPanelState>
      )}
    </OhPanel>
  );
}
