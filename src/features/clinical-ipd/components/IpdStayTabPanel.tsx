"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { Textarea } from "@/components/ui/textarea";
import { IpdStayDischargeDialog } from "@/features/clinical-ipd/components/IpdStayDischargeDialog";
import { IpdStayTransferDialog } from "@/features/clinical-ipd/components/IpdStayTransferDialog";
import {
  fetchIpdDischargeSummary,
  fetchIpdStays,
  upsertIpdDischargeSummary,
} from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { ClinicalWorkspacePanelProps } from "@/features/clinical-workspace/types/clinical-workspace.types";

export function IpdStayTabPanel({ visitUuid }: ClinicalWorkspacePanelProps) {
  const queryClient = useQueryClient();
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [narrative, setNarrative] = useState("");

  const stayQuery = useQuery({
    queryKey: ["ipd-stay-for-visit", visitUuid],
    queryFn: async () => {
      const stays = await fetchIpdStays({ status: "active", visit: visitUuid });
      return stays[0] ?? null;
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["ipd-discharge-summary", stayQuery.data?.uuid],
    enabled: Boolean(stayQuery.data?.uuid),
    queryFn: () => fetchIpdDischargeSummary(stayQuery.data!.uuid),
  });

  const summary = summaryQuery.data;
  const isSigned = Boolean(summary?.is_signed);

  useEffect(() => {
    if (!summary) return;
    setDiagnosis(summary.diagnosis_text || "");
    setMedications(summary.medications_text || "");
    setFollowUp(summary.follow_up || "");
    setNarrative(summary.narrative || "");
  }, [summary]);

  const saveSummaryMutation = useMutation({
    mutationFn: (sign: boolean) =>
      upsertIpdDischargeSummary(stayQuery.data!.uuid, {
        diagnosis_text: diagnosis,
        medications_text: medications,
        follow_up: followUp,
        narrative,
        sign,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["ipd-discharge-summary", stayQuery.data?.uuid],
      });
    },
  });

  if (stayQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading stay…</p>;
  }
  if (stayQuery.error) {
    return (
      <p className="text-sm text-destructive">
        {stayQuery.error instanceof Error
          ? stayQuery.error.message
          : "Failed to load stay."}
      </p>
    );
  }
  if (!stayQuery.data) {
    return (
      <p className="text-sm text-muted-foreground">
        No active inpatient stay linked to this visit.
      </p>
    );
  }

  const data = stayQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-medium">Inpatient stay</h2>
        <StatusDotBadge
          tone={data.status === "admitted" ? "success" : "neutral"}
        >
          {data.status}
        </StatusDotBadge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTransfer(true)}
          >
            Transfer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isSigned}
            onClick={() => setShowDischarge(true)}
          >
            Discharge
          </Button>
        </div>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Patient</dt>
          <dd>{data.customer_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Source</dt>
          <dd>
            {data.admission_source === "direct" ? "Direct admit" : "OPD handoff"}
          </dd>
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

      <section className="space-y-3 border-t border-border/60 pt-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Discharge summary</h3>
          <StatusDotBadge tone={isSigned ? "success" : "warning"}>
            {isSigned ? "Signed" : "Draft"}
          </StatusDotBadge>
        </div>
        {!isSigned ? (
          <p className="text-xs text-muted-foreground">
            A signed discharge summary is required before discharge.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Signed by {summary?.signed_by_name || "clinician"}
            {summary?.signed_at
              ? ` · ${new Date(summary.signed_at).toLocaleString()}`
              : ""}
          </p>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="dx-text">Diagnosis</Label>
          <Textarea
            id="dx-text"
            rows={2}
            disabled={isSigned}
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meds-text">Medications on discharge</Label>
          <Textarea
            id="meds-text"
            rows={2}
            disabled={isSigned}
            value={medications}
            onChange={(event) => setMedications(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="follow-up-text">Follow-up</Label>
          <Textarea
            id="follow-up-text"
            rows={2}
            disabled={isSigned}
            value={followUp}
            onChange={(event) => setFollowUp(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="narrative-text">Narrative</Label>
          <Textarea
            id="narrative-text"
            rows={3}
            disabled={isSigned}
            value={narrative}
            onChange={(event) => setNarrative(event.target.value)}
          />
        </div>
        {saveSummaryMutation.error ? (
          <p className="text-sm text-destructive">
            {saveSummaryMutation.error instanceof Error
              ? saveSummaryMutation.error.message
              : "Could not save summary."}
          </p>
        ) : null}
        {!isSigned ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saveSummaryMutation.isPending}
              onClick={() => saveSummaryMutation.mutate(false)}
            >
              Save draft
            </Button>
            <Button
              type="button"
              disabled={
                saveSummaryMutation.isPending || !diagnosis.trim()
              }
              onClick={() => saveSummaryMutation.mutate(true)}
            >
              Sign summary
            </Button>
          </div>
        ) : null}
      </section>

      <IpdStayTransferDialog
        stayUuid={data.uuid}
        clinicUuid={data.clinic_uuid}
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
      />
      <IpdStayDischargeDialog
        stayUuid={data.uuid}
        open={showDischarge}
        onClose={() => setShowDischarge(false)}
        canDischarge={isSigned}
      />
    </div>
  );
}
