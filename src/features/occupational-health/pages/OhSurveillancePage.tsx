"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, BellRing, Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ListPageLayout } from "@/features/app-shell/components/page-layout";
import { CreateAppointmentDialog } from "@/features/appointments/components/CreateAppointmentDialog";
import type { Customer } from "@/features/customers/types/customer.types";
import { OhAccessDenied } from "@/features/occupational-health/components/OhAccessDenied";
import { OhSurveillanceRecallsCard } from "@/features/occupational-health/components/OhSurveillanceRecallsCard";
import { OhExportDialog } from "@/features/occupational-health/components/dashboard/OhExportDialog";
import { OhSection } from "@/features/occupational-health/components/dashboard/OhSection";
import { OhSegmented } from "@/features/occupational-health/components/dashboard/OhSegmented";
import { downloadText, toCsv } from "@/features/occupational-health/components/dashboard/oh-table";
import { OhClinicDayPlanner } from "@/features/occupational-health/components/surveillance/OhClinicDayPlanner";
import { OhDueRunway, type OhRunwayCounts } from "@/features/occupational-health/components/surveillance/OhDueRunway";
import { OhRequirementSheet } from "@/features/occupational-health/components/surveillance/OhRequirementSheet";
import { OhSendRecallDialog } from "@/features/occupational-health/components/surveillance/OhSendRecallDialog";
import {
  EMPTY_WORKLIST_FILTERS,
  OhSurveillanceWorklist,
  filterWorkRows,
  type OhWorklistFilters,
} from "@/features/occupational-health/components/surveillance/OhSurveillanceWorklist";
import { linkFromParams, toWorkRows, type OhWorkRow } from "@/features/occupational-health/components/surveillance/oh-surveillance-utils";
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

/** Due windows counted from the worklist, for when the service has not answered. */
function countWindows(rows: OhWorkRow[]): OhRunwayCounts {
  const counts: OhRunwayCounts = { overdue_30_plus: 0, overdue: 0, next_7: 0, next_30: 0, next_90: 0, later: 0 };
  for (const row of rows) {
    const d = row.days;
    if (row.overdue) counts[d !== null && d <= -30 ? "overdue_30_plus" : "overdue"] += 1;
    else if (d === null || d > 90) counts.later += 1;
    else if (d <= 7) counts.next_7 += 1;
    else if (d <= 30) counts.next_30 += 1;
    else counts.next_90 += 1;
  }
  return counts;
}

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
  const searchParams = useSearchParams();
  // Why: other pages (compliance) link here with filters in the URL; they set where the worklist starts.
  const [filters, setFilters] = useState<OhWorklistFilters>(() => {
    const link = linkFromParams(searchParams);
    return {
      ...EMPTY_WORKLIST_FILTERS,
      status: link.status ?? "all",
      due: link.due ?? "any",
      exam: link.exam ?? "",
      hazard: link.hazard ?? "",
      site: link.site ?? "",
      search: link.q ?? "",
    };
  });
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
  const windows = i?.due_windows ?? countWindows(rows);
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
  const showWorklist = () => document.getElementById("oh-worklist")?.scrollIntoView({ behavior: "smooth", block: "start" });

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

        <OhDueRunway
          counts={windows}
          filters={filters}
          onFilter={(patch) => applyQuick(patch)}
          onShowAll={() => applyQuick({})}
          stats={
            insights.isError ? (
              <span role="alert" className="text-amber-800">
                Trends could not be loaded, so these counts come from the worklist.{" "}
                <button type="button" className="font-medium text-brand-primary hover:underline" onClick={() => void insights.refetch()}>
                  Try again
                </button>
              </span>
            ) : (
            <>
              <span data-testid="oh-kpi-completed">
                <span className="font-semibold text-brand-navy tabular-nums">{i?.completed.last_30_days ?? "—"}</span> done in 30 days
                {completedDelta !== null ? (
                  <span className={completedDelta >= 0 ? "text-brand-primary" : "text-red-700"}> ({completedDelta >= 0 ? `+${completedDelta}` : completedDelta})</span>
                ) : null}
              </span>
              <span data-testid="oh-kpi-compliance">
                <span className="font-semibold text-brand-navy tabular-nums">{i?.compliance.rate_3m != null ? `${Math.round(i.compliance.rate_3m)}%` : "—"}</span> compliance, 3 months
                {rateDelta !== null ? (
                  <span className={rateDelta >= 0 ? "text-brand-primary" : "text-red-700"}> ({rateDelta >= 0 ? "+" : ""}{Math.round(rateDelta * 10) / 10} pts)</span>
                ) : null}
              </span>
            </>
            )
          }
        />

        {alerts.length > 0 ? (
          <section
            className="flex flex-col gap-2 border-b border-dash-border/70 border-l-[3px] border-l-amber-500 py-3 pl-4 sm:flex-row sm:items-start sm:gap-4"
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

        <OhClinicDayPlanner
          rows={rows}
          selected={{ site: filters.site, exam: filters.exam }}
          onSelect={(site, exam) => {
            applyQuick({ site, exam });
            showWorklist();
          }}
        />

        <div className="pt-7" id="oh-worklist">
          {tab === "worklist" ? (
            <OhSection
              title="Due and overdue checks"
              description="Open a row for details. Select rows to send recalls or export them."
              action={<SurveillanceTabs tab={tab} onChange={setTab} count={rows.length} />}
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
            </OhSection>
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
