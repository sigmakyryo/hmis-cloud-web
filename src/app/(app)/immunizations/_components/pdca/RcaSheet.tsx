"use client";

import { useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerActions } from "../shared/Drawer";
import { Field, SelectField } from "../shared/Field";
import { ImmStatusBadge, humanize } from "../shared/ImmRecordTable";
import { addOhImmRcaAction, updateOhImmRca } from "@/features/occupational-health/services/immunisation.service";

type Row = Record<string, unknown>;

export const PDCA_STAGES = ["plan", "do", "check", "act"] as const;

function weekFromToday(): string {
  return new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
}

export function RcaSheet({
  rca,
  onClose,
  onSaved,
}: {
  rca: Row;
  onClose: () => void;
  onSaved: (message: string, keepOpen?: boolean) => void;
}) {
  const [stage, setStage] = useState(String(rca.pdca_stage ?? "plan"));
  const [summary, setSummary] = useState(String(rca.summary ?? ""));
  const [whys, setWhys] = useState(Array.isArray(rca.five_whys) ? rca.five_whys.join("\n") : "");
  const [effectiveness, setEffectiveness] = useState(String(rca.effectiveness_notes ?? ""));
  const [action, setAction] = useState({ title: "", owner: "", due_date: weekFromToday() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const actions = Array.isArray(rca.actions) ? (rca.actions as Row[]) : [];

  async function submit(work: () => Promise<unknown>, message: string, keepOpen = false) {
    setBusy(true);
    setError("");
    try {
      await work();
      onSaved(message, keepOpen);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the RCA.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const payload: Row = {
      pdca_stage: stage,
      summary,
      five_whys: whys
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    };
    if (effectiveness.trim() && effectiveness !== String(rca.effectiveness_notes ?? "")) {
      payload.effectiveness_notes = effectiveness;
    }
    void submit(() => updateOhImmRca(String(rca.uuid), payload), "RCA saved.");
  }

  return (
    <Drawer
      wide
      title="Root cause analysis"
      description="Exposure RCAs move from Plan to Act. Recording effectiveness moves the RCA to Check."
      onClose={onClose}
    >
      <div className="flex items-center gap-2 text-[13px] text-dash-muted">
        Status <ImmStatusBadge status={String(rca.status ?? "")} />
      </div>
      <SelectField label="Stage" required value={stage} onChange={setStage}>
        {PDCA_STAGES.map((value) => (
          <option key={value} value={value}>
            {humanize(value)}
          </option>
        ))}
      </SelectField>
      <div className="space-y-1.5">
        <Label>Summary</Label>
        <Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Five whys (one per line)</Label>
        <Textarea rows={5} value={whys} onChange={(e) => setWhys(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Effectiveness check</Label>
        <Textarea
          rows={2}
          placeholder="For example: no repeat incidents in 30 days"
          value={effectiveness}
          onChange={(e) => setEffectiveness(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>
          Close
        </SecondaryButton>
        <PrimaryButton type="button" disabled={busy} onClick={save}>
          Save RCA
        </PrimaryButton>
      </DrawerActions>

      <div className="space-y-3 border-t border-dash-border pt-4">
        <p className="text-[13px] font-medium text-brand-navy">Corrective actions</p>
        {actions.length === 0 ? (
          <p className="text-[13px] text-dash-muted">No corrective actions yet.</p>
        ) : (
          <dl className="divide-y divide-dash-border/70 border-y border-dash-border/70 text-[13px]">
            {actions.map((item) => (
              <div key={String(item.uuid)} className="flex items-center justify-between gap-3 py-2">
                <dt className="min-w-0">
                  <p className="truncate font-medium text-brand-navy">{String(item.title)}</p>
                  <p className="text-[12px] text-dash-muted">
                    {String(item.owner || "No owner")} · due {String(item.due_date ?? "—")}
                  </p>
                </dt>
                <dd>
                  <ImmStatusBadge status={String(item.status ?? "")} />
                </dd>
              </div>
            ))}
          </dl>
        )}
        <Field label="Action" required value={action.title} onChange={(value) => setAction((a) => ({ ...a, title: value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner" value={action.owner} onChange={(value) => setAction((a) => ({ ...a, owner: value }))} />
          <Field label="Due" type="date" value={action.due_date} onChange={(value) => setAction((a) => ({ ...a, due_date: value }))} />
        </div>
        <div className="flex justify-end">
          <SecondaryButton
            type="button"
            disabled={busy || !action.title.trim()}
            onClick={() =>
              void submit(
                () =>
                  addOhImmRcaAction(String(rca.uuid), { ...action, pdca_stage: "do" }).then(() =>
                    setAction({ title: "", owner: "", due_date: weekFromToday() }),
                  ),
                "Corrective action added.",
                true,
              )
            }
          >
            Add action
          </SecondaryButton>
        </div>
      </div>
    </Drawer>
  );
}
