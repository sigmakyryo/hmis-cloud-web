"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Textarea } from "@/components/ui/textarea";
import { BandChip } from "@/features/exposure-management/components/ExposureBadges";
import type { ExposureAssessment } from "@/features/exposure-management/exposure.types";
import { CONFIDENCE_LABELS, errorMessage, formatDate, formatNumber } from "@/features/exposure-management/lib/exposure-format";
import {
  approveAssessment,
  draftAssessmentWithAi,
  exposureKeys,
  recalculateAssessment,
  updateAssessment,
} from "@/features/exposure-management/services/exposure.service";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-dash-muted">{label}</dt>
      <dd className="text-[14px] font-medium tabular-nums text-brand-navy">{value}</dd>
    </div>
  );
}

export function ExposureAssessmentPanel({ groupUuid, agentUuid, assessment }: { groupUuid: string; agentUuid: string; assessment: ExposureAssessment | null }) {
  const qc = useQueryClient();
  const [narrative, setNarrative] = useState(assessment?.narrative ?? "");
  const [adequate, setAdequate] = useState<"" | "yes" | "no">(assessment?.controls_adequate === null || assessment?.controls_adequate === undefined ? "" : assessment.controls_adequate ? "yes" : "no");
  const [message, setMessage] = useState("");
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: exposureKeys.group(groupUuid) });
    void qc.invalidateQueries({ queryKey: exposureKeys.series(groupUuid, agentUuid) });
    void qc.invalidateQueries({ queryKey: exposureKeys.dashboard });
  };
  const fail = (fallback: string) => (error: unknown) => setMessage(errorMessage(error, fallback));
  const controls = adequate === "" ? null : adequate === "yes";

  const recalc = useMutation({ mutationFn: () => recalculateAssessment(groupUuid, agentUuid), onSuccess: () => { setMessage("Recalculated."); refresh(); }, onError: fail("Could not recalculate.") });
  const save = useMutation({ mutationFn: () => updateAssessment(assessment!.uuid, { narrative, controls_adequate: controls }), onSuccess: () => { setMessage("Saved."); refresh(); }, onError: fail("Could not save.") });
  const approve = useMutation({ mutationFn: () => approveAssessment(assessment!.uuid, { controls_adequate: controls, narrative }), onSuccess: () => { setMessage("Approved."); refresh(); }, onError: fail("Only an administrator can approve an assessment.") });
  const draft = useMutation({ mutationFn: () => draftAssessmentWithAi(assessment!.uuid), onSuccess: () => { setMessage("Draft requested. Review it before using it."); refresh(); }, onError: fail("Could not draft with AI.") });

  return (
    <section className="space-y-3 px-4 py-4 md:px-6" aria-label="Assessment">
      <div className="flex flex-wrap items-center gap-3">
        <BandChip band={assessment?.band} confidence={assessment?.confidence} />
        {assessment ? <span className="text-[12px] text-dash-muted">v{assessment.version} · {assessment.status === "approved" ? `approved ${formatDate(assessment.approved_at)}` : "draft"} · {CONFIDENCE_LABELS[assessment.confidence]}</span> : <span className="text-[13px] text-dash-muted">No assessment yet.</span>}
        <SecondaryButton type="button" disabled={recalc.isPending} onClick={() => recalc.mutate()}>{recalc.isPending ? "Calculating…" : "Recalculate"}</SecondaryButton>
      </div>
      {assessment ? (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Stat label="Samples" value={String(assessment.sample_count)} />
            <Stat label="Geometric mean" value={formatNumber(assessment.gm)} />
            <Stat label="GSD" value={formatNumber(assessment.gsd)} />
            <Stat label="95th percentile" value={`${formatNumber(assessment.p95)} ${assessment.oel_unit}`} />
            <Stat label="Upper 95% limit" value={formatNumber(assessment.ucl95)} />
            <Stat label="Chance of exceeding" value={assessment.exceedance_fraction === null ? "—" : `${(assessment.exceedance_fraction * 100).toFixed(1)}%`} />
            <Stat label="Limit" value={assessment.oel_value === null ? "—" : `${formatNumber(assessment.oel_value)} ${assessment.oel_unit}`} />
            <Stat label="Next review" value={formatDate(assessment.next_review_on)} />
          </dl>
          {assessment.flags.length ? <p className="text-[12px] text-amber-800">Notes: {assessment.flags.join(", ").replaceAll("_", " ")}</p> : null}
          {assessment.citation ? <p className="text-[12px] text-dash-muted">Limit source: {assessment.citation}</p> : null}
          <div className="space-y-1.5">
            <label htmlFor="assessment-narrative" className="text-sm font-medium">Narrative</label>
            <Textarea id="assessment-narrative" rows={4} disabled={assessment.status === "approved"} value={narrative} onChange={(e) => setNarrative(e.target.value)} />
            {assessment.ai_draft ? (
              <div className="rounded-md border border-dash-border bg-dash-canvas/50 p-3 text-[13px]">
                <p className="mb-1 font-medium text-brand-navy">AI draft (not reviewed)</p>
                <p className="whitespace-pre-wrap text-brand-slate">{assessment.ai_draft}</p>
                <button type="button" className="mt-2 font-medium text-brand-primary hover:underline" onClick={() => setNarrative(assessment.ai_draft ?? "")}>Use as narrative</button>
              </div>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-[13px] text-brand-slate">
            Current controls adequate?
            <select className="h-8 rounded-lg border border-dash-border bg-white px-2" value={adequate} onChange={(e) => setAdequate(e.target.value as "" | "yes" | "no")}>
              <option value="">Not decided</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" disabled={draft.isPending || assessment.status === "approved"} onClick={() => draft.mutate()}>{draft.isPending ? "Drafting…" : "Draft with AI"}</SecondaryButton>
            <SecondaryButton type="button" disabled={save.isPending || assessment.status === "approved"} onClick={() => save.mutate()}>Save</SecondaryButton>
            <PrimaryButton type="button" disabled={approve.isPending || assessment.status === "approved"} onClick={() => approve.mutate()}>Approve</PrimaryButton>
          </div>
        </>
      ) : null}
      {message ? <p role="status" className="text-[13px] text-brand-slate">{message}</p> : null}
    </section>
  );
}
