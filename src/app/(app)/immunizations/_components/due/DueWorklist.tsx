"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { EmptyAction } from "../shared/EmptyAction";
import { ImmEmployeeLink } from "../shared/ImmEmployeeLink";
import { ImmInsightStrip } from "../shared/ImmInsightStrip";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmSelectBox, ImmStatusBadge } from "../shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "../shared/ImmSearchBar";
import { ImmNotice, ImmTabsBar } from "../shared/ImmTabsBar";
import { ImmAvatar, ImmDateCell, ImmDoseProgress, daysFromToday } from "../shared/ImmVisuals";
import { QuietLoading } from "../shared/QuietLoading";
import { STATUS_LABEL } from "../shared/status-label";
import { useImmList } from "../shared/use-imm-list";
import {
  type OhImmStatus,
  fetchOhImmDueFiltered,
  fetchOhImmExposureDueFollowups,
  fetchOhImmFitTestsDue,
  remindOhImm,
} from "@/features/occupational-health/services/immunisation.service";

type DueView = "doses" | "fit" | "followups";
type DoseLayout = "dose" | "employee";
type EmployeeRow = { customer_uuid: string; items: OhImmStatus[]; overdue: number; earliest: string | null };

const STATUS_RANK: Record<string, number> = { overdue: 0, non_responder: 1, due: 2, up_to_date: 3, exempt: 4 };
const FILTER_INPUT = "h-8 w-36 rounded-lg text-[13px]";

function groupByEmployee(rows: OhImmStatus[]): EmployeeRow[] {
  const groups = new Map<string, OhImmStatus[]>();
  for (const row of rows) groups.set(row.customer_uuid, [...(groups.get(row.customer_uuid) ?? []), row]);
  return Array.from(groups, ([customer_uuid, items]) => ({
    customer_uuid,
    items: items.toSorted((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9)),
    overdue: items.filter((item) => item.status === "overdue").length,
    earliest: items.map((item) => item.next_due_date).filter((d): d is string => Boolean(d)).sort()[0] ?? null,
  }));
}

export function DueWorklist({
  rows,
  loading,
  seeding = false,
  onLoadExamples,
}: {
  rows: OhImmStatus[];
  loading: boolean;
  seeding?: boolean;
  onLoadExamples?: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<DueView>("doses");
  const [layout, setLayout] = useState<DoseLayout>("dose");
  const [selected, setSelected] = useState<string[]>([]);
  const [employer, setEmployer] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");

  const filteredQuery = useQuery({
    queryKey: ["oh-imm-due-filtered", employer, department, status],
    queryFn: () => fetchOhImmDueFiltered(30, { employer, department, status }),
  });
  const allQuery = useQuery({
    queryKey: ["oh-imm-due-filtered", "", "", ""],
    queryFn: () => fetchOhImmDueFiltered(30, { employer: "", department: "", status: "" }),
  });
  const fitDue = useQuery({ queryKey: ["oh-imm-fit-due-in-due"], queryFn: () => fetchOhImmFitTestsDue(30) });
  const followups = useQuery({ queryKey: ["oh-imm-exp-followups-due"], queryFn: () => fetchOhImmExposureDueFollowups(14) });

  const list = filteredQuery.data ?? rows;
  const everyone = allQuery.data ?? rows;
  const fitRows = fitDue.data ?? [];
  const followupRows = followups.data ?? [];

  const doseList = useImmList({
    rows: list,
    searchText: (row) => [row.customer_uuid, row.vaccine_code, row.vaccine_name].join(" "),
    sortValue: (row, key) =>
      key === "vaccine"
        ? (row.vaccine_name ?? row.vaccine_code)
        : key === "employee"
          ? row.customer_uuid
          : key === "last"
            ? row.last_dose_date
            : key === "status"
              ? (STATUS_RANK[row.status] ?? 9)
              : key === "doses"
                ? row.doses_required
                  ? row.doses_received / row.doses_required
                  : null
                : row.next_due_date,
    defaultSort: { key: "next", direction: "asc" },
  });
  const employeeList = useImmList({
    rows: groupByEmployee(doseList.matchedRows),
    sortValue: (row, key) => (key === "count" ? row.items.length : key === "overdue" ? row.overdue : row.earliest),
    defaultSort: { key: "overdue", direction: "desc" },
  });
  const fitList = useImmList({
    rows: fitRows,
    searchText: (row) => String(row.customer_uuid ?? ""),
    sortValue: (row) => String(row.expires_on ?? ""),
    defaultSort: { key: "expires", direction: "asc" },
  });
  const followupList = useImmList({
    rows: followupRows,
    searchText: (row) => [row.customer_initials, row.label, row.exposure_type].map(String).join(" "),
    sortValue: (row) => String(row.due_date ?? ""),
    defaultSort: { key: "due", direction: "asc" },
  });

  const remind = useMutation({
    mutationFn: () => remindOhImm(selected, "email"),
    onSuccess: (result) => {
      const skipped = result.filter((r) => r.status === "skipped_unconfigured").length;
      toast({
        variant: "success",
        title: "Reminders queued",
        description:
          skipped > 0 ? `${result.length} queued · ${skipped} skipped (mail not configured).` : `${result.length} reminder(s) processed.`,
      });
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ["oh-imm-due"] });
    },
    onError: (error) =>
      toast({ variant: "error", title: "Could not remind", description: error instanceof Error ? error.message : "Try again." }),
  });

  if (loading && filteredQuery.isLoading) return <QuietLoading />;

  const overdueCount = everyone.filter((row) => row.status === "overdue").length;
  const dueCount = everyone.filter((row) => row.status === "due").length;
  const nonResponders = everyone.filter((row) => row.status === "non_responder").length;
  const people = new Set(everyone.map((row) => row.customer_uuid)).size;
  const dueThisWeek = everyone.filter((row) => {
    const days = daysFromToday(row.next_due_date);
    return days != null && days >= 0 && days <= 7;
  }).length;

  const hasFilters = Boolean(employer || department || status || doseList.query);
  const matchingIds = doseList.matchedRows.map((row) => row.uuid);
  const pageIds = doseList.pageRows.map((row) => row.uuid);
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const toggle = (ids: string[], on: boolean) =>
    setSelected((prev) => (on ? Array.from(new Set([...prev, ...ids])) : prev.filter((id) => !ids.includes(id))));
  const filterStatus = (next: string) => {
    setView("doses");
    setStatus((current) => (current === next ? "" : next));
  };
  const clearFilters = () => {
    setEmployer("");
    setDepartment("");
    setStatus("");
    doseList.setQuery("");
  };

  return (
    <>
      <ImmTabsBar
        label="Due records"
        active={view}
        onChange={setView}
        tabs={[
          { key: "doses", label: "Doses", count: list.length },
          { key: "fit", label: "Fit tests", count: fitRows.length },
          { key: "followups", label: "Exposure follow-ups", count: followupRows.length },
        ]}
        actions={
          <>
            {onLoadExamples ? (
              <SecondaryButton type="button" className="h-8" disabled={seeding} onClick={onLoadExamples}>
                {seeding ? "Loading…" : "Load example packs"}
              </SecondaryButton>
            ) : null}
            {view === "doses" ? (
              <PageActionButton type="button" disabled={selected.length === 0 || remind.isPending} onClick={() => remind.mutate()}>
                Remind selected ({selected.length})
              </PageActionButton>
            ) : null}
          </>
        }
      />
      <ImmInsightStrip
        testId="oh-imm-due-insights"
        items={[
          {
            label: "overdue",
            value: overdueCount,
            tone: overdueCount > 0 ? "danger" : "default",
            onSelect: () => filterStatus("overdue"),
            active: view === "doses" && status === "overdue",
          },
          {
            label: "due",
            value: dueCount,
            tone: dueCount > 0 ? "warning" : "default",
            hint: `${dueThisWeek} this week`,
            onSelect: () => filterStatus("due"),
            active: view === "doses" && status === "due",
          },
          {
            label: "non-responders",
            value: nonResponders,
            onSelect: () => filterStatus("non_responder"),
            active: view === "doses" && status === "non_responder",
          },
          { label: "people", value: people },
          { label: "fit tests due", value: fitRows.length, onSelect: () => setView("fit"), active: view === "fit" },
        ]}
      />

      {view === "doses" ? (
        <>
          <ImmSearchBar
            value={doseList.query}
            onChange={doseList.setQuery}
            placeholder="Search employee or vaccine"
            matched={doseList.controls.matched}
            total={everyone.length}
            onClear={hasFilters ? clearFilters : undefined}
            filters={
              <>
                <Input aria-label="Employer" className={FILTER_INPUT} value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="Employer" />
                <Input
                  aria-label="Department"
                  className={FILTER_INPUT}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Department"
                />
                <ImmFilterSelect label="Status" value={status} onChange={setStatus}>
                  <option value="">Any status</option>
                  <option value="due">Due</option>
                  <option value="overdue">Overdue</option>
                  <option value="non_responder">Non-responder</option>
                </ImmFilterSelect>
                <div className="inline-flex h-8 items-center rounded-lg border border-dash-border p-0.5" role="group" aria-label="Layout">
                  {(["dose", "employee"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={layout === option}
                      onClick={() => setLayout(option)}
                      className={cn(
                        "h-full rounded-md px-2.5 text-[12px] font-medium transition-colors",
                        layout === option ? "bg-brand-navy text-white" : "text-brand-slate hover:bg-dash-canvas",
                      )}
                    >
                      {option === "dose" ? "By dose" : "By employee"}
                    </button>
                  ))}
                </div>
              </>
            }
          />
          {selected.length > 0 ? (
            <ImmNotice>
              <span className="font-medium text-brand-navy">{selected.length} selected</span>
              {matchingIds.length > selected.length ? (
                <>
                  <span className="mx-2 text-dash-muted">·</span>
                  <button type="button" className="font-medium text-brand-primary hover:underline" onClick={() => toggle(matchingIds, true)}>
                    Select all {matchingIds.length} matching
                  </button>
                </>
              ) : null}
              <span className="mx-2 text-dash-muted">·</span>
              <button type="button" className="text-brand-slate hover:underline" onClick={() => setSelected([])}>
                Clear selection
              </button>
            </ImmNotice>
          ) : null}
          {doseList.controls.matched === 0 ? (
            <EmptyAction icon="calendar" title="Nobody matches" description="Adjust filters or wait until doses fall due." />
          ) : layout === "dose" ? (
            <ImmRecordTable
              list={doseList.controls}
              columns={[
                {
                  label: "",
                  className: "w-10",
                  header: (
                    <ImmSelectBox
                      label="Select doses on this page"
                      checked={pageAllSelected}
                      indeterminate={!pageAllSelected && pageIds.some((id) => selected.includes(id))}
                      onChange={() => toggle(pageIds, !pageAllSelected)}
                    />
                  ),
                },
                { label: "Employee", sortKey: "employee" },
                { label: "Vaccine", sortKey: "vaccine" },
                { label: "Doses", sortKey: "doses" },
                { label: "Last dose", sortKey: "last" },
                { label: "Next due", sortKey: "next" },
                { label: "Status", sortKey: "status" },
              ]}
            >
              {doseList.pageRows.map((row) => {
                const checked = selected.includes(row.uuid);
                return (
                  <ListPageDataTableRow
                    key={`${row.customer_uuid}-${row.vaccine_code}-${row.uuid}`}
                    className={cn("cursor-pointer", checked && "bg-brand-tint/40")}
                    onClick={() => toggle([row.uuid], !checked)}
                  >
                    <ListPageDataTableCell className="w-10 pl-4 md:pl-6">
                      <ImmSelectBox label={`Select ${row.vaccine_code}`} checked={checked} onChange={() => toggle([row.uuid], !checked)} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmEmployeeLink uuid={row.customer_uuid} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmPrimaryCell title={row.vaccine_name ?? row.vaccine_code} detail={row.vaccine_name ? row.vaccine_code : undefined} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmDoseProgress received={row.doses_received} required={row.doses_required} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="whitespace-nowrap">{row.last_dose_date ?? "—"}</ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmDateCell date={row.next_due_date} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmStatusBadge status={row.status} label={STATUS_LABEL[row.status]} />
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                );
              })}
            </ImmRecordTable>
          ) : (
            <ImmRecordTable
              list={employeeList.controls}
              columns={[
                "Employee",
                "Outstanding vaccines",
                { label: "Records", sortKey: "count", align: "right" },
                { label: "Overdue", sortKey: "overdue", align: "right" },
                { label: "Earliest due", sortKey: "earliest" },
                "Actions",
              ]}
            >
              {employeeList.pageRows.map((group) => {
                const ids = group.items.map((item) => item.uuid);
                const allChosen = ids.every((id) => selected.includes(id));
                return (
                  <ListPageDataTableRow key={group.customer_uuid}>
                    <ListPageDataTableCell className="pl-4 md:pl-6">
                      <ImmEmployeeLink uuid={group.customer_uuid} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <span className="flex flex-wrap gap-1">
                        {group.items.map((item) => (
                          <span
                            key={item.uuid}
                            title={`${item.vaccine_name ?? item.vaccine_code} · ${STATUS_LABEL[item.status] ?? item.status}`}
                            className={cn(
                              "rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                              item.status === "overdue" || item.status === "non_responder"
                                ? "bg-red-50 text-red-700"
                                : item.status === "due"
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-emerald-50 text-emerald-700",
                            )}
                          >
                            {item.vaccine_code}
                          </span>
                        ))}
                      </span>
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="text-right tabular-nums">{group.items.length}</ListPageDataTableCell>
                    <ListPageDataTableCell className={cn("text-right tabular-nums", group.overdue > 0 && "font-semibold text-red-700")}>
                      {group.overdue}
                    </ListPageDataTableCell>
                    <ListPageDataTableCell>
                      <ImmDateCell date={group.earliest} />
                    </ListPageDataTableCell>
                    <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                      <ImmRowAction onClick={() => toggle(ids, !allChosen)}>{allChosen ? "Deselect" : "Select all"}</ImmRowAction>
                    </ListPageDataTableCell>
                  </ListPageDataTableRow>
                );
              })}
            </ImmRecordTable>
          )}
        </>
      ) : null}

      {view === "fit" ? (
        fitRows.length === 0 ? (
          <EmptyAction icon="shield" title="No fit tests due" description="Respirator fit tests that expire in the next 30 days appear here." />
        ) : (
          <div data-testid="oh-imm-fit-due-panel" data-list-band>
            <ImmRecordTable list={fitList.controls} columns={["Employee", "Respirator", { label: "Expires", sortKey: "expires" }, "Status"]}>
              {fitList.pageRows.map((fit) => (
                <ListPageDataTableRow key={String(fit.uuid)}>
                  <ListPageDataTableCell className="pl-4 md:pl-6">
                    <ImmEmployeeLink uuid={String(fit.customer_uuid)} />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>{String(fit.respirator_model ?? "—")}</ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <ImmDateCell date={String(fit.expires_on ?? "")} warnWithinDays={30} />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <ImmStatusBadge status={String(fit.status ?? "due")} />
                  </ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ImmRecordTable>
          </div>
        )
      ) : null}

      {view === "followups" ? (
        followupRows.length === 0 ? (
          <EmptyAction icon="activity" title="No follow-ups due" description="Exposure follow-up labs due in the next 14 days appear here." />
        ) : (
          <ImmRecordTable list={followupList.controls} columns={["Employee", "Follow-up", { label: "Due", sortKey: "due" }, "Status"]}>
            {followupList.pageRows.map((row) => (
              <ListPageDataTableRow key={String(row.uuid)}>
                <ListPageDataTableCell className="pl-4 md:pl-6">
                  <span className="inline-flex items-center gap-2 font-mono text-[12px]">
                    <ImmAvatar text={String(row.customer_initials ?? "")} />
                    {String(row.customer_initials ?? "—")}
                  </span>
                </ListPageDataTableCell>
                <ListPageDataTableCell className="font-medium text-brand-navy">{String(row.label ?? "—")}</ListPageDataTableCell>
                <ListPageDataTableCell>
                  <ImmDateCell date={String(row.due_date ?? "")} warnWithinDays={7} />
                </ListPageDataTableCell>
                <ListPageDataTableCell>
                  <ImmStatusBadge status={String(row.status ?? "")} />
                </ListPageDataTableCell>
              </ListPageDataTableRow>
            ))}
          </ImmRecordTable>
        )
      ) : null}
    </>
  );
}
