"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  WB_ORIGIN_LABEL,
  WB_OUTCOME_LABEL,
  WB_STATUS_LABEL,
  fetchWbCase,
  fetchWbProviders,
  recordWbConsent,
  recordWbOutcome,
  recordWbSession,
  referWbCase,
  saveWbPlan,
  type WbCase,
} from "@/features/occupational-health/services/wellbeing.service";
import { useToast } from "@/providers/toast-provider";
import { errorText, fmtDate, fmtDateTime, label } from "../shared/da-format";
import { DaFact, DaSection } from "../shared/da-ui";

export function WbCaseDrawer({ caseUuid, onClose }: { caseUuid: string; onClose: () => void }) {
  const query = useQuery({ queryKey: ["oh-wb", "case", caseUuid], queryFn: () => fetchWbCase(caseUuid), retry: false });
  const c = query.data;
  return (
    <Drawer title={`Support · ${c?.customer_initials ?? ""}`} description="Private wellbeing record" onClose={onClose} wide>
      {query.isLoading ? <QuietLoading /> : null}
      {query.isError ? <LoadError>{errorText(query.error, "Could not open this case.")}</LoadError> : null}
      {c ? (
        <div className="space-y-5" data-testid="oh-wb-case-sheet">
          <DaSection title="Status">
            <DaFact label="Stage">{label(WB_STATUS_LABEL, c.status)}</DaFact>
            <DaFact label="Opened">{fmtDate(c.opened_at)}</DaFact>
            {c.return_to_duty ? (
              <DaFact label="Return to duty">
                {`${c.return_to_duty.status.replace(/_/g, " ")} · follow-up tests ${c.return_to_duty.followups_done} of ${c.return_to_duty.followups_required}`}
              </DaFact>
            ) : null}
          </DaSection>
          {c.detail ? (
            <CaseDetail c={c} />
          ) : (
            <p className="text-[13px] text-dash-muted" data-testid="oh-wb-status-only">
              Only the wellbeing team and the person&apos;s clinician can see support details.
            </p>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}

function CaseDetail({ c }: { c: WbCase }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const providers = useQuery({ queryKey: ["oh-wb", "providers"], queryFn: fetchWbProviders });
  const [scope, setScope] = useState<"eap" | "sap" | "both">((c.consent?.scope as "eap" | "sap" | "both") || "eap");
  const [provider, setProvider] = useState(c.provider?.uuid ?? "");
  const [sessionAt, setSessionAt] = useState("");
  const [attendance, setAttendance] = useState("attended");
  const [sessionNote, setSessionNote] = useState("");
  const [plan, setPlan] = useState({
    treatment: c.plan?.treatment ?? "",
    goals: c.plan?.goals ?? "",
    relapse_prevention: c.plan?.relapse_prevention ?? "",
  });
  const [outcome, setOutcome] = useState(c.outcome || "ongoing");

  const save = useMutation({
    mutationFn: async (step: "consent" | "withdraw" | "refer" | "session" | "plan" | "outcome"): Promise<WbCase> => {
      if (step === "consent") return recordWbConsent(c.uuid, { scope });
      if (step === "withdraw") return recordWbConsent(c.uuid, { withdraw: true });
      if (step === "refer") return referWbCase(c.uuid, provider);
      if (step === "session") return recordWbSession(c.uuid, { session_at: new Date(sessionAt).toISOString(), attendance, note: sessionNote || undefined });
      if (step === "plan") return saveWbPlan(c.uuid, plan);
      return recordWbOutcome(c.uuid, outcome);
    },
    onSuccess: (next) => {
      client.setQueryData(["oh-wb", "case", c.uuid], next);
      void client.invalidateQueries({ queryKey: ["oh-wb", "cases"] });
      toast({ variant: "success", title: "Saved" });
      setSessionNote("");
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  return (
    <>
      <DaSection title="Background">
        <DaFact label="Why">{label(WB_ORIGIN_LABEL, c.origin)}</DaFact>
        {c.safe_harbour ? <DaFact label="Safe harbour">Yes, no disciplinary action for this disclosure</DaFact> : null}
        <DaFact label="Outcome">{label(WB_OUTCOME_LABEL, c.outcome ?? "")}</DaFact>
        {c.clinician_initials ? <DaFact label="Clinician">{c.clinician_initials}</DaFact> : null}
      </DaSection>

      <DaSection title="Consent and referral">
        <DaFact label="Consent">{c.consent?.given ? `Given (${c.consent.scope.toUpperCase()}) ${fmtDate(c.consent.at)}` : "Not given"}</DaFact>
        <div className="flex flex-wrap items-end gap-2 pt-2">
          <div className="w-48">
            <SelectField label="Consent covers" value={scope} onChange={(v) => setScope(v as "eap" | "sap" | "both")}>
              <option value="eap">Employee assistance</option>
              <option value="sap">Substance abuse professional</option>
              <option value="both">Both</option>
            </SelectField>
          </div>
          <SecondaryButton disabled={save.isPending} onClick={() => save.mutate("consent")}>
            Record consent
          </SecondaryButton>
          {c.consent?.given ? (
            <SecondaryButton disabled={save.isPending} onClick={() => save.mutate("withdraw")}>
              Consent withdrawn
            </SecondaryButton>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-2 pt-3">
          <div className="w-64">
            <SelectField label="Provider" value={provider} onChange={setProvider}>
              <option value="">Choose…</option>
              {(providers.data ?? []).filter((p) => p.active).map((p) => (
                <option key={p.uuid} value={p.uuid}>
                  {p.name}
                </option>
              ))}
            </SelectField>
          </div>
          <PageActionButton disabled={!provider || !c.consent?.given || save.isPending} onClick={() => save.mutate("refer")}>
            Refer
          </PageActionButton>
        </div>
        {c.provider ? <DaFact label="Referred to">{`${c.provider.name} · ${fmtDate(c.referred_at)}${c.provider.phone ? ` · ${c.provider.phone}` : ""}`}</DaFact> : null}
      </DaSection>

      <DaSection title={`Sessions (${c.attendance?.attended ?? 0} attended, ${c.attendance?.missed ?? 0} missed)`}>
        {(c.sessions ?? []).map((s) => (
          <DaFact key={s.uuid} label={fmtDateTime(s.session_at)}>
            {`${s.kind} · ${s.attendance}${s.note ? ` · ${s.note}` : ""}`}
          </DaFact>
        ))}
        <div className="grid gap-2 pt-2 sm:grid-cols-3">
          <Field label="When" type="datetime-local" value={sessionAt} onChange={setSessionAt} />
          <SelectField label="Attendance" value={attendance} onChange={setAttendance}>
            <option value="attended">Attended</option>
            <option value="missed">Missed</option>
            <option value="cancelled">Cancelled</option>
          </SelectField>
          <Field label="Note" value={sessionNote} onChange={setSessionNote} />
        </div>
        <div className="pt-2">
          <SecondaryButton disabled={!sessionAt || !c.referred_at || save.isPending} onClick={() => save.mutate("session")}>
            Add session
          </SecondaryButton>
        </div>
      </DaSection>

      <DaSection title="Plan">
        <div className="space-y-2 pt-1">
          <PlanBox label="Treatment" value={plan.treatment} onChange={(v) => setPlan((p) => ({ ...p, treatment: v }))} />
          <PlanBox label="Goals" value={plan.goals} onChange={(v) => setPlan((p) => ({ ...p, goals: v }))} />
          <PlanBox label="Relapse prevention" value={plan.relapse_prevention} onChange={(v) => setPlan((p) => ({ ...p, relapse_prevention: v }))} />
          <SecondaryButton disabled={save.isPending} onClick={() => save.mutate("plan")}>
            Save plan
          </SecondaryButton>
        </div>
      </DaSection>

      <DaSection title="Outcome">
        <div className="flex flex-wrap items-end gap-2 pt-1">
          <div className="w-56">
            <SelectField label="Outcome" value={outcome} onChange={(v) => setOutcome(v as typeof outcome)}>
              {Object.entries(WB_OUTCOME_LABEL)
                .filter(([k]) => k !== "")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </SelectField>
          </div>
          <PageActionButton disabled={save.isPending} onClick={() => save.mutate("outcome")}>
            Save outcome
          </PageActionButton>
        </div>
      </DaSection>
    </>
  );
}

function PlanBox({ label: text, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1 text-[13px]">
      <span className="text-dash-muted">{text}</span>
      <textarea
        aria-label={text}
        className="min-h-16 w-full rounded-md border border-dash-border px-3 py-2 text-[13px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
