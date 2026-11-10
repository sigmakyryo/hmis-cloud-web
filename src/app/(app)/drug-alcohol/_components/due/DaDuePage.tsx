"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmEmployeeLink } from "@/app/(app)/immunizations/_components/shared/ImmEmployeeLink";
import { ImmInsightStrip } from "@/app/(app)/immunizations/_components/shared/ImmInsightStrip";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmRowAction,
  ImmStatusBadge,
} from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "@/app/(app)/immunizations/_components/shared/ImmSearchBar";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";
import {
  excuseDaSelection,
  fetchDaDue,
  noShowDaSelection,
  notifyDaSelection,
  type DaDueRow,
} from "@/features/occupational-health/services/drug-alcohol.service";
import { useToast } from "@/providers/toast-provider";
import { DUE_KIND_LABEL, errorText, fmtDateTime, label } from "../shared/da-format";
import { DaTestSheet } from "../shared/DaTestSheet";
import { DaCell, DaRow } from "../shared/da-ui";

type View = "all" | "tests" | "waiting" | "review";

const VIEW_KINDS: Record<View, string[] | null> = {
  all: null,
  tests: ["random", "follow_up", "rtd_test", "retest"],
  waiting: ["alcohol_confirm", "shy", "lab_overdue", "sap"],
  review: ["mro", "restricted"],
};

export const DA_DUE_KEY = ["oh-da", "due"] as const;

export function DaDuePage() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [view, setView] = useState<View>("all");
  const [within, setWithin] = useState("14");
  const [openTest, setOpenTest] = useState<string | null>(null);
  const query = useQuery({ queryKey: [...DA_DUE_KEY, within], queryFn: () => fetchDaDue(Number(within)) });
  const rows = useMemo(() => query.data?.rows ?? [], [query.data]);
  const counts = query.data?.counts ?? {};

  const visible = useMemo(() => {
    const kinds = VIEW_KINDS[view];
    return kinds ? rows.filter((row) => kinds.includes(row.kind)) : rows;
  }, [rows, view]);

  const list = useImmList<DaDueRow>({
    rows: visible,
    searchText: (row) => `${row.customer_initials} ${row.label} ${row.kind} ${row.customer_uuid}`,
    sortValue: (row, key) => (key === "due" ? row.due_at : key === "kind" ? row.kind : row.status),
    defaultSort: { key: "due", direction: "asc" },
  });

  const refresh = () => client.invalidateQueries({ queryKey: ["oh-da"] });
  const action = useMutation({
    mutationFn: async ({ kind, uuid }: { kind: "notify" | "no_show" | "excuse"; uuid: string }) => {
      if (kind === "notify") return notifyDaSelection(uuid);
      if (kind === "no_show") return noShowDaSelection(uuid, true);
      const reason = window.prompt("Why is this person excused? (for example: on leave)") ?? "";
      if (!reason.trim()) throw new Error("No reason given, nothing changed.");
      return excuseDaSelection(uuid, reason.trim());
    },
    onSuccess: (_data, vars) => {
      toast({
        variant: "success",
        title: vars.kind === "notify" ? "Worker notified" : vars.kind === "no_show" ? "Marked as no-show" : "Excused - next standby selected",
      });
      void refresh();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  const count = (kinds: string[]) => kinds.reduce((sum, kind) => sum + (counts[kind] ?? 0), 0);

  return (
    <ImmPageShell title="Due & overdue" testId="oh-da-due-page">
      <ImmTabsBar<View>
        label="Due views"
        tabs={[
          { key: "all", label: "Everything", count: counts.total ?? rows.length },
          { key: "tests", label: "Tests to do", count: count(VIEW_KINDS.tests ?? []) },
          { key: "waiting", label: "Waiting", count: count(VIEW_KINDS.waiting ?? []) },
          { key: "review", label: "Review & stood down", count: count(VIEW_KINDS.review ?? []) },
        ]}
        active={view}
        onChange={setView}
      />
      <ImmInsightStrip
        testId="oh-da-due-insights"
        items={[
          { label: "Overdue", value: counts.overdue ?? 0, tone: (counts.overdue ?? 0) > 0 ? "danger" : "default" },
          { label: "Random tests", value: counts.random ?? 0 },
          { label: "Follow-ups", value: counts.follow_up ?? 0 },
          { label: "Medical review", value: counts.mro_pending ?? counts.mro ?? 0, tone: "warning" },
        ]}
      />
      <ImmSearchBar
        value={list.query}
        onChange={list.setQuery}
        placeholder="Search initials or task"
        matched={list.controls.matched}
        total={list.total}
        onClear={() => list.setQuery("")}
        filters={
          <ImmFilterSelect label="Due within" value={within} onChange={setWithin}>
            <option value="7">Next 7 days</option>
            <option value="14">Next 14 days</option>
            <option value="30">Next 30 days</option>
            <option value="90">Next 90 days</option>
          </ImmFilterSelect>
        }
      />
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load the worklist.")}</LoadError> : null}
      {query.isSuccess && list.controls.matched === 0 ? (
        <EmptyAction icon="flask" title="Nothing due" description="Random selections, follow-ups and waits will show here." />
      ) : null}
      {query.isSuccess && list.controls.matched > 0 ? (
        <ImmRecordTable
          list={list.controls}
          columns={[
            "Worker",
            { label: "Task", sortKey: "kind" },
            { label: "Due", sortKey: "due" },
            { label: "Status", sortKey: "status" },
            "Actions",
          ]}
        >
          {list.pageRows.map((row) => {
            const testUuid = row.links.test_uuid ?? null;
            const selection = row.kind === "random" ? row.uuid : null;
            const open = ["selected", "notified", "overdue"].includes(row.status);
            return (
              <DaRow key={`${row.kind}-${row.uuid}`} testId="oh-da-due-row" onClick={testUuid ? () => setOpenTest(testUuid) : undefined}>
                <DaCell first>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-brand-navy">{row.customer_initials || "—"}</span>
                    {row.customer_uuid ? <ImmEmployeeLink uuid={row.customer_uuid} /> : null}
                  </div>
                </DaCell>
                <DaCell>
                  <ImmPrimaryCell title={row.label} detail={label(DUE_KIND_LABEL, row.kind)} />
                </DaCell>
                <DaCell>{fmtDateTime(row.due_at)}</DaCell>
                <DaCell>
                  <ImmStatusBadge status={row.status} />
                </DaCell>
                <DaCell actions>
                  {selection && open ? (
                    <>
                      {row.status === "selected" ? (
                        <ImmRowAction disabled={action.isPending} onClick={() => action.mutate({ kind: "notify", uuid: selection })}>
                          Notify
                        </ImmRowAction>
                      ) : null}
                      <ImmRowAction disabled={action.isPending} onClick={() => action.mutate({ kind: "excuse", uuid: selection })}>
                        Excuse
                      </ImmRowAction>
                      {row.status !== "selected" ? (
                        <ImmRowAction disabled={action.isPending} onClick={() => action.mutate({ kind: "no_show", uuid: selection })}>
                          No-show
                        </ImmRowAction>
                      ) : null}
                    </>
                  ) : null}
                  {testUuid ? <ImmRowAction onClick={() => setOpenTest(testUuid)}>Open</ImmRowAction> : null}
                </DaCell>
              </DaRow>
            );
          })}
        </ImmRecordTable>
      ) : null}
      {openTest ? <DaTestSheet uuid={openTest} onClose={() => setOpenTest(null)} /> : null}
    </ImmPageShell>
  );
}
