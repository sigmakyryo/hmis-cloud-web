"use client";

import { useQuery } from "@tanstack/react-query";

import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { fetchIpdStays } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

export function IpdStayTabPanel({ visitUuid }: ClinicalWorkspacePanelProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ipd-stay-for-visit", visitUuid],
    queryFn: async () => {
      const stays = await fetchIpdStays({ status: "active" });
      return stays.find((stay) => stay.visit_uuid === visitUuid) ?? null;
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading stay…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Failed to load stay."}
      </p>
    );
  }
  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        No active inpatient stay linked to this visit.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-medium">Inpatient stay</h2>
        <StatusDotBadge
          tone={data.status === "admitted" ? "success" : "neutral"}
        >
          {data.status}
        </StatusDotBadge>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Patient</dt>
          <dd>{data.customer_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Source</dt>
          <dd>{data.admission_source === "direct" ? "Direct admit" : "OPD handoff"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ward / bed</dt>
          <dd>
            {data.current_ward_name ?? "—"} / {data.current_bed_code ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Admitting clinician</dt>
          <dd>{data.admitting_clinician_name || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Presenting complaint</dt>
          <dd>{data.presenting_complaint || "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
