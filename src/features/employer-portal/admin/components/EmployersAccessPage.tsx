"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmFilterBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { errorText, fmtDate, fmtDateTime, isForbidden } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import { PageActionButton } from "@/components/ui/app-buttons";
import { AccessSheet, type AccessPrefill } from "@/features/employer-portal/admin/components/AccessSheet";
import { ContactDrawer } from "@/features/employer-portal/admin/components/ContactDrawer";
import { EMPLOYERS_KEYS, useContactsQuery, useInvitationsQuery } from "@/features/employer-portal/admin/hooks/useEmployersQueries";
import { buildAccessRows, type AccessRow } from "@/features/employer-portal/admin/utils/employers-overview";
import {
  PORTAL_SCOPE_LABEL,
  revokePortalInvitation,
  type PortalScope,
} from "@/features/employer-portal/services/employer-portal.service";
import { useToast } from "@/providers/toast-provider";

type Sheet = { kind: "closed" } | { kind: "add"; prefill?: AccessPrefill } | { kind: "edit"; contactUuid: string };

function scopeText(scopes: PortalScope[]): string {
  return scopes.map((scope) => PORTAL_SCOPE_LABEL[scope] ?? scope).join(", ") || "—";
}

export function EmployersAccessPage() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [sheet, setSheet] = useState<Sheet>({ kind: "closed" });
  const contacts = useContactsQuery();
  const invitations = useInvitationsQuery();
  const rows = buildAccessRows(contacts.data ?? [], invitations.data ?? []);
  const editing = sheet.kind === "edit" ? (contacts.data ?? []).find((contact) => contact.uuid === sheet.contactUuid) : undefined;

  const revoke = useMutation({
    mutationFn: (uuid: string) => revokePortalInvitation(uuid),
    onSuccess: () => {
      toast({ variant: "success", title: "Invitation revoked" });
      void client.invalidateQueries({ queryKey: EMPLOYERS_KEYS.invitations });
    },
    onError: (error) => toast({ variant: "error", title: "Not revoked", description: errorText(error) }),
  });

  function renderRow(row: AccessRow) {
    if (row.kind === "login") {
      const { contact } = row;
      return (
        <DaRow key={row.key} testId="oh-portal-contact-row" onClick={() => setSheet({ kind: "edit", contactUuid: contact.uuid })}>
          <DaCell first>
            <ImmPrimaryCell title={contact.name || contact.email} detail={contact.name ? contact.email : undefined} />
          </DaCell>
          <DaCell>{contact.employer_name}</DaCell>
          <DaCell>{scopeText(contact.scopes)}</DaCell>
          <DaCell>
            <ImmStatusBadge status={contact.is_active ? "active" : "closed"} label={contact.is_active ? "Active" : "Off"} />
          </DaCell>
          <DaCell>{contact.last_signed_in_at ? fmtDateTime(contact.last_signed_in_at) : "Never"}</DaCell>
          <DaCell actions>
            <ImmRowAction onClick={() => setSheet({ kind: "edit", contactUuid: contact.uuid })}>Edit</ImmRowAction>
          </DaCell>
        </DaRow>
      );
    }
    const { invitation } = row;
    const expired = invitation.status === "expired";
    return (
      <DaRow key={row.key} testId="oh-portal-invite-row">
        <DaCell first>
          <ImmPrimaryCell title={invitation.name || invitation.email} detail={invitation.name ? invitation.email : undefined} />
        </DaCell>
        <DaCell>{invitation.employer_name || "—"}</DaCell>
        <DaCell>{scopeText(invitation.scopes)}</DaCell>
        <DaCell>
          <ImmStatusBadge status={expired ? "planned" : "pending"} label={expired ? "Expired" : "Invited"} />
          <span className="ml-2 text-[12px] text-dash-muted">{expired ? "ended" : "expires"} {fmtDate(invitation.expires_at)}</span>
        </DaCell>
        <DaCell>—</DaCell>
        <DaCell actions>
          {expired ? (
            <ImmRowAction
              onClick={() =>
                setSheet({
                  kind: "add",
                  prefill: { email: invitation.email, name: invitation.name, employerUuid: invitation.employer_uuid, scopes: invitation.scopes },
                })
              }
            >
              Invite again
            </ImmRowAction>
          ) : (
            <ImmRowAction disabled={revoke.isPending} onClick={() => revoke.mutate(invitation.uuid)}>
              Revoke
            </ImmRowAction>
          )}
        </DaCell>
      </DaRow>
    );
  }

  return (
    <>
      <ImmFilterBar trailing={contacts.isSuccess ? <PageActionButton onClick={() => setSheet({ kind: "add" })}>Give access</PageActionButton> : null}>
        <p className="py-1.5 text-[13px] text-dash-muted">Employer logins and invitations in one place.</p>
      </ImmFilterBar>
      {contacts.isLoading ? <QuietLoading /> : null}
      {contacts.isError ? (
        <LoadError>{isForbidden(contacts.error) ? "Only an administrator can manage employer logins." : errorText(contacts.error, "Could not load employer logins.")}</LoadError>
      ) : null}
      {invitations.isError && !contacts.isError ? <LoadError>{errorText(invitations.error, "Could not load invitations.")}</LoadError> : null}
      {contacts.isSuccess && rows.length === 0 ? (
        <EmptyAction
          icon="clipboard"
          title="No employer access yet"
          description="Give access with their email and company. An existing login is linked. Otherwise they receive an invitation."
        />
      ) : null}
      {contacts.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Person", "Employer", "Can see", "Status", "Last sign-in", "Actions"]}>{rows.map(renderRow)}</ImmRecordTable>
      ) : null}
      {sheet.kind === "add" ? <AccessSheet prefill={sheet.prefill} onClose={() => setSheet({ kind: "closed" })} /> : null}
      {editing ? <ContactDrawer contact={editing} onClose={() => setSheet({ kind: "closed" })} /> : null}
    </>
  );
}
