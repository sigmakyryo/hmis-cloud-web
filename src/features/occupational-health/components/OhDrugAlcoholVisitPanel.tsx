"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { downloadBlob } from "@/app/(app)/immunizations/_components/shared/download-blob";
import { CheckField, Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import {
  FITNESS_LABEL,
  REASON_LABEL,
  REFUSAL_LABEL,
  SPECIMEN_LABEL,
  TEST_STATUS_LABEL,
  countdown,
  errorText,
  fmtDateTime,
  label,
} from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import {
  cancelDaTest,
  downloadDaCcf,
  fetchDaVisitPanel,
  recordDaAlcohol,
  recordDaConsent,
  recordDaCustody,
  recordDaRefusal,
  recordDaScreen,
  recordDaShy,
  startDaTest,
  type DaReason,
  type DaScreenResult,
  type DaTest,
  type DaVisitPanel,
} from "@/features/occupational-health/services/drug-alcohol.service";
import { useToast } from "@/providers/toast-provider";

const ACTIVE = ["scheduled", "in_collection", "awaiting_alcohol_confirm"];

export const daVisitPanelKey = (visitId: string, customerUuid: string | null) =>
  ["oh-da", "visit-panel", visitId, customerUuid ?? ""] as const;

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function Step({ title, done, children }: { title: string; done?: boolean; children: ReactNode }) {
  return (
    <section className="space-y-2 border-b border-dash-border/70 py-3 last:border-b-0">
      <h4 className="flex items-center gap-2 text-[13px] font-semibold text-brand-navy">
        {title}
        {done ? <ImmStatusBadge status="done" label="Done" /> : null}
      </h4>
      {children}
    </section>
  );
}

/** In-visit drug & alcohol collection: consent, custody, shy timers, breath alcohol, rapid screen, refusal. */
export function OhDrugAlcoholVisitPanel({
  customerUuid,
  encounterUuid,
}: {
  customerUuid: string;
  encounterUuid: string;
}) {
  const query = useQuery({
    queryKey: daVisitPanelKey(encounterUuid, customerUuid),
    queryFn: () => fetchDaVisitPanel(encounterUuid, customerUuid),
  });
  const panel = query.data;
  const active = panel?.tests.find((t) => ACTIVE.includes(t.status)) ?? null;
  const past = panel?.tests.filter((t) => t !== active) ?? [];

  if (query.isLoading) return <QuietLoading />;
  if (query.isError || !panel) return <LoadError>{errorText(query.error, "Could not load drug & alcohol testing.")}</LoadError>;

  return (
    <div className="space-y-1 text-[13px]" data-testid="oh-da-visit-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dash-border/70 pb-2">
        <div>
          <p className="font-semibold text-brand-navy">Drug & alcohol testing</p>
          <p className="text-[12px] text-dash-muted">
            {panel.policy
              ? `${panel.policy.name} v${panel.policy.version}${panel.policy.is_example ? " (example policy)" : ""}`
              : "No policy set up yet - load one under Drug & Alcohol > Policies."}
          </p>
        </div>
        {panel.status ? (
          <ImmStatusBadge
            status={panel.status.fit_for_safety_critical ? "cleared" : "not_cleared"}
            label={panel.status.fit_for_safety_critical ? "Fit for duty" : label(FITNESS_LABEL, panel.status.status)}
          />
        ) : null}
      </div>
      {active ? (
        <ActiveTest panel={panel} test={active} queryKey={daVisitPanelKey(encounterUuid, customerUuid)} />
      ) : panel.policy ? (
        <StartTest panel={panel} encounterUuid={encounterUuid} queryKey={daVisitPanelKey(encounterUuid, customerUuid)} />
      ) : null}
      {past.length > 0 ? (
        <Step title="Earlier tests">
          <ul className="space-y-1">
            {past.slice(0, 8).map((t) => (
              <li key={t.uuid} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {t.reference} · {label(REASON_LABEL, t.reason)} · {fmtDateTime(t.created_at)}
                </span>
                <span className="flex items-center gap-2">
                  <ImmStatusBadge status={t.status} label={label(TEST_STATUS_LABEL, t.status)} />
                  <span className="text-dash-muted">{label(FITNESS_LABEL, t.fitness_outcome)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Step>
      ) : null}
    </div>
  );
}

function StartTest({
  panel,
  encounterUuid,
  queryKey,
}: {
  panel: DaVisitPanel;
  encounterUuid: string;
  queryKey: readonly unknown[];
}) {
  const { toast } = useToast();
  const client = useQueryClient();
  const policy = panel.policy!;
  const [reason, setReason] = useState<DaReason>(policy.reasons.includes("pre_employment") ? "pre_employment" : policy.reasons[0]);
  const [specimens, setSpecimens] = useState<string[]>(policy.specimen_types.filter((s) => s === "urine" || s === "breath"));
  const start = useMutation({
    mutationFn: (body: Parameters<typeof startDaTest>[0]) =>
      startDaTest({ visit_uuid: panel.visit_uuid ?? encounterUuid, customer_uuid: panel.customer_uuid, ...body }),
    onSuccess: () => {
      toast({ variant: "success", title: "Test started" });
      void client.invalidateQueries({ queryKey });
      void client.invalidateQueries({ queryKey: ["oh-da", "due"] });
    },
    onError: (error) => toast({ variant: "error", title: "Could not start", description: errorText(error) }),
  });

  const toggle = (code: string) =>
    setSpecimens((prev) => (prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]));

  return (
    <>
      {panel.open.random_selections.length + panel.open.followups.length + panel.open.rtd_cases.length > 0 ? (
        <Step title="Waiting for this worker">
          <div className="flex flex-wrap gap-2">
            {panel.open.random_selections.map((s) => (
              <PageActionButton key={s.uuid} disabled={start.isPending} onClick={() => start.mutate({ random_selection_uuid: s.uuid })}>
                Start random test
              </PageActionButton>
            ))}
            {panel.open.followups.map((f) => (
              <PageActionButton key={f.uuid} disabled={start.isPending} onClick={() => start.mutate({ followup_uuid: f.uuid })}>
                Start follow-up test {f.sequence}
              </PageActionButton>
            ))}
            {panel.open.rtd_cases.map((c) => (
              <PageActionButton key={c.uuid} disabled={start.isPending} onClick={() => start.mutate({ rtd_case_uuid: c.uuid })}>
                Start return-to-duty test
              </PageActionButton>
            ))}
          </div>
        </Step>
      ) : null}
      <Step title="Start a test">
        <SelectField label="Why" value={reason} onChange={(v) => setReason(v as DaReason)} required>
          {policy.reasons.map((r) => (
            <option key={r} value={r}>
              {label(REASON_LABEL, r)}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-wrap gap-4">
          {policy.specimen_types.map((s) => (
            <CheckField key={s} label={label(SPECIMEN_LABEL, s)} checked={specimens.includes(s)} onChange={() => toggle(s)} />
          ))}
        </div>
        <PageActionButton
          disabled={start.isPending || specimens.length === 0}
          onClick={() => start.mutate({ reason, specimen_types: specimens })}
        >
          Start test
        </PageActionButton>
      </Step>
    </>
  );
}

function ActiveTest({ panel, test, queryKey }: { panel: DaVisitPanel; test: DaTest; queryKey: readonly unknown[] }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const hasDrugs = test.specimen_types.some((s) => s !== "breath");
  const hasBreath = test.specimen_types.includes("breath");
  const timing = Boolean(test.shy.started_at && !test.shy.ended_at) || test.alcohol.outcome === "pending_confirm";
  const now = useNow(timing);

  const [consent, setConsent] = useState(test.consent_given);
  const [idOk, setIdOk] = useState(test.id_verified);
  const [idMethod, setIdMethod] = useState(test.id_method || "photo_id");
  const [ccf, setCcf] = useState(test.custody.ccf_number ?? "");
  const [specimenId, setSpecimenId] = useState(test.custody.specimen_id ?? "");
  const [seal, setSeal] = useState(test.custody.seal_number ?? "");
  const [sealIntact, setSealIntact] = useState(test.custody.seal_intact ?? true);
  const [split, setSplit] = useState(test.custody.split_specimen);
  const [observed, setObserved] = useState(test.custody.observed);
  const [observedReason, setObservedReason] = useState(test.custody.observed_reason ?? "");
  const [temp, setTemp] = useState(test.custody.temperature_c != null ? String(test.custody.temperature_c) : "");
  const [readMinutes, setReadMinutes] = useState(
    test.custody.temperature_read_minutes != null ? String(test.custody.temperature_read_minutes) : "2",
  );
  const [shyType, setShyType] = useState<"bladder" | "lung">(hasDrugs ? "bladder" : "lung");
  const [shyOutcome, setShyOutcome] = useState("provided");
  const [fluid, setFluid] = useState("");
  const [breath, setBreath] = useState("");
  const [screen, setScreen] = useState<Record<string, DaScreenResult>>(
    Object.fromEntries((test.poct_results ?? []).map((r) => [r.code, r.result])),
  );
  const [refusal, setRefusal] = useState("");
  const [refusalNotes, setRefusalNotes] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const panelCodes = useMemo(() => panel.policy?.panel ?? [], [panel.policy]);

  const run = useMutation({
    mutationFn: async (step: string): Promise<{ warnings?: string[] }> => {
      switch (step) {
        case "consent":
          await recordDaConsent(test.uuid, { consent_given: consent, id_verified: idOk, id_method: idMethod });
          return {};
        case "custody": {
          const out = await recordDaCustody(test.uuid, {
            ccf_number: ccf || null,
            specimen_id: specimenId || null,
            seal_number: seal || null,
            seal_intact: sealIntact,
            split_specimen: split,
            observed,
            observed_reason: observed ? observedReason || null : null,
            temperature_c: temp ? Number(temp) : null,
            temperature_read_minutes: readMinutes ? Number(readMinutes) : null,
            collected: true,
          });
          return { warnings: out.requires_observed_recollection ? [...out.warnings, "Collect again under direct observation."] : out.warnings };
        }
        case "shy_start":
          await recordDaShy(test.uuid, { action: "start", type: shyType });
          return {};
        case "shy_end":
          await recordDaShy(test.uuid, { action: "end", outcome: shyOutcome, fluid_oz: fluid ? Number(fluid) : undefined });
          return {};
        case "breath_screen":
        case "breath_confirm": {
          const out = await recordDaAlcohol(test.uuid, {
            stage: step === "breath_screen" ? "screen" : "confirm",
            value: Number(breath),
          });
          setBreath("");
          return { warnings: out.warnings };
        }
        case "screen":
          await recordDaScreen(test.uuid, {
            results: panelCodes.filter((p) => screen[p.code]).map((p) => ({ code: p.code, result: screen[p.code] })),
          });
          return {};
        case "lab":
          await recordDaScreen(test.uuid, { results: [], send_to_lab: true });
          return {};
        case "refusal":
          await recordDaRefusal(test.uuid, { reason: refusal, notes: refusalNotes || undefined });
          return {};
        case "cancel": {
          const why = window.prompt("Why is this test being cancelled? (for example: collection error)") ?? "";
          if (!why.trim()) throw new Error("No reason given, nothing changed.");
          await cancelDaTest(test.uuid, why.trim());
          return {};
        }
        default:
          return {};
      }
    },
    onSuccess: (out) => {
      setWarnings(out.warnings ?? []);
      toast({ variant: "success", title: "Saved" });
      void client.invalidateQueries({ queryKey });
      void client.invalidateQueries({ queryKey: ["oh-da", "due"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  async function ccfPdf() {
    try {
      const file = await downloadDaCcf(test.uuid);
      downloadBlob(file.blob, file.filename);
    } catch (error) {
      toast({ variant: "error", title: "Could not download", description: errorText(error) });
    }
  }

  const limits = test.custody.limits;
  const tempNum = temp ? Number(temp) : null;
  const tempOut = tempNum != null && (tempNum < limits.temp_min_c || tempNum > limits.temp_max_c);
  const shyRunning = Boolean(test.shy.started_at && !test.shy.ended_at);
  const waitLeft = countdown(test.alcohol.confirm_earliest_at, now);
  const windowLeft = countdown(test.alcohol.confirm_latest_at, now);
  const shyLeft = countdown(test.shy.deadline_at, now);
  const busy = run.isPending;

  return (
    <div data-testid="oh-da-active-test">
      <div className="flex flex-wrap items-center justify-between gap-2 py-2">
        <span>
          <span className="font-medium text-brand-navy">{test.reference}</span> · {label(REASON_LABEL, test.reason)} ·{" "}
          {test.specimen_types.map((s) => label(SPECIMEN_LABEL, s)).join(", ")}
          {test.custody.observed ? " · observed" : ""}
        </span>
        <ImmStatusBadge status={test.status} label={label(TEST_STATUS_LABEL, test.status)} />
      </div>
      {warnings.length > 0 ? (
        <ul role="alert" className="mb-2 space-y-0.5 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-amber-900">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      <Step title="1. Consent and ID" done={test.consent_given}>
        <CheckField label="Worker agrees to the test" checked={consent} onChange={setConsent} />
        <CheckField label="Identity checked" checked={idOk} onChange={setIdOk} />
        <SelectField label="How was ID checked" value={idMethod} onChange={setIdMethod}>
          <option value="photo_id">Photo ID</option>
          <option value="employer_id">Employer ID card</option>
          <option value="known_to_collector">Known to the collector</option>
        </SelectField>
        <SecondaryButton size="sm" disabled={busy} onClick={() => run.mutate("consent")}>
          Save consent
        </SecondaryButton>
      </Step>

      {hasDrugs ? (
        <Step title="2. Specimen and chain of custody" done={Boolean(test.custody.collected_at)}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Custody form number" value={ccf} onChange={setCcf} />
            <Field label="Specimen ID" value={specimenId} onChange={setSpecimenId} />
            <Field label="Seal number" value={seal} onChange={setSeal} />
            <Field
              label={`Temperature °C (${limits.temp_min_c}-${limits.temp_max_c})`}
              type="number"
              value={temp}
              onChange={setTemp}
            />
            <Field
              label={`Minutes until read (within ${limits.temp_read_within_minutes})`}
              type="number"
              value={readMinutes}
              onChange={setReadMinutes}
            />
          </div>
          {tempOut ? (
            <p className="text-amber-800">Temperature out of range - a second collection under observation is needed.</p>
          ) : null}
          <div className="flex flex-wrap gap-4">
            <CheckField label="Seal intact" checked={sealIntact} onChange={setSealIntact} />
            <CheckField label="Split specimen" checked={split} onChange={setSplit} />
            <CheckField label="Observed collection" checked={observed} onChange={setObserved} />
          </div>
          {observed ? <Field label="Why observed" value={observedReason} onChange={setObservedReason} /> : null}
          <div className="flex flex-wrap gap-2">
            <SecondaryButton size="sm" disabled={busy || !test.consent_given} onClick={() => run.mutate("custody")}>
              Save collection
            </SecondaryButton>
            <SecondaryButton size="sm" onClick={ccfPdf}>
              Custody form PDF
            </SecondaryButton>
          </div>
        </Step>
      ) : null}

      <Step title="Shy bladder / shy lung" done={Boolean(test.shy.ended_at)}>
        {shyRunning ? (
          <>
            <p>
              {test.shy.type === "lung" ? "Shy lung" : "Shy bladder"} started {fmtDateTime(test.shy.started_at)}
              {test.shy.type === "bladder" ? (
                <>
                  {" "}
                  · time left <span className="font-mono tabular-nums">{shyLeft ?? "0:00"}</span> · up to{" "}
                  {test.shy.max_fluid_oz} oz fluid
                </>
              ) : (
                <> · up to {test.shy.lung_attempts} attempts</>
              )}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <SelectField label="What happened" value={shyOutcome} onChange={setShyOutcome}>
                <option value="provided">Enough specimen provided</option>
                <option value="insufficient">Still not enough - refer to a doctor</option>
                <option value="medical_referral">Referred for medical check</option>
                <option value="refused">Refused to keep trying</option>
              </SelectField>
              {test.shy.type === "bladder" ? <Field label="Fluid drunk (oz)" type="number" value={fluid} onChange={setFluid} /> : null}
            </div>
            <SecondaryButton size="sm" disabled={busy} onClick={() => run.mutate("shy_end")}>
              Stop timer
            </SecondaryButton>
          </>
        ) : test.shy.ended_at ? (
          <p>Finished: {test.shy.outcome.replace(/_/g, " ")}</p>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <SelectField label="Type" value={shyType} onChange={(v) => setShyType(v as "bladder" | "lung")}>
              {hasDrugs ? <option value="bladder">Shy bladder (not enough urine)</option> : null}
              {hasBreath ? <option value="lung">Shy lung (not enough breath)</option> : null}
            </SelectField>
            <SecondaryButton size="sm" disabled={busy} onClick={() => run.mutate("shy_start")}>
              Start timer
            </SecondaryButton>
          </div>
        )}
      </Step>

      {hasBreath ? (
        <Step title="3. Breath alcohol" done={["negative", "positive", "restricted", "reported"].includes(test.alcohol.outcome)}>
          {test.alcohol.outcome === "pending_confirm" ? (
            <>
              <p>
                Screen was at or above the limit. Wait 15 minutes (no eating, drinking or smoking), then confirm within 30
                minutes.
              </p>
              <p className="font-medium">
                {waitLeft ? (
                  <>
                    Confirm in <span className="font-mono tabular-nums">{waitLeft}</span>
                  </>
                ) : windowLeft ? (
                  <>
                    Confirm now - <span className="font-mono tabular-nums">{windowLeft}</span> left
                  </>
                ) : (
                  "Confirmation window has passed - cancel and restart."
                )}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <Field label={`Confirmation reading (${test.alcohol.unit})`} type="number" value={breath} onChange={setBreath} />
                <PageActionButton disabled={busy || !breath || Boolean(waitLeft) || !windowLeft} onClick={() => run.mutate("breath_confirm")}>
                  Save confirmation
                </PageActionButton>
              </div>
            </>
          ) : test.alcohol.outcome ? (
            <p>
              Result: {test.alcohol.outcome.replace(/_/g, " ")}
              {test.alcohol.screen_value != null ? ` (screen ${test.alcohol.screen_value} ${test.alcohol.unit})` : ""}
              {test.alcohol.confirm_value != null ? `, confirmed ${test.alcohol.confirm_value}` : ""}
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <Field label={`Screening reading (${test.alcohol.unit})`} type="number" value={breath} onChange={setBreath} />
              <PageActionButton disabled={busy || !breath || !test.consent_given} onClick={() => run.mutate("breath_screen")}>
                Save screen
              </PageActionButton>
            </div>
          )}
        </Step>
      ) : null}

      {hasDrugs ? (
        <Step title="4. Rapid drug screen" done={Boolean(test.screen_outcome)}>
          {test.screen_outcome ? (
            <p>
              {test.screen_outcome === "negative"
                ? "All negative."
                : test.screen_outcome === "sent_to_lab" || test.screen_outcome === "sent_for_confirmation"
                  ? "Sent to the lab for confirmation."
                  : `Rapid screen: ${test.screen_outcome.replace(/_/g, " ")} - sent to the lab for confirmation.`}
            </p>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {panelCodes.map((p) => (
                  <SelectField
                    key={p.code}
                    label={p.name}
                    value={screen[p.code] ?? ""}
                    onChange={(v) => setScreen((prev) => ({ ...prev, [p.code]: v as DaScreenResult }))}
                  >
                    <option value="">Choose…</option>
                    <option value="negative">Negative</option>
                    <option value="non_negative">Non-negative</option>
                    <option value="invalid">Invalid</option>
                  </SelectField>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <PageActionButton
                  disabled={busy || panelCodes.some((p) => !screen[p.code])}
                  onClick={() => run.mutate("screen")}
                >
                  Save rapid screen
                </PageActionButton>
                <SecondaryButton size="sm" disabled={busy} onClick={() => run.mutate("lab")}>
                  Send to lab instead
                </SecondaryButton>
              </div>
              <p className="text-[12px] text-dash-muted">
                A non-negative or invalid screen goes to the lab automatically. Nobody is told a result until it is confirmed.
              </p>
            </>
          )}
        </Step>
      ) : null}

      <Step title="Refusal or cancel">
        <div className="grid gap-2 sm:grid-cols-2">
          <SelectField label="Refusal reason" value={refusal} onChange={setRefusal}>
            <option value="">Choose…</option>
            {panel.refusal_reasons.map((r) => (
              <option key={r} value={r}>
                {label(REFUSAL_LABEL, r)}
              </option>
            ))}
          </SelectField>
          <Field label="Notes" value={refusalNotes} onChange={setRefusalNotes} />
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton
            size="sm"
            disabled={busy || !refusal}
            onClick={() => {
              if (window.confirm("Record a refusal? This counts the same as a positive result.")) run.mutate("refusal");
            }}
          >
            Record refusal
          </SecondaryButton>
          <SecondaryButton size="sm" disabled={busy} onClick={() => run.mutate("cancel")}>
            Cancel test
          </SecondaryButton>
        </div>
      </Step>
    </div>
  );
}
