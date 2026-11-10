"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmInsightStrip } from "@/app/(app)/immunizations/_components/shared/ImmInsightStrip";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "@/app/(app)/immunizations/_components/shared/ImmSearchBar";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { fetchFitBoard, refreshFitness, type FitBoardRow } from "@/features/occupational-health/services/fitness.service";
import { useToast } from "@/providers/toast-provider";
import { OVERALL_LABEL, OVERALL_TONE, errorText, fmtDate, label } from "../shared/fit-format";
import { FitWorkerDrawer } from "./FitWorkerDrawer";

type StatusTab = "all" | "not_fit" | "fit_with_restrictions" | "unknown" | "fit" | "due_soon";

export function FitBoardPage() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [tab, setTab] = useState<StatusTab>("all");
  const [employer, setEmployer] = useState("");
  const [site, setSite] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const filters = { employer_uuid: employer, site, status: tab === "all" ? "" : tab };
  const query = useQuery({ queryKey: ["oh-fit", "board", filters], queryFn: () => fetchFitBoard(filters) });
  const counts = query.data?.counts;

  const list = useImmList<FitBoardRow>({
    rows: query.data?.results ?? [],
    searchText: (row) => `${row.worker_label} ${row.employee_number} ${row.job_title} ${row.department}`,
    sortValue: (row, key) => (key === "expiry" ? row.earliest_expiry : key === "status" ? row.overall : row.worker_label),
    defaultSort: null,
  });

  const refresh = useMutation({
    mutationFn: () => refreshFitness(employer ? { employer_uuid: employer } : {}),
    onSuccess: (data) => {
      toast({ variant: "success", title: "Fitness updated", description: `${data.refreshed} workers checked` });
      void client.invalidateQueries({ queryKey: ["oh-fit"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not updated", description: errorText(error) }),
  });

  return (
    <ImmPageShell title="Fitness board" testId="oh-fit-board-page">
      <ImmTabsBar<StatusTab>
        label="Fitness status"
        tabs={[
          { key: "all", label: "Everyone" },
          { key: "not_fit", label: "Not fit", count: counts?.not_fit },
          { key: "fit_with_restrictions", label: "With restrictions", count: counts?.fit_with_restrictions },
          { key: "unknown", label: "Not yet known", count: counts?.unknown },
          { key: "fit", label: "Fit", count: counts?.fit },
          { key: "due_soon", label: "Due soon", count: counts?.due_soon },
        ]}
        active={tab}
        onChange={setTab}
        actions={
          <SecondaryButton size="sm" className="h-8" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
            {refresh.isPending ? "Checking…" : "Check everyone now"}
          </SecondaryButton>
        }
      />
      <ImmInsightStrip
        testId="oh-fit-insights"
        items={[
          { label: "Not fit", value: counts?.not_fit ?? 0, tone: (counts?.not_fit ?? 0) > 0 ? "danger" : "default" },
          { label: "With restrictions", value: counts?.fit_with_restrictions ?? 0, tone: "warning" },
          { label: "Due in 30 days", value: counts?.due_soon ?? 0, tone: "warning" },
          { label: "Fit", value: counts?.fit ?? 0, tone: "success" },
        ]}
      />
      <ImmSearchBar
        value={list.query}
        onChange={list.setQuery}
        placeholder="Search name, staff number or job"
        matched={list.controls.matched}
        total={list.total}
        onClear={() => list.setQuery("")}
        filters={
          <>
            <ImmFilterSelect label="Employer" value={employer} onChange={setEmployer}>
              <option value="">All employers</option>
              {(query.data?.employers ?? []).map((e) => (
                <option key={e.uuid} value={e.uuid}>
                  {e.name}
                </option>
              ))}
            </ImmFilterSelect>
            <ImmFilterSelect label="Site" value={site} onChange={setSite}>
              <option value="">All sites</option>
              {(query.data?.sites ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </ImmFilterSelect>
          </>
        }
      />
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load the board.")}</LoadError> : null}
      {query.isSuccess && list.controls.matched === 0 ? (
        <EmptyAction
          icon="shield"
          title="No workers here yet"
          description="Workers with an active job appear after the next check. Use “Check everyone now” to fill the board."
        />
      ) : null}
      {query.isSuccess && list.controls.matched > 0 ? (
        <ImmRecordTable
          list={list.controls}
          columns={[
            { label: "Worker", sortKey: "name" },
            "Job & site",
            { label: "Status", sortKey: "status" },
            "Main reason",
            { label: "Next expiry", sortKey: "expiry" },
          ]}
        >
          {list.pageRows.map((row) => (
            <DaRow key={row.customer_uuid} testId="oh-fit-board-row" onClick={() => setOpen(row.customer_uuid)}>
              <DaCell first>
                <ImmPrimaryCell title={row.worker_label || "—"} detail={row.employee_number || undefined} />
              </DaCell>
              <DaCell>
                <ImmPrimaryCell title={row.job_title || "—"} detail={[row.employer_name, row.site].filter(Boolean).join(" · ") || undefined} />
              </DaCell>
              <DaCell>
                <ImmStatusBadge status={OVERALL_TONE[row.overall] ?? "planned"} label={label(OVERALL_LABEL, row.overall)} />
              </DaCell>
              <DaCell>
                {row.reason ? (
                  <span className="text-[13px] text-brand-navy">
                    {row.reason}
                    {row.reason_count > 1 ? <span className="text-dash-muted"> +{row.reason_count - 1} more</span> : null}
                  </span>
                ) : (
                  <span className="text-dash-muted">—</span>
                )}
              </DaCell>
              <DaCell>{fmtDate(row.earliest_expiry)}</DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {open ? <FitWorkerDrawer customerUuid={open} onClose={() => setOpen(null)} /> : null}
    </ImmPageShell>
  );
}
