"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmStatusBadge,
} from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmFilterSelect, ImmSearchBar } from "@/app/(app)/immunizations/_components/shared/ImmSearchBar";
import { ImmNotice, ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";
import {
  fetchDaAudits,
  fetchDaNotifications,
  runDaRetention,
  type DaAudit,
} from "@/features/occupational-health/services/drug-alcohol.service";
import { useToast } from "@/providers/toast-provider";
import { errorText, fmtDateTime } from "../shared/da-format";
import { DaCell, DaRow } from "../shared/da-ui";

type View = "trail" | "messages";

const ENTITY_LABEL: Record<string, string> = {
  test: "Test",
  policy: "Policy",
  random_pool: "Random pool",
  random_draw: "Random draw",
  random_selection: "Random pick",
  mro_review: "Medical review",
  rtd_case: "Return to duty",
  patient: "Worker record",
  retention: "Retention",
};

export function DaAuditPage() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [view, setView] = useState<View>("trail");
  const [entity, setEntity] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const audits = useQuery({
    queryKey: ["oh-da", "audits", entity],
    queryFn: () => fetchDaAudits(entity ? { entity_type: entity } : {}),
    retry: false,
  });
  const messages = useQuery({ queryKey: ["oh-da", "notifications"], queryFn: fetchDaNotifications, enabled: view === "messages" });
  const list = useImmList<DaAudit>({
    rows: audits.data ?? [],
    searchText: (row) => `${row.summary} ${row.actor_name} ${row.action} ${row.entity_type}`,
  });
  const retention = useMutation({
    mutationFn: (purge: boolean) => runDaRetention(purge),
    onSuccess: (out) => {
      setNotice(
        out.dry_run
          ? `${out.eligible} record(s) are past their keep date. Nothing removed yet.`
          : `${out.purged} record(s) had their details removed. Outcomes were kept.`,
      );
      void client.invalidateQueries({ queryKey: ["oh-da"] });
    },
    onError: (error) => toast({ variant: "error", title: "Retention check failed", description: errorText(error) }),
  });

  return (
    <ImmPageShell title="Audit" testId="oh-da-audit-page">
      <ImmTabsBar<View>
        label="Audit views"
        tabs={[
          { key: "trail", label: "Activity", count: audits.data?.length },
          { key: "messages", label: "Messages sent" },
        ]}
        active={view}
        onChange={setView}
        actions={
          <>
            <SecondaryButton className="h-8" disabled={retention.isPending} onClick={() => retention.mutate(false)}>
              Check retention
            </SecondaryButton>
            <SecondaryButton
              className="h-8"
              disabled={retention.isPending}
              onClick={() => {
                if (window.confirm("Remove details from records past their keep date? Outcomes stay.")) retention.mutate(true);
              }}
            >
              Apply retention
            </SecondaryButton>
          </>
        }
      />
      {notice ? <ImmNotice>{notice}</ImmNotice> : null}
      {view === "trail" ? (
        <>
          <ImmSearchBar
            value={list.query}
            onChange={list.setQuery}
            placeholder="Search activity"
            matched={list.controls.matched}
            total={list.total}
            onClear={() => {
              list.setQuery("");
              setEntity("");
            }}
            filters={
              <ImmFilterSelect label="Record type" value={entity} onChange={setEntity}>
                <option value="">All records</option>
                {Object.entries(ENTITY_LABEL).map(([key, text]) => (
                  <option key={key} value={key}>
                    {text}
                  </option>
                ))}
              </ImmFilterSelect>
            }
          />
          {audits.isLoading ? <QuietLoading /> : null}
          {audits.isError ? <LoadError>{errorText(audits.error, "Could not load the audit trail.")}</LoadError> : null}
          {audits.isSuccess && list.controls.matched === 0 ? (
            <EmptyAction icon="flask" title="No activity" description="Every view and change is recorded here." />
          ) : null}
          {audits.isSuccess && list.controls.matched > 0 ? (
            <ImmRecordTable list={list.controls} columns={["When", "What", "Record", "By"]}>
              {list.pageRows.map((row) => (
                <DaRow key={row.uuid} testId="oh-da-audit-row">
                  <DaCell first>{fmtDateTime(row.occurred_at)}</DaCell>
                  <DaCell>
                    <ImmPrimaryCell title={row.summary || row.action} detail={row.action.replace(/_/g, " ")} />
                  </DaCell>
                  <DaCell>{ENTITY_LABEL[row.entity_type] ?? row.entity_type}</DaCell>
                  <DaCell>{row.actor_name || row.actor_type}</DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : (
        <>
          {messages.isLoading ? <QuietLoading /> : null}
          {messages.isError ? <LoadError>{errorText(messages.error)}</LoadError> : null}
          {messages.isSuccess && messages.data.length === 0 ? (
            <EmptyAction icon="flask" title="No messages" description="Notices never include results or health details." />
          ) : null}
          {messages.isSuccess && messages.data.length > 0 ? (
            <ImmRecordTable columns={["When", "Message", "Channel", "Status"]}>
              {messages.data.map((n) => (
                <DaRow key={n.uuid}>
                  <DaCell first>{fmtDateTime(n.sent_at ?? n.created_at)}</DaCell>
                  <DaCell>
                    <ImmPrimaryCell title={n.subject} detail={n.event.replace(/_/g, " ")} />
                  </DaCell>
                  <DaCell>{n.channel}</DaCell>
                  <DaCell>
                    <ImmStatusBadge status={n.status === "sent" ? "complete" : n.status === "failed" ? "fail" : "pending"} label={n.status.replace(/_/g, " ")} />
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      )}
    </ImmPageShell>
  );
}
