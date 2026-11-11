"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { errorText, fmtDate, isForbidden } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import {
  PORTAL_SCOPES,
  PORTAL_SCOPE_LABEL,
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LABEL,
  fetchPortalContacts,
  fetchStaffPortalRequests,
  handlePortalRequest,
  type PortalRequest,
} from "@/features/employer-portal/services/employer-portal.service";
import { useToast } from "@/providers/toast-provider";

import { ContactDrawer } from "./ContactDrawer";
import { PortalBrandingPanel, PortalInvitationsPanel } from "./PortalInvitesAndBranding";

type View = "pending" | "accepted" | "done" | "declined" | "contacts" | "invitations" | "branding";

export function EmployerPortalAdminPage() {
  const [view, setView] = useState<View>("pending");
  return (
    <ImmPageShell title="Employer portal" testId="oh-employer-portal-admin">
      {view === "contacts" ? <ContactsView view={view} setView={setView} /> : null}
      {view === "invitations" ? (
        <>
          <Tabs view={view} setView={setView} />
          <PortalInvitationsPanel />
        </>
      ) : null}
      {view === "branding" ? (
        <>
          <Tabs view={view} setView={setView} />
          <PortalBrandingPanel />
        </>
      ) : null}
      {view !== "contacts" && view !== "invitations" && view !== "branding" ? <RequestsView view={view} setView={setView} /> : null}
    </ImmPageShell>
  );
}

function Tabs({ view, setView, actions }: { view: View; setView: (v: View) => void; actions?: React.ReactNode }) {
  return (
    <ImmTabsBar<View>
      label="Employer portal views"
      tabs={[
        { key: "pending", label: "New requests" },
        { key: "accepted", label: "Accepted" },
        { key: "done", label: "Done" },
        { key: "declined", label: "Declined" },
        { key: "contacts", label: "Employer logins" },
        { key: "invitations", label: "Invitations" },
        { key: "branding", label: "Branding" },
      ]}
      active={view}
      onChange={setView}
      actions={actions}
    />
  );
}

function RequestsView({ view, setView }: { view: View; setView: (v: View) => void }) {
  const [selected, setSelected] = useState<PortalRequest | null>(null);
  const query = useQuery({ queryKey: ["oh-portal-admin", "requests", view], queryFn: () => fetchStaffPortalRequests(view), retry: false });
  const rows = query.data ?? [];
  return (
    <>
      <Tabs view={view} setView={setView} />
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not load requests.")}</LoadError> : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyAction icon="clipboard" title="Nothing here" description="Requests that employers send from their portal show here." />
      ) : null}
      {query.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Employer", "Request", "Worker", "Preferred date", "Sent", "Actions"]}>
          {rows.map((r) => (
            <DaRow key={r.uuid} testId="oh-portal-request-row" onClick={() => setSelected(r)}>
              <DaCell first>
                <ImmPrimaryCell title={r.employer_name ?? "—"} detail={r.requested_by_name || undefined} />
              </DaCell>
              <DaCell>{REQUEST_KIND_LABEL[r.kind] ?? r.kind}</DaCell>
              <DaCell>{r.worker_name || "—"}</DaCell>
              <DaCell>{fmtDate(r.preferred_date)}</DaCell>
              <DaCell>{fmtDate(r.created_at)}</DaCell>
              <DaCell actions>
                <ImmRowAction onClick={() => setSelected(r)}>Open</ImmRowAction>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {selected ? <RequestDrawer request={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function RequestDrawer({ request, onClose }: { request: PortalRequest; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [note, setNote] = useState(request.staff_note ?? "");
  const save = useMutation({
    mutationFn: (status: "accepted" | "done" | "declined") => handlePortalRequest(request.uuid, status, note),
    onSuccess: () => {
      toast({ variant: "success", title: "Saved", description: "The employer sees your reply in their portal." });
      void client.invalidateQueries({ queryKey: ["oh-portal-admin", "requests"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  const closed = request.status === "done" || request.status === "declined" || request.status === "cancelled";
  return (
    <Drawer title={`${REQUEST_KIND_LABEL[request.kind] ?? request.kind} · ${request.employer_name ?? ""}`} description={REQUEST_STATUS_LABEL[request.status]} onClose={onClose}>
      <div className="space-y-3 text-[13px]" data-testid="oh-portal-request-sheet">
        <p>
          <span className="text-dash-muted">Worker: </span>
          {request.worker_name || "Not about one worker"}
        </p>
        <p>
          <span className="text-dash-muted">Preferred date: </span>
          {fmtDate(request.preferred_date)}
        </p>
        {request.note ? <p className="whitespace-pre-wrap rounded-md bg-dash-canvas px-3 py-2">{request.note}</p> : null}
        <label className="block space-y-1">
          <span className="text-dash-muted">Reply to the employer</span>
          <textarea aria-label="Reply" className="min-h-20 w-full rounded-md border border-dash-border px-3 py-2" value={note} disabled={closed} onChange={(e) => setNote(e.target.value)} />
        </label>
        {!closed ? (
          <DrawerActions>
            <SecondaryButton disabled={save.isPending} onClick={() => save.mutate("declined")}>
              Decline
            </SecondaryButton>
            {request.status === "pending" ? (
              <SecondaryButton disabled={save.isPending} onClick={() => save.mutate("accepted")}>
                Accept
              </SecondaryButton>
            ) : null}
            <PageActionButton disabled={save.isPending} onClick={() => save.mutate("done")}>
              Mark done
            </PageActionButton>
          </DrawerActions>
        ) : null}
      </div>
    </Drawer>
  );
}

function ContactsView({ view, setView }: { view: View; setView: (v: View) => void }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const query = useQuery({ queryKey: ["oh-portal-admin", "contacts"], queryFn: fetchPortalContacts, retry: false });
  const rows = query.data ?? [];
  const current = editing && editing !== "new" ? (rows.find((c) => c.uuid === editing) ?? null) : null;
  return (
    <>
      <Tabs view={view} setView={setView} actions={query.isSuccess ? <PageActionButton onClick={() => setEditing("new")}>Give a login access</PageActionButton> : null} />
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? (
        <LoadError>{isForbidden(query.error) ? "Only an administrator can manage employer logins." : errorText(query.error, "Could not load employer logins.")}</LoadError>
      ) : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyAction
          icon="clipboard"
          title="No employer logins yet"
          description="Create a normal user for the employer contact first, then give that login access to their company's portal."
        />
      ) : null}
      {query.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Person", "Employer", "Can see", "Status", "Actions"]}>
          {rows.map((c) => (
            <DaRow key={c.uuid} testId="oh-portal-contact-row" onClick={() => setEditing(c.uuid)}>
              <DaCell first>
                <ImmPrimaryCell title={c.name || c.email} detail={c.email} />
              </DaCell>
              <DaCell>{c.employer_name}</DaCell>
              <DaCell>{c.scopes.map((s) => PORTAL_SCOPE_LABEL[s] ?? s).join(", ") || "—"}</DaCell>
              <DaCell>
                <ImmStatusBadge status={c.is_active ? "active" : "closed"} label={c.is_active ? "Active" : "Off"} />
              </DaCell>
              <DaCell actions>
                <ImmRowAction onClick={() => setEditing(c.uuid)}>Edit</ImmRowAction>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {editing ? <ContactDrawer contact={current} scopes={PORTAL_SCOPES} onClose={() => setEditing(null)} /> : null}
    </>
  );
}
