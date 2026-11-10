"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmEmployeeLink } from "@/app/(app)/immunizations/_components/shared/ImmEmployeeLink";
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
import { fetchDaTests, type DaTest } from "@/features/occupational-health/services/drug-alcohol.service";
import {
  FITNESS_LABEL,
  REASON_LABEL,
  SPECIMEN_LABEL,
  TEST_STATUS_LABEL,
  errorText,
  fmtDateTime,
  label,
} from "../shared/da-format";
import { DaTestSheet } from "../shared/DaTestSheet";
import { DaCell, DaRow } from "../shared/da-ui";

type View = "open" | "finished" | "all";

const OPEN = ["scheduled", "in_collection", "awaiting_alcohol_confirm", "awaiting_lab", "mro_review"];

export function DaTestsPage() {
  const [view, setView] = useState<View>("open");
  const [reason, setReason] = useState("");
  const [openTest, setOpenTest] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["oh-da", "tests", reason],
    queryFn: () => fetchDaTests(reason ? { reason } : {}),
  });
  const all = query.data?.results ?? [];
  const rows = all.filter((t) =>
    view === "all" ? true : view === "open" ? OPEN.includes(t.status) : !OPEN.includes(t.status),
  );
  const list = useImmList<DaTest>({
    rows,
    searchText: (t) => `${t.reference} ${t.customer_initials} ${t.employer_name} ${t.department_name}`,
    sortValue: (t, key) => (key === "started" ? t.created_at : key === "status" ? t.status : t.reason),
    defaultSort: { key: "started", direction: "desc" },
  });

  return (
    <ImmPageShell title="Cases" testId="oh-da-tests-page">
      <ImmTabsBar<View>
        label="Case views"
        tabs={[
          { key: "open", label: "In progress", count: all.filter((t) => OPEN.includes(t.status)).length },
          { key: "finished", label: "Finished", count: all.filter((t) => !OPEN.includes(t.status)).length },
          { key: "all", label: "All", count: all.length },
        ]}
        active={view}
        onChange={setView}
      />
      <ImmSearchBar
        value={list.query}
        onChange={list.setQuery}
        placeholder="Search reference, initials or employer"
        matched={list.controls.matched}
        total={list.total}
        onClear={() => {
          list.setQuery("");
          setReason("");
        }}
        filters={
          <ImmFilterSelect label="Reason" value={reason} onChange={setReason}>
            <option value="">All reasons</option>
            {Object.entries(REASON_LABEL).map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
          </ImmFilterSelect>
        }
      />
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load cases.")}</LoadError> : null}
      {query.isSuccess && list.controls.matched === 0 ? (
        <EmptyAction
          icon="flask"
          title="No cases"
          description="Tests are started from a visit (Drug & alcohol step) or from the Due list."
        />
      ) : null}
      {query.isSuccess && list.controls.matched > 0 ? (
        <ImmRecordTable
          list={list.controls}
          columns={[
            "Reference",
            "Worker",
            { label: "Why", sortKey: "reason" },
            { label: "Started", sortKey: "started" },
            { label: "Stage", sortKey: "status" },
            "Fitness",
            "Actions",
          ]}
        >
          {list.pageRows.map((t) => (
            <DaRow key={t.uuid} testId="oh-da-test-row" onClick={() => setOpenTest(t.uuid)}>
              <DaCell first>
                <ImmPrimaryCell title={t.reference} detail={t.specimen_types.map((s) => label(SPECIMEN_LABEL, s)).join(", ")} />
              </DaCell>
              <DaCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-brand-navy">{t.customer_initials || "—"}</span>
                  <ImmEmployeeLink uuid={t.customer_uuid} />
                </div>
              </DaCell>
              <DaCell>{label(REASON_LABEL, t.reason)}</DaCell>
              <DaCell>{fmtDateTime(t.created_at)}</DaCell>
              <DaCell>
                <ImmStatusBadge status={t.status} label={label(TEST_STATUS_LABEL, t.status)} />
              </DaCell>
              <DaCell>{label(FITNESS_LABEL, t.fitness_outcome)}</DaCell>
              <DaCell actions>
                <ImmRowAction onClick={() => setOpenTest(t.uuid)}>Open</ImmRowAction>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {openTest ? <DaTestSheet uuid={openTest} onClose={() => setOpenTest(null)} /> : null}
    </ImmPageShell>
  );
}
