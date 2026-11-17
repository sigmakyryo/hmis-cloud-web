"use client";

import { useQuery } from "@tanstack/react-query";
import { UserGroupIcon } from "@hugeicons/core-free-icons";

import {
  PortalCell,
  PortalFootnote,
  PortalPage,
  PortalPageHeader,
  PortalPerson,
  PortalRow,
  PortalTable,
} from "@/features/employer-portal/components/PortalPrimitives";
import { PORTAL_SCOPE_LABEL, fetchPortalUsers } from "@/features/employer-portal/services/employer-portal.service";

import { PortalState } from "./PortalShell";

export function PortalUsersPage() {
  const query = useQuery({ queryKey: ["employer-portal", "users"], queryFn: fetchPortalUsers, retry: false });
  const rows = query.data ?? [];

  return (
    <PortalPage testId="employer-portal-users">
      <PortalPageHeader icon={UserGroupIcon} title="Employees" subtitle="People at your company who use this portal" />
      <div className="pt-5">
        <PortalState loading={query.isLoading} error={query.error} empty={query.isSuccess && rows.length === 0 ? "No other users." : null} emptyIcon={UserGroupIcon} emptyTitle="Just you for now">
          <PortalTable columns={["Person", "Can see"]}>
            {rows.map((u) => (
              <PortalRow key={u.email} testId="employer-portal-user">
                <PortalCell>
                  <PortalPerson title={u.name || u.email} detail={u.name ? u.email : undefined} />
                </PortalCell>
                <PortalCell>{u.scopes.map((s) => PORTAL_SCOPE_LABEL[s] ?? s).join(", ")}</PortalCell>
              </PortalRow>
            ))}
          </PortalTable>
        </PortalState>
      </div>
      <PortalFootnote>To add or remove a user, contact the clinic.</PortalFootnote>
    </PortalPage>
  );
}
