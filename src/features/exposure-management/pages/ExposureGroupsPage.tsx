"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageActionButton } from "@/components/ui/app-buttons";
import { ROUTES } from "@/constants/routes";
import { ListPageDataTableCell, ListPageDataTableRow } from "@/features/app-shell/components/page-layout";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import { ImmPrimaryCell, ImmRecordTable, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmSearchBar } from "@/app/(app)/immunizations/_components/shared/ImmSearchBar";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { useImmList } from "@/app/(app)/immunizations/_components/shared/use-imm-list";
import { ExposureGroupSheet } from "@/features/exposure-management/components/ExposureGroupSheet";
import type { ExposureGroup } from "@/features/exposure-management/exposure.types";
import { errorMessage } from "@/features/exposure-management/lib/exposure-format";
import { exposureKeys, fetchGroups } from "@/features/exposure-management/services/exposure.service";

export function ExposureGroupsPage() {
  const query = useQuery({ queryKey: exposureKeys.groups, queryFn: () => fetchGroups() });
  const [creating, setCreating] = useState(false);
  const rows = query.data ?? [];
  const list = useImmList<ExposureGroup>({
    rows,
    searchText: (g) => [g.code, g.name, g.site, g.department, g.job_title].join(" "),
    sortValue: (g, key) => (key === "members" ? g.member_count : g.name),
    defaultSort: { key: "name", direction: "asc" },
  });

  return (
    <ImmPageShell testId="exposure-groups-page" title="Similar exposure groups">
      <ImmTabsBar
        label="Exposure groups"
        active="groups"
        onChange={() => undefined}
        tabs={[{ key: "groups", label: "Groups", count: rows.length }]}
        actions={<PageActionButton onClick={() => setCreating(true)}>New group</PageActionButton>}
      />
      <ImmSearchBar value={list.query} onChange={list.setQuery} placeholder="Search groups" matched={list.controls.matched} total={rows.length} onClear={() => list.setQuery("")} />
      {query.isPending ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorMessage(query.error, "Could not load groups.")}</LoadError> : null}
      {query.data && rows.length === 0 ? (
        <EmptyAction title="No exposure groups" description="A group is a set of workers with the same exposure, defined by site, department or job title." icon="activity" />
      ) : null}
      {rows.length > 0 ? (
        <ImmRecordTable list={list.controls} columns={[{ label: "Group", sortKey: "name" }, "Rules", { label: "Members", sortKey: "members" }, "Owner", "Status"]}>
          {list.pageRows.map((group) => (
            <ListPageDataTableRow key={group.uuid}>
              <ListPageDataTableCell className="pl-4 md:pl-6">
                <ImmPrimaryCell title={<Link href={ROUTES.exposureManagementGroup(group.uuid)} className="hover:underline">{group.name}</Link>} detail={group.code} />
              </ListPageDataTableCell>
              <ListPageDataTableCell>{[group.site, group.department, group.job_title].filter(Boolean).join(" · ") || "—"}</ListPageDataTableCell>
              <ListPageDataTableCell className="tabular-nums">{group.member_count}</ListPageDataTableCell>
              <ListPageDataTableCell>{group.owner_name || "—"}</ListPageDataTableCell>
              <ListPageDataTableCell><ImmStatusBadge status={group.is_active ? "up_to_date" : "pending"} label={group.is_active ? "Active" : "Inactive"} /></ListPageDataTableCell>
            </ListPageDataTableRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {creating ? <ExposureGroupSheet onClose={() => setCreating(false)} /> : null}
    </ImmPageShell>
  );
}
