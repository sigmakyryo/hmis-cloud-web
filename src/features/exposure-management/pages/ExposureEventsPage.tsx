"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmInsightStrip } from "@/app/(app)/immunizations/_components/shared/ImmInsightStrip";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "@/app/(app)/immunizations/_components/shared/ImmSearchBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";
import { EventStatusBadge, SeverityBadge } from "@/features/exposure-management/components/ExposureBadges";
import { ExposureEventSheet } from "@/features/exposure-management/components/ExposureEventSheet";
import type { ExposureEvent } from "@/features/exposure-management/exposure.types";
import { EVENT_STATUS_LABELS, SEVERITY_LABELS, errorMessage, formatDate } from "@/features/exposure-management/lib/exposure-format";
import { exposureKeys, fetchEvents } from "@/features/exposure-management/services/exposure.service";

const SEVERITY_RANK: Record<string, number> = { critical: 0, exceeds_limit: 1, action_level: 2 };

export function ExposureEventsPage() {
  const params = useSearchParams();
  const [selected, setSelected] = useState<string | null>(params.get("event"));
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const query = useQuery({ queryKey: exposureKeys.events, queryFn: () => fetchEvents() });

  const rows = (query.data ?? []).filter(
    (event) => (!status || event.status === status) && (!severity || event.severity === severity) && (!overdueOnly || event.overdue),
  );
  const list = useImmList<ExposureEvent>({
    rows,
    searchText: (event) => [event.agent_name, event.group_name, event.worker_label, event.summary].join(" "),
    sortValue: (event, key) => (key === "severity" ? (SEVERITY_RANK[event.severity] ?? 9) : key === "due" ? event.due_on : event.detected_at),
    defaultSort: { key: "severity", direction: "asc" },
  });
  const all = query.data ?? [];
  const open = all.filter((event) => event.status !== "closed");

  return (
    <ImmPageShell testId="exposure-events-page" title="Overexposure events">
      <ImmInsightStrip
        items={[
          { label: "Open", value: open.length },
          { label: "Critical", value: open.filter((e) => e.severity === "critical").length, tone: "danger", onSelect: () => setSeverity(severity === "critical" ? "" : "critical"), active: severity === "critical" },
          { label: "Overdue", value: open.filter((e) => e.overdue).length, tone: "warning", onSelect: () => setOverdueOnly((v) => !v), active: overdueOnly },
          { label: "Closed", value: all.length - open.length, tone: "success" },
        ]}
      />
      <ImmSearchBar
        value={list.query}
        onChange={list.setQuery}
        placeholder="Search agent, group or worker"
        matched={list.controls.matched}
        total={all.length}
        onClear={() => {
          list.setQuery("");
          setStatus("");
          setSeverity("");
          setOverdueOnly(false);
        }}
        filters={
          <>
            <ImmFilterSelect label="Status" value={status} onChange={setStatus}>
              <option value="">All statuses</option>
              {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </ImmFilterSelect>
            <ImmFilterSelect label="Severity" value={severity} onChange={setSeverity}>
              <option value="">All severities</option>
              {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </ImmFilterSelect>
          </>
        }
      />
      {query.isPending ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorMessage(query.error, "Could not load events.")}</LoadError> : null}
      {query.data && all.length === 0 ? (
        <EmptyAction title="No overexposure events" description="Events appear here when a result reaches an action level or exceeds a limit." icon="activity" />
      ) : null}
      {query.data && all.length > 0 ? (
        <ImmRecordTable
          list={list.controls}
          columns={[
            { label: "Agent", sortKey: "detected" },
            "Group",
            { label: "Severity", sortKey: "severity" },
            "Status",
            { label: "Due", sortKey: "due" },
          ]}
        >
          {list.pageRows.map((event) => (
            <ListPageDataTableRow key={event.uuid} onClick={() => setSelected(event.uuid)} className="cursor-pointer">
              <ListPageDataTableCell className="pl-4 md:pl-6">
                <ImmPrimaryCell title={event.agent_name ?? event.kind} detail={`${event.worker_label} · ${formatDate(event.detected_at)}`} />
              </ListPageDataTableCell>
              <ListPageDataTableCell>{event.group_name ?? "—"}</ListPageDataTableCell>
              <ListPageDataTableCell><SeverityBadge severity={event.severity} /></ListPageDataTableCell>
              <ListPageDataTableCell><EventStatusBadge status={event.status} /></ListPageDataTableCell>
              <ListPageDataTableCell className={event.overdue ? "font-medium text-red-700" : undefined}>{formatDate(event.due_on)}</ListPageDataTableCell>
            </ListPageDataTableRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {selected ? <ExposureEventSheet uuid={selected} onClose={() => setSelected(null)} /> : null}
    </ImmPageShell>
  );
}
