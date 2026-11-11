"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, BellRing, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ListPageLayout } from "@/features/app-shell/components/page-layout";
import { CreateAppointmentDialog } from "@/features/appointments/components/CreateAppointmentDialog";
import type { Customer } from "@/features/customers/types/customer.types";
import { OhAccessDenied } from "@/features/occupational-health/components/OhAccessDenied";
import { OhSurveillanceRecallsCard } from "@/features/occupational-health/components/OhSurveillanceRecallsCard";
import { OhBreakdownBars, OhColumnChart } from "@/features/occupational-health/components/dashboard/OhCharts";
import { OhExportDialog } from "@/features/occupational-health/components/dashboard/OhExportDialog";
import { OhKpiStat, OhKpiStrip } from "@/features/occupational-health/components/dashboard/OhKpiStrip";
import { OhPanel, OhPanelState } from "@/features/occupational-health/components/dashboard/OhPanel";
import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import { OH_COLORS } from "@/features/occupational-health/components/dashboard/oh-dashboard-colors";
import { downloadText, toCsv } from "@/features/occupational-health/components/dashboard/oh-table";
import { OhRequirementSheet } from "@/features/occupational-health/components/surveillance/OhRequirementSheet";
import { OhSendRecallDialog } from "@/features/occupational-health/components/surveillance/OhSendRecallDialog";
import {
  EMPTY_WORKLIST_FILTERS,
  OhSurveillanceWorklist,
  filterWorkRows,
  type OhWorklistFilters,
} from "@/features/occupational-health/components/surveillance/OhSurveillanceWorklist";
import { toWorkRows, type OhWorkRow } from "@/features/occupational-health/components/surveillance/oh-surveillance-utils";
import {
  useOhCampaignQueue,
  useOhFitnessValidityAlerts,
} from "@/features/occupational-health/hooks/use-occupational-health";
import { fetchComplianceInsights } from "@/features/occupational-health/services/oh-ext.service";
import { downloadOhComplianceExtract } from "@/features/occupational-health/services/oh.service";
import { canAccessOccupationalHealth } from "@/features/occupational-health/utils/oh-access";
import { ROUTES } from "@/constants/routes";
import { useUser } from "@/providers/user-provider";
import { useToast } from "@/providers/toast-provider";

function customerStub(row: OhWorkRow): Customer {
  const parts = (row.customer_name || "Worker").trim().split(/\s+/);
  return {
    id: 0,
    uuid: row.customer_uuid,
    tenant: 0,
    first_name: parts[0] ?? "Worker",
    middle_name: null,
    last_name: parts.slice(1).join(" ") || parts[0] || "Worker",
    full_name: row.customer_name,
    customer_identifier: row.customer_identifier,
    internal_reference: "",
    phone_number: null,
    email: null,
    patient_uuid: "",
    gender: "Other",
    dob: "",
    dob_is_estimated: false,
    age: 0,
    has_synced_to_openmrs: false,
    is_active: true,
    visit_status: "not_started",
    created_at: "",
    updated_at: "",
    created_by: null,
  } as Customer;
}

const WINDOW_BARS = [
  { key: "overdue_30_plus", label: "30d+ late", color: OH_COLORS.overdue },
  { key: "overdue", label: "Late", color: "#d9534f" },
  { key: "next_7", label: "≤7d", color: OH_COLORS.due },
  { key: "next_30", label: "8–30d", color: "#d9a066" },
  { key: "next_90", label: "31–90d", color: OH_COLORS.info },
  { key: "later", label: "Later", color: OH_COLORS.waived },
] as const;

type Tab = "worklist" | "recalls";

function SurveillanceTabs({ tab, onChange, count }: { tab: Tab; onChange: (tab: Tab) => void; count: number }) {
  return (
    <OhSegmented
      label="Surveillance views"
      value={tab}
      onChange={onChange}
      options={[
        { value: "worklist", label: "Worklist", count },
        { value: "recalls", label: "Recalls" },
      ]}
    />
  );
}

export function OhSurveillancePage() {
  const { userData, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("worklist");
  const [filters, setFilters] = useState<OhWorklistFilters>(EMPTY_WORKLIST_FILTERS);
  const [openRow, setOpenRow] = useState<OhWorkRow | null>(null);
  const [scheduleCustomer, setScheduleCustomer] = useState<Customer | null>(null);
  const [recallRows, setRecallRows] = useState<OhWorkRow[] | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  const campaignQuery = useOhCampaignQueue();
  const fitnessAlertsQuery = useOhFitnessValidityAlerts();
  const insights = useQuery({ queryKey: ["oh-compliance-insights", 12], queryFn: () => fetchComplianceInsights(12), retry: false });
  const hasAccess = canAccessOccupationalHealth(userData);

  const rows = useMemo(() => toWorkRows(campaignQuery.data ?? []), [campaignQuery.data]);

  if (isUserLoading) {
    return (
      <ListPageLayout data-testid="oh-surveillance-page">
        <div className="p-8 text-sm text-brand-muted">Loading surveillance…</div>
      </ListPageLayout>
    );
  }

  if (!hasAccess) {
    return <OhAccessDenied data-testid="oh-surveillance-page" />;
  }

  const isRefreshing = campaignQuery.isFetching || fitnessAlertsQuery.isFetching || insights.isFetching;
  const i = insights.data;
  const alerts = fitnessAlertsQuery.data ?? [];
  const overdueCount = i?.totals.overdue ?? rows.filter((r) => r.overdue).length;
  const next30 = i ? i.due_windows.next_7 + i.due_windows.next_30 : rows.filter((r) => !r.overdue && r.days !== null && r.days <= 30).length;
  const completedDelta = i ? i.completed.last_30_days - i.completed.previous_30_days : null;
  const rateDelta = i && i.compliance.rate_3m !== null && i.compliance.rate_prev_3m !== null ? i.compliance.rate_3m - i.compliance.rate_prev_3m : null;

  const applyQuick = (patch: Partial<OhWorklistFilters>) => {
    setTab("worklist");
    setFilters({ ...EMPTY_WORKLIST_FILTERS, ...patch });
  };

  async function exportExtract() {
    try {
      const { blob, filename } = await downloadOhComplianceExtract();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast({ variant: "success", title: "Compliance extract downloaded" });
    } catch (error) {
      toast({ variant: "error", title: "Extract failed", description: error instanceof Error ? error.message : undefined });
    }
  }

  const updatedAt = campaignQuery.dataUpdatedAt ? format(new Date(campaignQuery.dataUpdatedAt), "HH:mm") : null;
  const chartColumn = "lg:px-6 lg:first:pl-0 lg:last:pr-0";

  return (
    <ListPageLayout data-testid="oh-surveillance-page">
      <h1 className="sr-only">Surveillance</h1>
      <div data-list-band className="px-4 pb-10 md:px-6">
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-dash-border/70 py-3"
          role="toolbar"
          aria-label="Surveillance actions"
        >
          <div className="flex items-center gap-1.5 text-[12px] text-dash-muted">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-[12px] text-dash-muted hover:text-brand-navy"
              disabled={isRefreshing}
              aria-label="Refresh"
              onClick={() => {
                void campaignQuery.refetch();
                void fitnessAlertsQuery.refetch();
                void insights.refetch();
              }}
            >
              <RefreshCw className={isRefreshing ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />
              <span>{isRefreshing ? "Refreshing…" : updatedAt ? `Updated ${updatedAt}` : "Refresh"}</span>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => setExportOpen(true)}>
              <Download className="size-3.5" aria-hidden /> Export
            </Button>
            <Button type="button" variant="primary" size="sm" className="h-8 gap-1.5" onClick={() => setRecallRows([])}>
              <BellRing className="size-3.5" aria-hidden /> Send recalls
            </Button>
          </div>
        </div>

        <OhKpiStrip>
          <OhKpiStat
            label="Open requirements"
            value={i?.totals.open ?? rows.length}
            hint="due or overdue"
            isLoading={campaignQuery.isLoading && insights.isLoading}
            onClick={() => applyQuick({})}
            active={filters.status === "all" && filters.due === "any" && tab === "worklist"}
            data-testid="oh-kpi-open"
          />
          <OhKpiStat
            label="Overdue"
            value={overdueCount}
            hint={i ? `${i.due_windows.overdue_30_plus} over 30 days` : undefined}
            tone={overdueCount > 0 ? "danger" : "success"}
            isLoading={campaignQuery.isLoading && insights.isLoading}
            onClick={() => applyQuick({ status: "overdue" })}
            active={filters.status === "overdue"}
            data-testid="oh-kpi-overdue"
          />
          <OhKpiStat
            label="Due in 30 days"
            value={next30}
            hint={i ? `${i.due_windows.next_7} in the next 7` : undefined}
            tone="warning"
            isLoading={campaignQuery.isLoading && insights.isLoading}
            onClick={() => applyQuick({ due: "next_30" })}
            active={filters.due === "next_30"}
            data-testid="oh-kpi-due30"
          />
          <OhKpiStat
            label="Completed, 30 days"
            value={i?.completed.last_30_days ?? "—"}
            delta={{ value: completedDelta, goodWhen: "up", label: "vs previous 30" }}
            isLoading={insights.isLoading}
            data-testid="oh-kpi-completed"
          />
          <OhKpiStat
            label="Compliance, 3 months"
            value={i?.compliance.rate_3m !== null && i?.compliance.rate_3m !== undefined ? `${Math.round(i.compliance.rate_3m)}%` : "—"}
            delta={{ value: rateDelta, suffix: " pts", goodWhen: "up", label: "vs prior 3 months" }}
            hint={i && i.compliance.rate_3m === null ? "nothing fell due" : undefined}
            isLoading={insights.isLoading}
            data-testid="oh-kpi-compliance"
          />
        </OhKpiStrip>

        {alerts.length > 0 ? (
          <section
            className="flex flex-col gap-2 border-b border-dash-border/70 py-3 sm:flex-row sm:items-start sm:gap-4"
            data-testid="oh-fitness-validity-alerts"
            aria-label="Fitness certificate alerts"
          >
            <h2 className="flex shrink-0 items-center gap-2 text-[13px] font-semibold text-amber-800">
              <AlertTriangle className="size-4" aria-hidden />
              {alerts.length} fitness certificate{alerts.length === 1 ? "" : "s"} expiring within 30 days
            </h2>
            <ul className="flex min-w-0 flex-1 flex-wrap gap-x-5 gap-y-1 text-[13px] text-brand-slate">
              {(alertsExpanded ? alerts : alerts.slice(0, 4)).map((alert) => (
                <li key={alert.employment_episode_uuid} className="whitespace-nowrap">
                  <Link className="font-medium text-brand-navy underline-offset-2 hover:underline" href={ROUTES.occupationalHealthEmployment(alert.customer_uuid)}>
                    {alert.customer_name}
                  </Link>
                  <span className="text-dash-muted">
                    {" "}
                    · {alert.certificate_valid_to ? `valid to ${alert.certificate_valid_to}` : alert.alert_codes.map((c) => c.replace(/_/g, " ")).join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            {alerts.length > 4 ? (
              <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 self-start px-2 text-xs text-amber-800" onClick={() => setAlertsExpanded((v) => !v)}>
                {alertsExpanded ? "Show fewer" : `Show all ${alerts.length}`}
              </Button>
            ) : null}
          </section>
        ) : null}

        <div className="grid gap-10 border-b border-dash-border/70 py-7 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-dash-border/70">
          <OhPanel className={chartColumn} title="When work falls due" description="Open requirements by due window">
            <OhPanelState
              isLoading={insights.isLoading}
              error={insights.error}
              onRetry={() => void insights.refetch()}
              isEmpty={!i || i.totals.open === 0}
              emptyText="No open requirements."
              height={220}
            >
              {i ? (
                <OhColumnChart
                  label="Open requirements by due window"
                  data={WINDOW_BARS.map((w) => ({ key: w.key, label: w.label, value: i.due_windows[w.key], color: w.color }))}
                  height={220}
                />
              ) : null}
            </OhPanelState>
          </OhPanel>
          <OhPanel className={chartColumn} title="Open work by exam" description="Due and overdue, top exams">
            <OhPanelState isLoading={insights.isLoading} error={insights.error} onRetry={() => void insights.refetch()} isEmpty={!i?.by_exam.length} emptyText="No open requirements." height={220}>
              {i ? <OhBreakdownBars data={i.by_exam} label="Open requirements by exam" max={6} /> : null}
            </OhPanelState>
          </OhPanel>
          <OhPanel className={chartColumn} title="Open work by site" description="Where to plan clinic days">
            <OhPanelState isLoading={insights.isLoading} error={insights.error} onRetry={() => void insights.refetch()} isEmpty={!i?.by_site.length} emptyText="No open requirements." height={220}>
              {i ? <OhBreakdownBars data={i.by_site} label="Open requirements by site" max={6} /> : null}
            </OhPanelState>
          </OhPanel>
        </div>

        <div className="pt-7">
          {tab === "worklist" ? (
            <OhPanel
              title="Due & overdue requirements"
              description="Click a row for details. Select rows to send recalls or export."
              actions={<SurveillanceTabs tab={tab} onChange={setTab} count={rows.length} />}
            >
              <OhSurveillanceWorklist
                rows={rows}
                isLoading={campaignQuery.isLoading}
                error={campaignQuery.error}
                onRetry={() => void campaignQuery.refetch()}
                filters={filters}
                onFiltersChange={setFilters}
                onOpenRow={setOpenRow}
                onSchedule={(row) => setScheduleCustomer(customerStub(row))}
                onRecall={(list) => setRecallRows(list.filter((r) => r.uuid))}
              />
            </OhPanel>
          ) : (
            <OhSurveillanceRecallsCard tabs={<SurveillanceTabs tab={tab} onChange={setTab} count={rows.length} />} />
          )}
        </div>
      </div>

      <OhRequirementSheet
        row={openRow}
        onOpenChange={(open) => (!open ? setOpenRow(null) : undefined)}
        onSchedule={(row) => {
          setOpenRow(null);
          setScheduleCustomer(customerStub(row));
        }}
        onRecall={(row) => {
          setOpenRow(null);
          setRecallRows([row]);
        }}
      />

      <OhSendRecallDialog
        open={recallRows !== null}
        onOpenChange={(open) => (!open ? setRecallRows(null) : undefined)}
        requirementUuids={recallRows && recallRows.length > 0 ? recallRows.map((r) => r.uuid as string) : undefined}
      />

      <OhExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Export surveillance"
        description="Download the worklist as you see it, or the full compliance extract."
        options={[
          {
            id: "view",
            label: "Current worklist view (CSV)",
            description: "Rows matching the current search and filters, with worker, site and due date.",
            format: "csv",
            run: () => {
              const list = filterWorkRows(rows, filters);
              downloadText(
                `oh-surveillance-${new Date().toISOString().slice(0, 10)}.csv`,
                toCsv(
                  ["Worker", "Worker ID", "Employer", "Site", "Department", "Hazard profile", "Component", "Exam type", "Due date", "Status"],
                  list.map((r) => [r.customer_name, r.customer_identifier, r.employer, r.site, r.department_name, r.hazard_profile, r.component_code, r.examLabel, r.due_date, r.overdue ? "overdue" : "due"]),
                ),
              );
            },
          },
          {
            id: "extract",
            label: "Compliance extract (CSV)",
            description: "Every requirement with its status, from the OH service.",
            format: "csv",
            run: exportExtract,
          },
        ]}
      />

      {scheduleCustomer ? (
        <CreateAppointmentDialog
          customer={scheduleCustomer}
          open
          onOpenChange={(open) => {
            if (!open) {
              setScheduleCustomer(null);
            }
          }}
          onCreated={() => setScheduleCustomer(null)}
        />
      ) : null}
    </ListPageLayout>
  );
}
