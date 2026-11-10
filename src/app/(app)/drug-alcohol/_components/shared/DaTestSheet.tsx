"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { downloadBlob } from "@/app/(app)/immunizations/_components/shared/download-blob";
import { ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  downloadDaCcf,
  downloadDaLetter,
  fetchDaTest,
} from "@/features/occupational-health/services/drug-alcohol.service";
import { useToast } from "@/providers/toast-provider";
import {
  FITNESS_LABEL,
  REASON_LABEL,
  REFUSAL_LABEL,
  SPECIMEN_LABEL,
  TEST_STATUS_LABEL,
  VERIFICATION_LABEL,
  errorText,
  fmtDateTime,
  label,
} from "./da-format";
import { DaFact, DaSection } from "./da-ui";

export const daTestKey = (uuid: string) => ["oh-da", "test", uuid] as const;

/** Read-only test record with document downloads. Results show only for medical reviewers. */
export function DaTestSheet({ uuid, onClose }: { uuid: string; onClose: () => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const query = useQuery({ queryKey: daTestKey(uuid), queryFn: () => fetchDaTest(uuid) });
  const test = query.data;

  async function grab(kind: "ccf" | "employer" | "worker") {
    setBusy(kind);
    try {
      const file = kind === "ccf" ? await downloadDaCcf(uuid) : await downloadDaLetter(uuid, kind);
      downloadBlob(file.blob, file.filename);
    } catch (error) {
      toast({ title: "Could not download", description: errorText(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Drawer title={test ? `Test ${test.reference}` : "Test"} description="Drug & alcohol test record" onClose={onClose} wide>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not open this test.")}</LoadError> : null}
      {test ? (
        <div className="space-y-4" data-testid="oh-da-test-sheet">
          <DaSection title="Summary">
            <DaFact label="Worker">{test.customer_initials || "—"}</DaFact>
            <DaFact label="Why">{label(REASON_LABEL, test.reason)}</DaFact>
            <DaFact label="Specimens">{test.specimen_types.map((s) => label(SPECIMEN_LABEL, s)).join(", ") || "—"}</DaFact>
            <DaFact label="Stage">
              <ImmStatusBadge status={test.status} label={label(TEST_STATUS_LABEL, test.status)} />
            </DaFact>
            <DaFact label="Fitness">{label(FITNESS_LABEL, test.fitness_outcome)}</DaFact>
            {test.restricted_until ? <DaFact label="Stood down until">{fmtDateTime(test.restricted_until)}</DaFact> : null}
            <DaFact label="Policy">{test.policy ? `${test.policy.name} v${test.policy.version ?? "—"}` : "—"}</DaFact>
            <DaFact label="Started">{fmtDateTime(test.created_at)}</DaFact>
            {test.verified_at ? <DaFact label="Finished">{fmtDateTime(test.verified_at)}</DaFact> : null}
            {test.refusal ? <DaFact label="Refusal">{label(REFUSAL_LABEL, test.refusal_reason)}</DaFact> : null}
            {test.retest_required ? <DaFact label="Retest">{test.retest_observed ? "Needed, observed" : "Needed"}</DaFact> : null}
          </DaSection>

          {test.detail_visible ? (
            <DaSection title="Result (medical reviewer only)">
              <DaFact label="Final result">{label(VERIFICATION_LABEL, test.final_result)}</DaFact>
              <DaFact label="Substances">{test.final_substances.join(", ") || "None"}</DaFact>
              <DaFact label="Rapid screen">{label({}, test.screen_outcome)}</DaFact>
              {test.alcohol.screen_value != null ? (
                <DaFact label="Breath alcohol">
                  {test.alcohol.screen_value}
                  {test.alcohol.confirm_value != null ? ` → ${test.alcohol.confirm_value}` : ""} {test.alcohol.unit}
                </DaFact>
              ) : null}
              {test.lab.results.length > 0 ? (
                <DaFact label="Lab">
                  {test.lab.results.map((r) => `${r.code}${r.value != null ? ` ${r.value}${r.unit ? ` ${r.unit}` : ""}` : ""}${r.positive ? " (positive)" : ""}`).join("; ")}
                </DaFact>
              ) : null}
            </DaSection>
          ) : (
            <p className="text-[12px] text-dash-muted">
              Detailed results are only shown to the medical reviewer. You see the fitness outcome only.
            </p>
          )}

          <DaSection title="Chain of custody">
            <DaFact label="Custody form no.">{test.custody.ccf_number || "—"}</DaFact>
            <DaFact label="Specimen ID">{test.custody.specimen_id || "—"}</DaFact>
            <DaFact label="Seal">{test.custody.seal_number ? `${test.custody.seal_number}${test.custody.seal_intact === false ? " (broken)" : ""}` : "—"}</DaFact>
            <DaFact label="Observed">{test.custody.observed ? "Yes" : "No"}</DaFact>
            <DaFact label="Split specimen">{test.custody.split_specimen ? "Yes" : "No"}</DaFact>
            <DaFact label="Collected">{fmtDateTime(test.custody.collected_at)}</DaFact>
            {test.custody_events.map((event, index) => (
              <DaFact key={`${event.event}-${index}`} label={fmtDateTime(event.occurred_at)}>
                {event.event.replace(/_/g, " ")} {event.actor_initials ? `· ${event.actor_initials}` : ""}
              </DaFact>
            ))}
          </DaSection>

          {test.purged ? <p className="text-[12px] text-dash-muted">Details were removed under the retention rules.</p> : null}

          <div className="flex flex-wrap gap-2">
            <SecondaryButton size="sm" disabled={busy !== null} onClick={() => grab("ccf")}>
              Custody form PDF
            </SecondaryButton>
            {test.status === "verified" ? (
              <SecondaryButton size="sm" disabled={busy !== null} onClick={() => grab("employer")}>
                Employer letter
              </SecondaryButton>
            ) : null}
            {test.status === "verified" && test.detail_visible ? (
              <SecondaryButton size="sm" disabled={busy !== null} onClick={() => grab("worker")}>
                Worker letter
              </SecondaryButton>
            ) : null}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
