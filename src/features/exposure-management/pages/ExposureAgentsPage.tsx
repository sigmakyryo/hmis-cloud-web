"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmSearchBar } from "@/app/(app)/immunizations/_components/shared/ImmSearchBar";
import { ImmNotice, ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";
import { LimitsDisclaimer } from "@/features/exposure-management/components/ExposureBadges";
import { ExposureAgentSheet } from "@/features/exposure-management/components/ExposureAgentSheet";
import type { ExposureAgent } from "@/features/exposure-management/exposure.types";
import { errorMessage, formatNumber } from "@/features/exposure-management/lib/exposure-format";
import { useExposureMeta } from "@/features/exposure-management/lib/useExposureMeta";
import { exposureKeys, fetchAgents, seedReferenceLimits } from "@/features/exposure-management/services/exposure.service";

export function ExposureAgentsPage() {
  const qc = useQueryClient();
  const meta = useExposureMeta();
  const query = useQuery({ queryKey: exposureKeys.agents, queryFn: () => fetchAgents(true) });
  const [editing, setEditing] = useState<ExposureAgent | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const rows = query.data ?? [];
  const list = useImmList<ExposureAgent>({
    rows,
    searchText: (a) => [a.code, a.name, a.category, a.cas_number].join(" "),
    sortValue: (a, key) => (key === "category" ? a.category : a.name),
    defaultSort: { key: "name", direction: "asc" },
  });
  const seed = useMutation({
    mutationFn: () => seedReferenceLimits(),
    onSuccess: (r) => { setNotice(`Loaded ${r.created} agents (${r.skipped} already present). Verify each limit before relying on it.`); void qc.invalidateQueries({ queryKey: exposureKeys.agents }); },
    onError: (e) => setNotice(errorMessage(e, "Could not load reference limits. Only administrators can do this.")),
  });

  return (
    <ImmPageShell testId="exposure-agents-page" title="Agents and limits">
      <ImmTabsBar
        label="Agents"
        active="agents"
        onChange={() => undefined}
        tabs={[{ key: "agents", label: "Agents", count: rows.length }]}
        actions={
          <>
            <SecondaryButton disabled={seed.isPending} onClick={() => seed.mutate()}>{seed.isPending ? "Loading…" : "Load reference limits"}</SecondaryButton>
            <PageActionButton onClick={() => setEditing("new")}>New agent</PageActionButton>
          </>
        }
      />
      <LimitsDisclaimer text={meta.data?.disclaimer} />
      {notice ? <ImmNotice>{notice}</ImmNotice> : null}
      <ImmSearchBar value={list.query} onChange={list.setQuery} placeholder="Search agents" matched={list.controls.matched} total={rows.length} onClear={() => list.setQuery("")} />
      {query.isPending ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorMessage(query.error, "Could not load agents.")}</LoadError> : null}
      {query.data && rows.length === 0 ? <EmptyAction title="No agents" description="Load the cited reference set, then verify each limit, or add your own." icon="activity" /> : null}
      {rows.length > 0 ? (
        <ImmRecordTable list={list.controls} columns={[{ label: "Agent", sortKey: "name" }, { label: "Category", sortKey: "category" }, "Current limits", "Status"]}>
          {list.pageRows.map((a) => {
            const limits = (a.limits ?? []).filter((l) => l.is_current);
            return (
              <ListPageDataTableRow key={a.uuid} onClick={() => setEditing(a)} className="cursor-pointer">
                <ListPageDataTableCell className="pl-4 md:pl-6"><ImmPrimaryCell title={a.name} detail={`${a.code}${a.cas_number ? ` · CAS ${a.cas_number}` : ""}`} /></ListPageDataTableCell>
                <ListPageDataTableCell className="capitalize">{a.category}</ListPageDataTableCell>
                <ListPageDataTableCell>
                  {limits.length ? limits.map((l) => `${l.basis.toUpperCase()} ${formatNumber(l.value)} ${l.unit}`).join(" · ") : <span className="text-amber-800">No limit set</span>}
                </ListPageDataTableCell>
                <ListPageDataTableCell>
                  <ImmStatusBadge status={a.is_active ? "up_to_date" : "pending"} label={a.is_example ? "Example, verify" : a.is_active ? "Active" : "Inactive"} />
                </ListPageDataTableCell>
              </ListPageDataTableRow>
            );
          })}
        </ImmRecordTable>
      ) : null}
      {editing ? <ExposureAgentSheet key={editing === "new" ? "new" : editing.uuid} agent={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </ImmPageShell>
  );
}
