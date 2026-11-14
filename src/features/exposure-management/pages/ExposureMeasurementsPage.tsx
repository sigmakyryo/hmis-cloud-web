"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "@/app/(app)/immunizations/_components/shared/ImmSearchBar";
import { ImmNotice, ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";
import { EvaluationBadge } from "@/features/exposure-management/components/ExposureBadges";
import { ExposureImportSheet } from "@/features/exposure-management/components/ExposureImportSheet";
import { ExposureMeasurementSheet } from "@/features/exposure-management/components/ExposureMeasurementSheet";
import type { ExposureMeasurement } from "@/features/exposure-management/exposure.types";
import { EVALUATION_LABELS, errorMessage, formatDate, formatNumber, formatRatio } from "@/features/exposure-management/lib/exposure-format";
import { exposureKeys, fetchMeasurements, voidMeasurement } from "@/features/exposure-management/services/exposure.service";

export function ExposureMeasurementsPage() {
  const qc = useQueryClient();
  const [sheet, setSheet] = useState<"record" | "import" | null>(null);
  const [evaluation, setEvaluation] = useState("");
  const [notice, setNotice] = useState("");
  const query = useQuery({ queryKey: exposureKeys.measurements, queryFn: () => fetchMeasurements({ limit: 500 }) });
  const rows = (query.data ?? []).filter((m) => !evaluation || m.evaluation === evaluation);
  const list = useImmList<ExposureMeasurement>({
    rows,
    searchText: (m) => [m.agent_name, m.group_name, m.worker_label, m.location, m.lab_ref].join(" "),
    sortValue: (m, key) => (key === "ratio" ? m.worst_ratio : key === "agent" ? m.agent_name : m.sampled_at),
    defaultSort: { key: "when", direction: "desc" },
  });
  const remove = useMutation({
    mutationFn: (uuid: string) => voidMeasurement(uuid, "Voided from the measurements list"),
    onSuccess: () => { setNotice("Result voided. Assessments were recalculated."); void qc.invalidateQueries({ queryKey: exposureKeys.all }); },
    onError: (e) => setNotice(errorMessage(e, "Could not void the result.")),
  });

  return (
    <ImmPageShell testId="exposure-measurements-page" title="Exposure measurements">
      <ImmTabsBar
        label="Measurements"
        active="all"
        onChange={() => undefined}
        tabs={[{ key: "all", label: "Results", count: query.data?.length }]}
        actions={
          <>
            <SecondaryButton onClick={() => setSheet("import")}>Import CSV</SecondaryButton>
            <PageActionButton onClick={() => setSheet("record")}>Record result</PageActionButton>
          </>
        }
      />
      {notice ? <ImmNotice>{notice}</ImmNotice> : null}
      <ImmSearchBar
        value={list.query}
        onChange={list.setQuery}
        placeholder="Search agent, group, worker or lab reference"
        matched={list.controls.matched}
        total={query.data?.length ?? 0}
        onClear={() => { list.setQuery(""); setEvaluation(""); }}
        filters={
          <ImmFilterSelect label="Evaluation" value={evaluation} onChange={setEvaluation}>
            <option value="">All results</option>
            {Object.entries(EVALUATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </ImmFilterSelect>
        }
      />
      {query.isPending ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorMessage(query.error, "Could not load results.")}</LoadError> : null}
      {query.data && query.data.length === 0 ? <EmptyAction title="No results recorded" description="Record a sampling result or import a laboratory CSV." icon="activity" /> : null}
      {rows.length > 0 ? (
        <ImmRecordTable list={list.controls} columns={[{ label: "Agent", sortKey: "agent" }, "Group", { label: "Sampled", sortKey: "when" }, "Result", { label: "% of limit", sortKey: "ratio" }, "Evaluation", "Actions"]}>
          {list.pageRows.map((m) => (
            <ListPageDataTableRow key={m.uuid}>
              <ListPageDataTableCell className="pl-4 md:pl-6"><ImmPrimaryCell title={m.agent_name} detail={`${m.sample_type} · ${m.worker_label}`} /></ListPageDataTableCell>
              <ListPageDataTableCell>{m.group_name ?? "—"}</ListPageDataTableCell>
              <ListPageDataTableCell>{formatDate(m.sampled_at)}</ListPageDataTableCell>
              <ListPageDataTableCell className="tabular-nums">
                {m.below_lod ? `<${formatNumber(m.lod_value)}` : formatNumber(m.result_value)} {m.result_unit}
              </ListPageDataTableCell>
              <ListPageDataTableCell className="tabular-nums">{formatRatio(m.worst_ratio)}</ListPageDataTableCell>
              <ListPageDataTableCell>{m.status === "void" ? "Void" : m.status === "pending_lab" ? "Lab pending" : <EvaluationBadge evaluation={m.evaluation} belowLod={m.below_lod} />}</ListPageDataTableCell>
              <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                {m.status !== "void" ? <ImmRowAction disabled={remove.isPending} onClick={() => remove.mutate(m.uuid)}>Void</ImmRowAction> : null}
              </ListPageDataTableCell>
            </ListPageDataTableRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {sheet === "record" ? <ExposureMeasurementSheet onClose={() => setSheet(null)} /> : null}
      {sheet === "import" ? <ExposureImportSheet onClose={() => setSheet(null)} /> : null}
    </ImmPageShell>
  );
}
