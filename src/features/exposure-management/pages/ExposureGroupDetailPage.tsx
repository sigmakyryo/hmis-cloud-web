"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { ROUTES } from "@/constants/routes";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { BandChip } from "@/features/exposure-management/components/ExposureBadges";
import { ExposureAssessmentPanel } from "@/features/exposure-management/components/ExposureAssessmentPanel";
import { ExposureGroupSheet } from "@/features/exposure-management/components/ExposureGroupSheet";
import { ExposureSeriesChart } from "@/features/exposure-management/components/ExposureSeriesChart";
import { errorMessage } from "@/features/exposure-management/lib/exposure-format";
import {
  exposureKeys,
  fetchAgents,
  fetchGroup,
  fetchGroupMembers,
  fetchSeries,
  removeGroupAgent,
  setGroupAgent,
} from "@/features/exposure-management/services/exposure.service";

type Tab = "agents" | "members";

export function ExposureGroupDetailPage({ uuid }: { uuid: string }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("agents");
  const [agentUuid, setAgentUuid] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState("");
  const [error, setError] = useState("");

  const groupQ = useQuery({ queryKey: exposureKeys.group(uuid), queryFn: () => fetchGroup(uuid) });
  const membersQ = useQuery({ queryKey: [...exposureKeys.group(uuid), "members"], queryFn: () => fetchGroupMembers(uuid), enabled: tab === "members" });
  const agentsQ = useQuery({ queryKey: exposureKeys.agents, queryFn: () => fetchAgents() });

  const group = groupQ.data;
  const links = group?.agents ?? [];
  const activeAgent = agentUuid ?? links[0]?.agent_uuid ?? null;
  const seriesQ = useQuery({
    queryKey: exposureKeys.series(uuid, activeAgent ?? ""),
    queryFn: () => fetchSeries(uuid, activeAgent as string),
    enabled: Boolean(activeAgent),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: exposureKeys.group(uuid) });
    void qc.invalidateQueries({ queryKey: exposureKeys.dashboard });
  };
  const attach = useMutation({
    mutationFn: (agent: string) => setGroupAgent(uuid, agent, { expected_level: "unknown", restrict_on_exceed: false }),
    onSuccess: () => { setAdding(""); refresh(); },
    onError: (e) => setError(errorMessage(e, "Could not add the agent.")),
  });
  const detach = useMutation({
    mutationFn: (agent: string) => removeGroupAgent(uuid, agent),
    onSuccess: refresh,
    onError: (e) => setError(errorMessage(e, "Could not remove the agent.")),
  });
  const toggleRestrict = useMutation({
    mutationFn: ({ agent, value }: { agent: string; value: boolean }) => setGroupAgent(uuid, agent, { restrict_on_exceed: value }),
    onSuccess: refresh,
    onError: (e) => setError(errorMessage(e, "Could not update the agent.")),
  });

  if (groupQ.isPending) return <ImmPageShell testId="exposure-group-page" title="Exposure group"><QuietLoading /></ImmPageShell>;
  if (groupQ.isError || !group) return <ImmPageShell testId="exposure-group-page" title="Exposure group"><LoadError>{errorMessage(groupQ.error, "Could not load the group.")}</LoadError></ImmPageShell>;

  const attached = new Set(links.map((l) => l.agent_uuid));
  const available = (agentsQ.data ?? []).filter((a) => a.is_active && !attached.has(a.uuid));

  return (
    <ImmPageShell testId="exposure-group-page" title={group.name}>
      <div data-list-band className="flex flex-wrap items-center justify-between gap-3 border-b border-dash-border/80 bg-white px-4 py-3 md:px-6">
        <div>
          <Link href={ROUTES.exposureManagementGroups} className="text-[12px] text-brand-primary hover:underline">Exposure groups</Link>
          <h2 className="text-lg font-semibold text-brand-navy">{group.name} <span className="text-[13px] font-normal text-dash-muted">{group.code}</span></h2>
          <p className="text-[13px] text-dash-muted">{[group.site, group.department, group.job_title].filter(Boolean).join(" · ")} · {group.member_count} workers</p>
        </div>
        <SecondaryButton type="button" onClick={() => setEditing(true)}>Edit group</SecondaryButton>
      </div>
      <ImmTabsBar
        label="Group sections"
        active={tab}
        onChange={setTab}
        tabs={[{ key: "agents", label: "Agents and assessment", count: links.length }, { key: "members", label: "Members", count: group.member_count }]}
        actions={
          tab === "agents" ? (
            <>
              <select aria-label="Agent to add" className="h-8 rounded-lg border border-dash-border bg-white px-2.5 text-[13px]" value={adding} onChange={(e) => setAdding(e.target.value)}>
                <option value="">Add agent…</option>
                {available.map((a) => <option key={a.uuid} value={a.uuid}>{a.name}</option>)}
              </select>
              <PageActionButton disabled={!adding || attach.isPending} onClick={() => attach.mutate(adding)}>Add</PageActionButton>
            </>
          ) : null
        }
      />
      {error ? <p role="alert" className="px-4 py-2 text-[13px] text-red-700 md:px-6">{error}</p> : null}

      {tab === "agents" ? (
        <>
          {links.length === 0 ? (
            <p data-list-band className="px-4 py-8 text-[13px] text-dash-muted md:px-6">No agents yet. Add the agents this group is exposed to.</p>
          ) : (
            <ImmRecordTable columns={["Agent", "Band", "Restrict on exceed", "Actions"]}>
              {links.map((link) => (
                <ListPageDataTableRow key={link.agent_uuid} onClick={() => setAgentUuid(link.agent_uuid)} className="cursor-pointer">
                  <ListPageDataTableCell className="pl-4 md:pl-6">
                    <ImmPrimaryCell title={link.agent_name} detail={link.agent_uuid === activeAgent ? "Shown below" : link.category} />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell><BandChip band={link.assessment?.band} confidence={link.assessment?.confidence} /></ListPageDataTableCell>
                  <ListPageDataTableCell>
                    <input
                      type="checkbox"
                      aria-label={`Restrict fitness when ${link.agent_name} limit is exceeded`}
                      checked={link.restrict_on_exceed}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => link.agent_uuid && toggleRestrict.mutate({ agent: link.agent_uuid, value: e.target.checked })}
                    />
                  </ListPageDataTableCell>
                  <ListPageDataTableCell className="pr-4 text-right md:pr-6">
                    <ImmRowAction onClick={() => link.agent_uuid && detach.mutate(link.agent_uuid)}>Remove</ImmRowAction>
                  </ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ImmRecordTable>
          )}
          {activeAgent ? (
            <>
              <div className="px-4 pt-4 md:px-6">
                {seriesQ.isPending ? <QuietLoading /> : null}
                {seriesQ.isError ? <LoadError>{errorMessage(seriesQ.error, "Could not load results.")}</LoadError> : null}
                {seriesQ.data ? <ExposureSeriesChart measurements={seriesQ.data.measurements} assessment={seriesQ.data.assessments[0] ?? null} /> : null}
              </div>
              {seriesQ.data ? (
                <ExposureAssessmentPanel key={`${activeAgent}-${seriesQ.dataUpdatedAt}`} groupUuid={uuid} agentUuid={activeAgent} assessment={seriesQ.data.assessments[0] ?? null} />
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <>
          {membersQ.isPending ? <QuietLoading /> : null}
          {membersQ.isError ? <LoadError>{errorMessage(membersQ.error, "Could not load members.")}</LoadError> : null}
          {membersQ.data ? (
            <ImmRecordTable columns={["Worker", "Employer", "Job title", "Site"]}>
              {membersQ.data.map((m) => (
                <ListPageDataTableRow key={m.customer_uuid}>
                  <ListPageDataTableCell className="pl-4 md:pl-6">
                    <Link href={ROUTES.occupationalHealthEmployee(m.customer_uuid)} className="font-medium text-brand-primary hover:underline">{m.worker_label}</Link>
                  </ListPageDataTableCell>
                  <ListPageDataTableCell>{m.employer ?? "—"}</ListPageDataTableCell>
                  <ListPageDataTableCell>{m.job_title ?? "—"}</ListPageDataTableCell>
                  <ListPageDataTableCell>{m.site ?? "—"}</ListPageDataTableCell>
                </ListPageDataTableRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      )}
      {editing ? <ExposureGroupSheet group={group} onClose={() => setEditing(false)} /> : null}
    </ImmPageShell>
  );
}
