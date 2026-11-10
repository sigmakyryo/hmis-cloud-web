"use client";

import { useQuery } from "@tanstack/react-query";

import { PORTAL_SCOPE_LABEL, fetchPortalUsers } from "@/features/employer-portal/services/employer-portal.service";

import { PortalState } from "./PortalShell";
import { DaCell, DaRow, ImmPrimaryCell, ImmRecordTable } from "./portal-ui";

export function PortalUsersPage() {
  const query = useQuery({ queryKey: ["employer-portal", "users"], queryFn: fetchPortalUsers, retry: false });
  const rows = query.data ?? [];

  return (
    <div data-testid="employer-portal-users">
      <h1 className="sr-only">Users</h1>
      <PortalState loading={query.isLoading} error={query.error} empty={query.isSuccess && rows.length === 0 ? "No other users." : null}>
        <ImmRecordTable columns={["Person", "Can see"]}>
          {rows.map((u) => (
            <DaRow key={u.email} testId="employer-portal-user">
              <DaCell first>
                <ImmPrimaryCell title={u.name || u.email} detail={u.email} />
              </DaCell>
              <DaCell>{u.scopes.map((s) => PORTAL_SCOPE_LABEL[s] ?? s).join(", ")}</DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      </PortalState>
      <p className="px-5 py-3 text-[12px] text-dash-muted">To add or remove a user, contact the clinic.</p>
    </div>
  );
}
