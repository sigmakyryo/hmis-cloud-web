"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Download, ListChecks, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPageLayout } from "@/features/app-shell/components/page-layout";
import { OhAccessDenied } from "@/features/occupational-health/components/OhAccessDenied";
import { OhExamBatteryRulesPanel } from "@/features/occupational-health/components/OhExamBatteryRulesPanel";
import { OhVisitCancellationsReport } from "@/features/occupational-health/components/OhVisitCancellationsReport";
import { OhBreakdownBars, OhComplianceTrendChart, OhDonutChart } from "@/features/occupational-health/components/dashboard/OhCharts";
import { OhExportDialog } from "@/features/occupational-health/components/dashboard/OhExportDialog";
import { OhKpiStat, OhKpiStrip } from "@/features/occupational-health/components/dashboard/OhKpiStrip";
import { OhPanel, OhPanelState } from "@/features/occupational-health/components/dashboard/OhPanel";
import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import { OH_COLORS } from "@/features/occupational-health/components/dashboard/oh-dashboard-colors";
import { openFile } from "@/features/occupational-health/components/dashboard/oh-table";
import { useOhComplianceDashboard } from "@/features/occupational-health/hooks/use-occupational-health";
import { cancellationReportCsvUrl, fetchComplianceInsights } from "@/features/occupational-health/services/oh-ext.service";
import { downloadOhComplianceExtract } from "@/features/occupational-health/services/oh.service";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { useUser } from "@/providers/user-provider";
import { useToast } from "@/providers/toast-provider";

type Breakdown = "by_hazard_profile" | "by_department" | "by_employer" | "by_site";
const BREAKDOWN_LABEL: Record<Breakdown, string> = {
  by_hazard_profile: "Hazard profile",
  by_department: "Department",
  by_employer: "Employer",
  by_site: "Site",
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function OhCompliancePage() {
  const { userData, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const dashboard = useOhComplianceDashboard();
  const [months, setMonths] = useState<"6" | "12" | "24">("12");
  const insights = useQuery({
    queryKey: ["oh-compliance-insights", Number(months)],
    queryFn: () => fetchComplianceInsights(Number(months)),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const [breakdown, setBreakdown] = useState<Breakdown>("by_hazard_profile");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState(() => isoDaysAgo(90));
  const [exportTo, setExportTo] = useState(() => isoDaysAgo(0));
  const hasAccess = canAccessOccupationalHealth(userData);

  async function handleExtract() {
    try {
      const { blob, filename } = await downloadOhComplianceExtract();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast({ variant: "success", title: "Compliance CSV downloaded" });
    } catch (extractError) {
      toast({
        title: "Extract failed",
        description: extractError instanceof Error ? extractError.message : undefined,
        variant: "error",
      });
    }
  }

  if (isUserLoading) {
    return (
      <ListPageLayout data-testid="oh-compliance-page">
        <div className="p-8 text-sm text-brand-muted">Loading compliance…</div>
      </ListPageLayout>
    );
  }

  if (!hasAccess) {
    return (
      <OhAccessDenied
        data-testid="oh-compliance-page"
        description="Occupational health compliance is limited to users in the OccupationalHealth group. Ask an administrator to grant access for this workspace."
      />
    );
  }

  const d = dashboard.data;
  const i = insights.data;
  const rate = i?.compliance.rate_3m ?? null;
  const rateDelta = i && rate !== null && i.compliance.rate_prev_3m !== null ? rate - i.compliance.rate_prev_3m : null;
  const statusData = i
    ? [
        { key: "completed", label: "Completed", value: i.totals.completed, color: OH_COLORS.completed },
        { key: "due", label: "Due", value: i.totals.due, color: OH_COLORS.due },
        { key: "overdue", label: "Overdue", value: i.totals.overdue, color: OH_COLORS.overdue },
        { key: "waived", label: "Waived", value: i.totals.waived, color: OH_COLORS.waived },
      ]
    : [];
  const statusTotal = statusData.reduce((s, x) => s + x.value, 0);
  const refreshing = dashboard.isFetching || insights.isFetching;

  const updatedAt = dashboard.dataUpdatedAt ? format(new Date(dashboard.dataUpdatedAt), "HH:mm") : null;

  return (
    <ListPageLayout data-testid="oh-compliance-page">
      <h1 className="sr-only">Compliance</h1>
      <div data-list-band className="px-4 pb-10 md:px-6">
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-dash-border/70 py-3"
          role="toolbar"
          aria-label="Compliance actions"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-[12px] text-dash-muted hover:text-brand-navy"
            aria-label="Refresh"
            disabled={refreshing}
            onClick={() => {
              void dashboard.refetch();
              void insights.refetch();
            }}
          >
            <RefreshCw className={refreshing ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />
            <span>{refreshing ? "Refreshing…" : updatedAt ? `Updated ${updatedAt}` : "Refresh"}</span>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild type="button" variant="ghost" size="sm" className="h-8 gap-1.5">
              <a href="#oh-exam-battery-rules">
                <ListChecks className="size-3.5" aria-hidden /> Rules
              </a>
            </Button>
            <Button type="button" variant="primary" size="sm" className="h-8 gap-1.5" onClick={() => setExportOpen(true)}>
              <Download className="size-3.5" aria-hidden /> Export
            </Button>
          </div>
        </div>

        {dashboard.error ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 py-2.5 text-[13px] text-red-800" role="alert">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4" aria-hidden />
              Could not load compliance dashboard. The compliance figures could not be loaded.
            </span>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-red-800" onClick={() => void dashboard.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}

        <OhKpiStrip>
          <OhKpiStat
            label="Compliance, 3 mo"
            value={rate !== null ? `${Math.round(rate)}%` : "—"}
            delta={{ value: rateDelta, suffix: " pts", goodWhen: "up", label: "vs prior 3" }}
            tone={rate === null ? "default" : rate >= 90 ? "success" : rate >= 75 ? "warning" : "danger"}
            isLoading={insights.isLoading}
            data-testid="oh-compliance-metric-rate"
          />
          <OhKpiStat label="Overdue" value={d?.overdue ?? "—"} tone={(d?.overdue ?? 0) > 0 ? "danger" : "success"} isLoading={dashboard.isLoading} data-testid="oh-compliance-metric-overdue" />
          <OhKpiStat label="Due in 30 days" value={d?.due_within_30_days ?? "—"} hint={d ? `${d.due} due in total` : undefined} tone="warning" isLoading={dashboard.isLoading} data-testid="oh-compliance-metric-due_within_30_days" />
          <OhKpiStat
            label="Completed, 30 d"
            value={i?.completed.last_30_days ?? "—"}
            delta={{ value: i ? i.completed.last_30_days - i.completed.previous_30_days : null, goodWhen: "up", label: "vs previous 30" }}
            isLoading={insights.isLoading}
            data-testid="oh-compliance-metric-completed30"
          />
          <OhKpiStat label="Certs expiring" value={d?.fitness_validity_alerts ?? "—"} hint="within 30 days" isLoading={dashboard.isLoading} data-testid="oh-compliance-metric-fitness_validity_alerts" />
          <OhKpiStat label="Workers on file" value={d?.open_episodes ?? "—"} hint="open employment" isLoading={dashboard.isLoading} data-testid="oh-compliance-metric-open_episodes" />
        </OhKpiStrip>

        <div className="grid gap-10 border-b border-dash-border/70 py-7 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-dash-border/70">
          <OhPanel
            className="lg:col-span-2 lg:pr-8"
            title="Compliance over time"
            description="Requirements by the month they fell due: completed vs still open, and the share completed."
            actions={
              <OhSegmented
                label="Period"
                role="radiogroup"
                value={months}
                onChange={setMonths}
                options={[
                  { value: "6", label: "6 mo" },
                  { value: "12", label: "12 mo" },
                  { value: "24", label: "24 mo" },
                ]}
              />
            }
            data-testid="oh-compliance-trend"
          >
            <OhPanelState
              isLoading={insights.isLoading}
              error={insights.error}
              onRetry={() => void insights.refetch()}
              isEmpty={!i || i.trend.every((p) => p.due === 0)}
              emptyText="Nothing fell due in this period."
              height={260}
            >
              {i ? <OhComplianceTrendChart data={i.trend} /> : null}
            </OhPanelState>
          </OhPanel>
          <OhPanel className="lg:pl-8" title="Status breakdown" description="All surveillance requirements" data-testid="oh-compliance-status">
            <OhPanelState
              isLoading={insights.isLoading}
              error={insights.error}
              onRetry={() => void insights.refetch()}
              isEmpty={statusTotal === 0}
              emptyText="No requirements yet."
              height={220}
            >
              <OhDonutChart
                label="Requirements by status"
                data={statusData}
                centerValue={String(statusTotal)}
                centerLabel="requirements"
                size={168}
                stacked
              />
            </OhPanelState>
          </OhPanel>
        </div>

        <OhPanel
          className="border-b border-dash-border/70 py-7"
          title="Where open work sits"
          description="Due and overdue requirements grouped by the selected dimension (top 8)."
          actions={
            <OhSegmented
              label="Group by"
              role="radiogroup"
              value={breakdown}
              onChange={setBreakdown}
              options={(Object.keys(BREAKDOWN_LABEL) as Breakdown[]).map((k) => ({ value: k, label: BREAKDOWN_LABEL[k] }))}
            />
          }
          data-testid="oh-compliance-breakdown"
        >
          <OhPanelState
            isLoading={insights.isLoading}
            error={insights.error}
            onRetry={() => void insights.refetch()}
            isEmpty={!i || i[breakdown].length === 0}
            emptyText="No open requirements."
            height={200}
          >
            {i ? <OhBreakdownBars data={i[breakdown]} label={`Open requirements by ${BREAKDOWN_LABEL[breakdown].toLowerCase()}`} /> : null}
          </OhPanelState>
        </OhPanel>

        <div className="border-b border-dash-border/70 py-7">
          <OhExamBatteryRulesPanel />
        </div>
        <div className="pt-7">
          <OhVisitCancellationsReport />
        </div>
      </div>

      <OhExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export compliance"
        description="The period applies to the cancellations report; the extract always covers every requirement."
        options={[
          { id: "extract", label: "Compliance extract (CSV)", description: "Every surveillance requirement with status, exam and due date.", format: "csv", run: handleExtract },
          {
            id: "cancellations",
            label: "Cancellations and no-shows (CSV)",
            description: "Visit-level rows for the chosen period.",
            format: "csv",
            run: () => openFile(cancellationReportCsvUrl({ from: exportFrom, to: exportTo }), true),
          },
          { id: "print", label: "Print this dashboard", description: "Opens the browser print dialog (save as PDF from there).", format: "print", run: () => window.print() },
        ]}
      >
        <div className="space-y-1.5">
          <Label htmlFor="oh-export-from">From</Label>
          <Input id="oh-export-from" type="date" value={exportFrom} max={exportTo} onChange={(e) => setExportFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="oh-export-to">To</Label>
          <Input id="oh-export-to" type="date" value={exportTo} min={exportFrom} onChange={(e) => setExportTo(e.target.value)} />
        </div>
      </OhExportDialog>
    </ListPageLayout>
  );
}
