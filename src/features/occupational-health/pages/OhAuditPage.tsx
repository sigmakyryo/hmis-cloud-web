"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmNotice } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { errorText, fmtDateTime, isForbidden } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import {
  fetchOhAuditHistory,
  ohAuditCsvUrl,
  searchOhAudit,
  type OhAuditEvent,
  type OhAuditFilters,
} from "@/features/occupational-health/services/fitness.service";

const field = "h-9 rounded-md border border-dash-border px-2.5 text-[13px]";

function metaText(meta: OhAuditEvent["meta"]): string {
  if (!meta) return "";
  const changed = (meta as { changed?: unknown }).changed;
  if (Array.isArray(changed)) return changed.length ? `Changed: ${changed.join(", ")}` : "";
  return Object.entries(meta)
    .slice(0, 6)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export function OhAuditPage() {
  const [draft, setDraft] = useState<OhAuditFilters>({});
  const [filters, setFilters] = useState<OhAuditFilters>({});
  const [record, setRecord] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["oh-audit", "search", filters], queryFn: () => searchOhAudit(filters), retry: false });
  const set = (k: keyof OhAuditFilters, v: string) => setDraft((cur) => ({ ...cur, [k]: v }));

  return (
    <ImmPageShell title="Audit trail" testId="oh-audit-page">
      <form
        className="flex flex-wrap items-end gap-2 px-1 pb-3 text-[13px]"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...draft });
        }}
      >
        <label className="space-y-1">
          <span className="block text-dash-muted">Module</span>
          <select aria-label="Module" className={field} value={draft.module ?? ""} onChange={(e) => set("module", e.target.value)}>
            <option value="">All</option>
            {(query.data?.modules ?? []).map((m) => (
              <option key={m} value={m}>
                {m.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-dash-muted">Action</span>
          <input aria-label="Action" className={field} value={draft.action ?? ""} onChange={(e) => set("action", e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="block text-dash-muted">Who</span>
          <input aria-label="Actor" className={field} placeholder="initials or user id" value={draft.actor ?? ""} onChange={(e) => set("actor", e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="block text-dash-muted">Record id</span>
          <input aria-label="Record id" className={field} value={draft.entity_uuid ?? ""} onChange={(e) => set("entity_uuid", e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="block text-dash-muted">From</span>
          <input aria-label="From" type="date" className={field} value={draft.from ?? ""} onChange={(e) => set("from", e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="block text-dash-muted">To</span>
          <input aria-label="To" type="date" className={field} value={draft.to ?? ""} onChange={(e) => set("to", e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="block text-dash-muted">Summary contains</span>
          <input aria-label="Summary contains" className={field} value={draft.q ?? ""} onChange={(e) => set("q", e.target.value)} />
        </label>
        <SecondaryButton type="submit">Apply</SecondaryButton>
        <a className="text-primary underline" href={ohAuditCsvUrl(filters)} data-testid="oh-audit-csv">
          Download CSV
        </a>
      </form>

      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? (
        <LoadError>
          {isForbidden(query.error) ? "Only an administrator can read the audit trail." : errorText(query.error, "Could not load the audit trail.")}
        </LoadError>
      ) : null}
      {query.data?.truncated ? <ImmNotice tone="warning">Showing the latest entries only. Narrow the filters to see older ones.</ImmNotice> : null}
      {query.isSuccess && query.data.results.length === 0 ? <ImmNotice>No audit entries match these filters.</ImmNotice> : null}
      {query.isSuccess && query.data.results.length > 0 ? (
        <ImmRecordTable columns={["When", "Module", "What", "Who", "Details", "History"]}>
          {query.data.results.map((e) => (
            <DaRow key={`${e.module}-${e.uuid}`} testId="oh-audit-row">
              <DaCell first>{fmtDateTime(e.occurred_at)}</DaCell>
              <DaCell>{e.module.replace(/_/g, " ")}</DaCell>
              <DaCell>
                <ImmPrimaryCell title={`${e.entity_type} · ${e.action}`} detail={e.summary || undefined} />
              </DaCell>
              <DaCell>{e.actor_name || e.actor_type || "—"}</DaCell>
              <DaCell>
                <span className="text-[12px] text-dash-muted">{metaText(e.meta)}</span>
              </DaCell>
              <DaCell actions>
                {e.entity_uuid ? <ImmRowAction onClick={() => setRecord(e.entity_uuid)}>History</ImmRowAction> : null}
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {record ? <AuditHistoryDrawer entityUuid={record} onClose={() => setRecord(null)} /> : null}
    </ImmPageShell>
  );
}

function AuditHistoryDrawer({ entityUuid, onClose }: { entityUuid: string; onClose: () => void }) {
  const history = useQuery({ queryKey: ["oh-audit", "history", entityUuid], queryFn: () => fetchOhAuditHistory(entityUuid), retry: false });
  return (
    <Drawer title="Record history" description={entityUuid} onClose={onClose}>
      <div data-testid="oh-audit-history" className="space-y-3 text-[13px]">
        {history.isLoading ? <QuietLoading /> : null}
        {history.isError ? <LoadError>{errorText(history.error, "Could not load the history.")}</LoadError> : null}
        <ol className="space-y-2">
          {(history.data ?? []).map((e) => (
            <li key={`${e.module}-${e.uuid}`} className="border-l-2 border-dash-border pl-3">
              <p className="font-medium">
                {e.action} · {e.entity_type}
              </p>
              <p className="text-dash-muted">
                {fmtDateTime(e.occurred_at)} · {e.actor_name || e.actor_type || "—"} · {e.module.replace(/_/g, " ")}
              </p>
              {e.summary ? <p>{e.summary}</p> : null}
              {metaText(e.meta) ? <p className="text-[12px] text-dash-muted">{metaText(e.meta)}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </Drawer>
  );
}
