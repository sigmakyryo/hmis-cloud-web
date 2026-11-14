"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { CheckField, Field } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmRowAction,
  ImmStatusBadge,
} from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmNotice, ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import {
  createFitClient,
  fetchFitClients,
  fetchFitOutbox,
  fetchOhAudit,
  testFitClient,
  updateFitClient,
  type FitClient,
  type FitFeedScope,
} from "@/features/occupational-health/services/fitness.service";
import { BffError } from "@/lib/bff-client";
import { useToast } from "@/providers/toast-provider";
import { SCOPE_LABEL, errorText, fmtDateTime } from "../shared/fit-format";
import { OhDataExchange } from "./OhDataExchange";

type Tab = "systems" | "deliveries" | "data" | "audit";
const SCOPES: FitFeedScope[] = [
  "access_cards",
  "rosters",
  "payroll",
  "hr_events",
  "certificate_events",
  "surveillance_events",
  "iod_events",
  "exposure_events",
  "exports",
  "roster_import",
  "device_import",
];

function ClientDrawer({ client: existing, onClose }: { client: FitClient | null; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(existing?.name ?? "");
  const [url, setUrl] = useState(existing?.webhook_url ?? "");
  const [scopes, setScopes] = useState<FitFeedScope[]>(existing?.scopes ?? []);
  const [secret, setSecret] = useState<{ key: string; secret: string } | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (existing) {
        await updateFitClient(existing.uuid, { name, webhook_url: url, scopes });
        return null;
      }
      return createFitClient({ name, webhook_url: url || undefined, scopes });
    },
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ["oh-fit"] });
      if (created) {
        setSecret({ key: created.client.client_key, secret: created.secret });
        toast({ variant: "success", title: "System connected", description: "Copy the secret now. It is shown once." });
        return;
      }
      toast({ variant: "success", title: "Saved" });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  const toggle = (scope: FitFeedScope, on: boolean) =>
    setScopes((prev) => (on ? [...new Set([...prev, scope])] : prev.filter((s) => s !== scope)));

  return (
    <Drawer title={existing ? existing.name : "Connect a system"} description="Access control, rostering or payroll" onClose={onClose}>
      {secret ? (
        <div className="space-y-2" data-testid="oh-fit-client-secret">
          <p className="text-[13px] text-brand-navy">Give these to the other system. The secret will not be shown again.</p>
          <Field label="Client key" value={secret.key} onChange={() => undefined} />
          <Field label="Secret" value={secret.secret} onChange={() => undefined} />
          <DrawerActions>
            <PageActionButton onClick={onClose}>Done</PageActionButton>
          </DrawerActions>
        </div>
      ) : (
        <>
          <Field label="Name" value={name} onChange={setName} placeholder="e.g. Gate access system" required />
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-brand-navy">What it may read</p>
            {SCOPES.map((scope) => (
              <CheckField key={scope} label={SCOPE_LABEL[scope]} checked={scopes.includes(scope)} onChange={(on) => toggle(scope, on)} />
            ))}
          </div>
          <Field label="Send changes to (optional web address)" value={url} onChange={setUrl} placeholder="https://" />
          <p className="text-[12px] text-dash-muted">
            Only fit / not fit, restrictions and dates are shared. Medical reasons and results are never sent.
          </p>
          <DrawerActions>
            <SecondaryButton size="sm" onClick={onClose}>
              Cancel
            </SecondaryButton>
            <PageActionButton disabled={!name || scopes.length === 0 || save.isPending} onClick={() => save.mutate()}>
              {existing ? "Save" : "Connect"}
            </PageActionButton>
          </DrawerActions>
        </>
      )}
    </Drawer>
  );
}

export function FitIntegrationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("systems");
  const [editing, setEditing] = useState<FitClient | "new" | null>(null);
  const clients = useQuery({ queryKey: ["oh-fit", "clients"], queryFn: fetchFitClients, retry: false });
  const outbox = useQuery({ queryKey: ["oh-fit", "outbox"], queryFn: fetchFitOutbox, enabled: tab === "deliveries", retry: false });
  const audit = useQuery({ queryKey: ["oh-fit", "audit"], queryFn: () => fetchOhAudit(), enabled: tab === "audit", retry: false });

  const action = useMutation({
    mutationFn: async ({ kind, client }: { kind: "test" | "pause" | "resume"; client: FitClient }): Promise<unknown> =>
      kind === "test" ? testFitClient(client.uuid) : updateFitClient(client.uuid, { is_active: kind === "resume" }),
    onSuccess: (_d, vars) => {
      toast({ variant: "success", title: vars.kind === "test" ? "Test message queued" : vars.kind === "pause" ? "Paused" : "Resumed" });
      void qc.invalidateQueries({ queryKey: ["oh-fit"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not done", description: errorText(error) }),
  });

  const forbidden = clients.error instanceof BffError && clients.error.status === 403;

  return (
    <ImmPageShell title="Integrations" testId="oh-fit-integrations-page">
      <ImmTabsBar<Tab>
        label="Integration views"
        tabs={[
          { key: "systems", label: "Connected systems", count: clients.data?.length },
          { key: "deliveries", label: "Deliveries" },
          { key: "data", label: "Imports & exports" },
          { key: "audit", label: "Audit log" },
        ]}
        active={tab}
        onChange={setTab}
        actions={forbidden ? null : <PageActionButton onClick={() => setEditing("new")}>Connect a system</PageActionButton>}
      />
      {forbidden ? <ImmNotice tone="warning">Only an administrator can manage integrations.</ImmNotice> : null}
      {tab === "systems" && !forbidden ? (
        <>
          {clients.isLoading ? <QuietLoading /> : null}
          {clients.isError ? <LoadError>{errorText(clients.error, "Could not load integrations.")}</LoadError> : null}
          {clients.isSuccess && clients.data.length === 0 ? (
            <EmptyAction
              icon="plug"
              title="No systems connected"
              description="Let access control, rostering or payroll read fit-for-duty status automatically."
            />
          ) : null}
          {clients.isSuccess && clients.data.length > 0 ? (
            <ImmRecordTable columns={["System", "Reads", "Sends changes", "Last used", "Status", "Actions"]}>
              {clients.data.map((c) => (
                <DaRow key={c.uuid} testId="oh-fit-client-row" onClick={() => setEditing(c)}>
                  <DaCell first>
                    <ImmPrimaryCell title={c.name} detail={c.client_key} />
                  </DaCell>
                  <DaCell>{c.scopes.length ? c.scopes.map((s) => SCOPE_LABEL[s]).join(", ") : "Area clearance only"}</DaCell>
                  <DaCell>{c.has_webhook ? "Yes" : "No"}</DaCell>
                  <DaCell>{fmtDateTime(c.last_used_at)}</DaCell>
                  <DaCell>
                    <ImmStatusBadge status={c.is_active ? "cleared" : "planned"} label={c.is_active ? "Active" : "Paused"} />
                  </DaCell>
                  <DaCell actions>
                    {c.has_webhook ? (
                      <ImmRowAction disabled={action.isPending} onClick={() => action.mutate({ kind: "test", client: c })}>
                        Send test
                      </ImmRowAction>
                    ) : null}
                    <ImmRowAction
                      disabled={action.isPending}
                      onClick={() => action.mutate({ kind: c.is_active ? "pause" : "resume", client: c })}
                    >
                      {c.is_active ? "Pause" : "Resume"}
                    </ImmRowAction>
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : null}
      {tab === "deliveries" && !forbidden ? (
        <>
          {outbox.isLoading ? <QuietLoading /> : null}
          {outbox.isError ? <LoadError>{errorText(outbox.error, "Could not load deliveries.")}</LoadError> : null}
          {outbox.isSuccess && outbox.data.length === 0 ? (
            <EmptyAction icon="plug" title="Nothing sent yet" description="Status changes are sent here within a few minutes." />
          ) : null}
          {outbox.isSuccess && outbox.data.length > 0 ? (
            <ImmRecordTable columns={["System", "Message", "Queued", "Sent", "Status"]}>
              {outbox.data.map((r) => (
                <DaRow key={r.uuid} testId="oh-fit-outbox-row">
                  <DaCell first>{r.client_name || "—"}</DaCell>
                  <DaCell>
                    <ImmPrimaryCell title={r.event_type.replace(/^fitness\./, "").replace(/[._]/g, " ")} detail={r.last_error || undefined} />
                  </DaCell>
                  <DaCell>{fmtDateTime(r.created_at)}</DaCell>
                  <DaCell>{fmtDateTime(r.sent_at)}</DaCell>
                  <DaCell>
                    <ImmStatusBadge status={r.status === "sent" ? "cleared" : r.status === "failed" ? "fail" : "pending"} label={r.status.replace(/_/g, " ")} />
                  </DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : null}
      {tab === "data" && !forbidden ? <OhDataExchange /> : null}
      {tab === "audit" && !forbidden ? (
        <>
          {audit.isLoading ? <QuietLoading /> : null}
          {audit.isError ? <LoadError>{errorText(audit.error, "Could not load the audit log.")}</LoadError> : null}
          {audit.isSuccess && audit.data.length === 0 ? (
            <EmptyAction icon="plug" title="No audit events yet" description="Changes to fitness, programmes and access are recorded here." />
          ) : null}
          {audit.isSuccess && audit.data.length > 0 ? (
            <ImmRecordTable columns={["When", "Area", "What", "Who"]}>
              {audit.data.map((e) => (
                <DaRow key={e.uuid} testId="oh-audit-row">
                  <DaCell first>{fmtDateTime(e.occurred_at)}</DaCell>
                  <DaCell>{e.module.replace(/_/g, " ")}</DaCell>
                  <DaCell>
                    <ImmPrimaryCell title={e.summary || `${e.entity_type} ${e.action}`.replace(/[._]/g, " ")} detail={e.entity_type} />
                  </DaCell>
                  <DaCell>{e.actor_name || e.actor_type || "—"}</DaCell>
                </DaRow>
              ))}
            </ImmRecordTable>
          ) : null}
        </>
      ) : null}
      {editing ? <ClientDrawer client={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </ImmPageShell>
  );
}
