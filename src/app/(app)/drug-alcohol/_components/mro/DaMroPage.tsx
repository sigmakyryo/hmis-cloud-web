"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { EmptyAction } from "@/app/(app)/immunizations/_components/shared/EmptyAction";
import { CheckField, Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmPageShell } from "@/app/(app)/immunizations/_components/shared/ImmPageShell";
import {
  ImmPrimaryCell,
  ImmRecordTable,
  ImmRowAction,
  ImmStatusBadge,
} from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmTabsBar } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  fetchDaMroQueue,
  recordDaMroInterview,
  recordDaSplitResult,
  requestDaSplit,
  verifyDaMro,
  type DaMroReview,
} from "@/features/occupational-health/services/drug-alcohol.service";
import { useToast } from "@/providers/toast-provider";
import { REASON_LABEL, VERIFICATION_LABEL, errorText, fmtDateTime, isForbidden, label } from "../shared/da-format";
import { DaCell, DaFact, DaRow, DaSection } from "../shared/da-ui";

type View = "open" | "all";

export function DaMroPage() {
  const [view, setView] = useState<View>("open");
  const [selected, setSelected] = useState<DaMroReview | null>(null);
  const query = useQuery({
    queryKey: ["oh-da", "mro", view],
    queryFn: () => fetchDaMroQueue(view === "all"),
    retry: false,
  });
  const rows = query.data ?? [];

  return (
    <ImmPageShell title="Medical review" testId="oh-da-mro-page">
      <ImmTabsBar<View>
        label="Medical review views"
        tabs={[
          { key: "open", label: "Waiting for review", count: view === "open" ? rows.length : undefined },
          { key: "all", label: "Include finished" },
        ]}
        active={view}
        onChange={setView}
      />
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? (
        <LoadError>
          {isForbidden(query.error)
            ? "Only the medical review officer (MRO) can open this list."
            : errorText(query.error, "Could not load the review list.")}
        </LoadError>
      ) : null}
      {query.isSuccess && rows.length === 0 ? (
        <EmptyAction icon="flask" title="Nothing to review" description="Lab-confirmed non-negative results land here." />
      ) : null}
      {query.isSuccess && rows.length > 0 ? (
        <ImmRecordTable columns={["Test", "Why", "Arrived", "Stage", "Actions"]}>
          {rows.map((r) => (
            <DaRow key={r.uuid} testId="oh-da-mro-row" onClick={() => setSelected(r)}>
              <DaCell first>
                <ImmPrimaryCell title={r.test?.reference ?? "—"} detail={r.test?.customer_initials} />
              </DaCell>
              <DaCell>{label(REASON_LABEL, r.test?.reason)}</DaCell>
              <DaCell>{fmtDateTime(r.created_at)}</DaCell>
              <DaCell>
                <ImmStatusBadge status={r.status} />
              </DaCell>
              <DaCell actions>
                <ImmRowAction onClick={() => setSelected(r)}>Review</ImmRowAction>
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
      {selected ? <MroSheet review={selected} onClose={() => setSelected(null)} /> : null}
    </ImmPageShell>
  );
}

function MroSheet({ review, onClose }: { review: DaMroReview; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [current, setCurrent] = useState(review);
  const [notes, setNotes] = useState(review.interview_notes ?? "");
  const [contacted, setContacted] = useState(review.donor_contacted);
  const [prescription, setPrescription] = useState(review.legitimate_prescription);
  const [medication, setMedication] = useState(review.prescription?.medication ?? "");
  const [safety, setSafety] = useState(review.safety_concern);
  const [verification, setVerification] = useState("");
  const [unreachable, setUnreachable] = useState(false);
  const [retest, setRetest] = useState(false);
  const test = current.test;
  const closed = !["pending", "interviewing", "split_requested"].includes(current.status);

  const run = useMutation({
    mutationFn: async (step: "interview" | "verify" | "split" | "split_ok" | "split_fail") => {
      if (step === "interview")
        return recordDaMroInterview(current.uuid, {
          donor_contacted: contacted,
          notes,
          legitimate_prescription: prescription,
          prescription: prescription ? { medication, prescriber_verified: true } : undefined,
          safety_concern: safety,
        });
      if (step === "verify") {
        if (!verification) throw new Error("Choose the verified result first.");
        return verifyDaMro(current.uuid, {
          verification,
          donor_unreachable: unreachable,
          retest_required: retest,
          retest_observed: retest,
        });
      }
      if (step === "split") return requestDaSplit(current.uuid);
      return recordDaSplitResult(current.uuid, step === "split_ok" ? "reconfirmed" : "failed_to_reconfirm");
    },
    onSuccess: (next) => {
      setCurrent(next);
      toast({ variant: "success", title: "Saved" });
      void client.invalidateQueries({ queryKey: ["oh-da"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  return (
    <Drawer title={`Review ${test?.reference ?? ""}`} description="Medical review officer only" onClose={onClose} wide>
      <div className="space-y-4" data-testid="oh-da-mro-sheet">
        <DaSection title="Laboratory">
          <DaFact label="Why tested">{label(REASON_LABEL, test?.reason)}</DaFact>
          <DaFact label="Trigger">{current.trigger.replace(/_/g, " ")}</DaFact>
          {(test?.lab.results ?? []).map((r, index) => (
            <DaFact key={`${r.code}-${index}`} label={r.code}>
              {r.value ?? "—"} {r.unit} {r.cutoff != null ? `(cut-off ${r.cutoff})` : ""} {r.positive ? "· positive" : ""}
            </DaFact>
          ))}
          {test?.custody.specimen_flag && test.custody.specimen_flag !== "none" ? (
            <DaFact label="Specimen">{test.custody.specimen_flag}</DaFact>
          ) : null}
          <DaFact label="Split specimen">{test?.custody.split_specimen ? "Available" : "Not collected"}</DaFact>
          {current.split_result ? <DaFact label="Split result">{current.split_result.replace(/_/g, " ")}</DaFact> : null}
        </DaSection>

        {!closed ? (
          <>
            <DaSection title="Interview with the worker">
              <div className="space-y-2">
                <CheckField label="Worker contacted" checked={contacted} onChange={setContacted} />
                <CheckField label="Has a valid prescription that explains the result" checked={prescription} onChange={setPrescription} />
                {prescription ? <Field label="Medicine" value={medication} onChange={setMedication} /> : null}
                <CheckField label="Safety concern to share with the employer" checked={safety} onChange={setSafety} />
                <Field label="Notes" value={notes} onChange={setNotes} />
                <SecondaryButton size="sm" disabled={run.isPending} onClick={() => run.mutate("interview")}>
                  Save interview
                </SecondaryButton>
              </div>
            </DaSection>
            <DaSection title="Verify">
              <div className="space-y-2">
                <SelectField label="Verified result" value={verification} onChange={setVerification} required>
                  <option value="">Choose…</option>
                  {Object.entries(VERIFICATION_LABEL).map(([key, text]) => (
                    <option key={key} value={key}>
                      {text}
                    </option>
                  ))}
                </SelectField>
                <CheckField label="Could not reach the worker after reasonable attempts" checked={unreachable} onChange={setUnreachable} />
                <CheckField label="Ask for an observed retest" checked={retest} onChange={setRetest} />
              </div>
            </DaSection>
            {test?.custody.split_specimen ? (
              <DaSection title="Split specimen">
                <div className="flex flex-wrap gap-2">
                  {current.status !== "split_requested" ? (
                    <SecondaryButton size="sm" disabled={run.isPending} onClick={() => run.mutate("split")}>
                      Worker asked for split test
                    </SecondaryButton>
                  ) : (
                    <>
                      <SecondaryButton size="sm" disabled={run.isPending} onClick={() => run.mutate("split_ok")}>
                        Split reconfirmed
                      </SecondaryButton>
                      <SecondaryButton size="sm" disabled={run.isPending} onClick={() => run.mutate("split_fail")}>
                        Split did not reconfirm
                      </SecondaryButton>
                    </>
                  )}
                </div>
              </DaSection>
            ) : null}
          </>
        ) : (
          <DaSection title="Outcome">
            <DaFact label="Verified as">{label(VERIFICATION_LABEL, current.verification)}</DaFact>
            <DaFact label="Verified">{fmtDateTime(current.verified_at)}</DaFact>
            <DaFact label="Reviewer">{current.reviewer_initials || "—"}</DaFact>
          </DaSection>
        )}
        <DrawerActions>
          <SecondaryButton onClick={onClose}>Close</SecondaryButton>
          {!closed ? (
            <PageActionButton disabled={run.isPending || !verification} onClick={() => run.mutate("verify")}>
              Verify result
            </PageActionButton>
          ) : null}
        </DrawerActions>
      </div>
    </Drawer>
  );
}
