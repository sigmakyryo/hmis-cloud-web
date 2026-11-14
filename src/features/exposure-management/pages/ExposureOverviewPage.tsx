"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { ROUTES } from "@/constants/routes";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmInsightStrip } from "@/app/(app)/immunizations/_components/shared/ImmInsightStrip";
import { ImmPrimaryCell, ImmRecordTable } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { EventStatusBadge, SeverityBadge } from "@/features/exposure-management/components/ExposureBadges";
import { ExposureHeatmap } from "@/features/exposure-management/components/ExposureHeatmap";
import { errorMessage, formatDate } from "@/features/exposure-management/lib/exposure-format";
import { exposureKeys, fetchExposureDashboard } from "@/features/exposure-management/services/exposure.service";

export function ExposureOverviewPage() {
  const query = useQuery({ queryKey: exposureKeys.dashboard, queryFn: fetchExposureDashboard });

  if (query.isPending) {
    return (
      <ImmPageShell testId="exposure-overview-page" title="Exposure management">
        <QuietLoading />
      </ImmPageShell>
    );
  }
  if (query.isError) {
    return (
      <ImmPageShell testId="exposure-overview-page" title="Exposure management">
        <LoadError>{errorMessage(query.error, "Could not load the exposure overview.")}</LoadError>
      </ImmPageShell>
    );
  }

  const { kpis, events, biological } = query.data;
  const empty = query.data.groups.length === 0;

  return (
    <ImmPageShell testId="exposure-overview-page" title="Exposure management">
      <ImmInsightStrip
        testId="exposure-kpis"
        items={[
          { label: "Open events", value: kpis.open_events, tone: kpis.open_events ? "warning" : "success", hint: `${kpis.overdue_events} overdue` },
          { label: "Critical", value: kpis.open_critical, tone: kpis.open_critical ? "danger" : "default" },
          { label: "Exceeds limit", value: kpis.open_exceeds, tone: kpis.open_exceeds ? "danger" : "default" },
          { label: "Results (30 days)", value: kpis.measurements_30d },
          { label: "Sampling overdue", value: kpis.plans_overdue, tone: kpis.plans_overdue ? "warning" : "default", hint: `${kpis.plans_due_soon} due soon` },
          { label: "Calibrations overdue", value: kpis.calibrations_overdue, tone: kpis.calibrations_overdue ? "warning" : "default", hint: `${kpis.calibrations_due_soon} due soon` },
          { label: "Assessments to review", value: kpis.reviews_due },
          { label: "Controls overdue", value: kpis.controls_overdue, tone: kpis.controls_overdue ? "danger" : "default" },
        ]}
      />
      {empty ? (
        <EmptyAction
          title="No exposure groups yet"
          description="Define similar exposure groups and load the reference agents to start tracking exposures."
          icon="activity"
          action={
            <Link href={ROUTES.exposureManagementGroups} className="text-[13px] font-medium text-brand-primary hover:underline">
              Set up groups
            </Link>
          }
        />
      ) : (
        <ExposureHeatmap dashboard={query.data} />
      )}
      <ImmRecordTable columns={["Open event", "Group", "Severity", "Status", "Due"]}>
        {events.length === 0 ? (
          <ListPageDataTableRow>
            <ListPageDataTableCell colSpan={5} className="pl-4 text-dash-muted md:pl-6">
              No open overexposure events.
            </ListPageDataTableCell>
          </ListPageDataTableRow>
        ) : (
          events.map((event) => (
            <ListPageDataTableRow key={event.uuid}>
              <ListPageDataTableCell className="pl-4 md:pl-6">
                <ImmPrimaryCell
                  title={<Link href={`${ROUTES.exposureManagementEvents}?event=${event.uuid}`} className="hover:underline">{event.agent_name ?? event.kind}</Link>}
                  detail={event.worker_label}
                />
              </ListPageDataTableCell>
              <ListPageDataTableCell>{event.group_name ?? "—"}</ListPageDataTableCell>
              <ListPageDataTableCell><SeverityBadge severity={event.severity} /></ListPageDataTableCell>
              <ListPageDataTableCell><EventStatusBadge status={event.status} /></ListPageDataTableCell>
              <ListPageDataTableCell className={event.overdue ? "font-medium text-red-700" : undefined}>{formatDate(event.due_on)}</ListPageDataTableCell>
            </ListPageDataTableRow>
          ))
        )}
      </ImmRecordTable>
      <p data-list-band className="px-4 py-3 text-[13px] text-brand-slate md:px-6">
        Biological incidents: {biological.open_incidents} open, {biological.urgent} urgent, {biological.followups_due} follow-ups due.{" "}
        <Link href={ROUTES.exposureManagementIncidents} className="font-medium text-brand-primary hover:underline">
          Open incidents
        </Link>
      </p>
    </ImmPageShell>
  );
}
