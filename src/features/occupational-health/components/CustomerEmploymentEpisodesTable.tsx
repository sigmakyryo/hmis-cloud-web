"use client";

import { TableTextCell } from "@/components/table-text-cell";
import { SecondaryButton } from "@/components/ui/app-buttons";
import { Badge } from "@/components/ui/badge";
import type { EmploymentEpisode } from "@/features/occupational-health/types";
import {
  InventoryListTable,
  type InventoryListTableColumn,
} from "@/features/inventory/components/list/InventoryListTable";

type CustomerEmploymentEpisodesTableProps = {
  episodes: EmploymentEpisode[];
  onUpdate: (episode: EmploymentEpisode) => void;
};

export function CustomerEmploymentEpisodesTable({
  episodes,
  onUpdate,
}: CustomerEmploymentEpisodesTableProps) {
  const columns: InventoryListTableColumn<EmploymentEpisode>[] = [
    {
      key: "employee_number",
      label: "Employee #",
      render: (episode) => (
        <TableTextCell className="font-medium text-brand-navy">
          {episode.employee_number?.trim() || "—"}
        </TableTextCell>
      ),
    },
    {
      key: "start_date",
      label: "Start",
      render: (episode) => (
        <TableTextCell className="text-brand-slate">
          {episode.start_date || "—"}
        </TableTextCell>
      ),
    },
    {
      key: "end_date",
      label: "End",
      render: (episode) => (
        <TableTextCell className="text-brand-slate">
          {episode.end_date || "Open"}
        </TableTextCell>
      ),
    },
    {
      key: "site",
      label: "Site",
      render: (episode) => (
        <TableTextCell className="text-brand-slate">
          {episode.site?.trim() || "—"}
        </TableTextCell>
      ),
    },
    {
      key: "department",
      label: "Department",
      render: (episode) => (
        <TableTextCell className="text-brand-slate">
          {episode.department_name?.trim() || "—"}
        </TableTextCell>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (episode) =>
        episode.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        ),
    },
    {
      key: "actions",
      label: "",
      headerClassName: "text-right",
      cellClassName: "text-right",
      render: (episode) => (
        <div
          className="flex justify-end"
          onClick={(event) => event.stopPropagation()}
        >
          <SecondaryButton
            type="button"
            size="sm"
            onClick={() => onUpdate(episode)}
          >
            Update
          </SecondaryButton>
        </div>
      ),
    },
  ];

  return (
    <InventoryListTable
      items={episodes}
      columns={columns}
      getRowKey={(episode) => episode.uuid}
      onRowClick={onUpdate}
    />
  );
}
