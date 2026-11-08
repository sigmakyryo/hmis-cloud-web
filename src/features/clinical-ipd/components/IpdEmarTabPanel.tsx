"use client";

import { useQuery } from "@tanstack/react-query";

import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import {
  fetchIpdEmar,
  fetchIpdStays,
} from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

export function IpdEmarTabPanel({ visitUuid }: ClinicalWorkspacePanelProps) {
  const stayQuery = useQuery({
    queryKey: ["ipd-stay-for-visit", visitUuid],
    queryFn: async () => {
      const stays = await fetchIpdStays({ status: "active" });
      return stays.find((stay) => stay.visit_uuid === visitUuid) ?? null;
    },
  });

  const emarQuery = useQuery({
    queryKey: ["ipd-emar", stayQuery.data?.uuid],
    enabled: Boolean(stayQuery.data?.uuid),
    queryFn: () => fetchIpdEmar(stayQuery.data!.uuid),
  });

  if (stayQuery.isLoading || emarQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading eMAR…</p>;
  }
  if (!stayQuery.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Admit the patient before recording administrations.
      </p>
    );
  }

  const rows = emarQuery.data ?? [];
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No medication administrations recorded yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li
          key={row.uuid}
          className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 text-sm"
        >
          <div>
            <p className="font-medium">{row.product_name}</p>
            <p className="text-muted-foreground">
              {new Date(row.administered_at).toLocaleString()}
              {row.dose_given ? ` · ${row.dose_given}` : ""}
            </p>
          </div>
          <StatusDotBadge tone="neutral">{row.status}</StatusDotBadge>
        </li>
      ))}
    </ul>
  );
}
