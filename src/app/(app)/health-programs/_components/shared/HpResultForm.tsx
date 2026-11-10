"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { CheckField, Field, SelectField } from "@/app/(app)/immunizations/_components/shared/Field";
import { errorText, today } from "@/app/(app)/fitness/_components/shared/fit-format";
import {
  recordHpResult,
  type HpOutcome,
  type HpProgram,
} from "@/features/occupational-health/services/health-programs.service";
import { useToast } from "@/providers/toast-provider";
import { OUTCOME_LABEL, PROGRAM_LABEL, flagText, headline } from "./hp-format";

const FREQS = ["500", "1000", "2000", "3000", "4000", "6000", "8000"] as const;
type Values = Record<string, string>;

const toNum = (v: string | undefined) => (v === undefined || v.trim() === "" ? undefined : Number(v));

function buildData(program: HpProgram, v: Values, flags: { corrected: boolean }): Record<string, unknown> {
  switch (program) {
    case "hearing": {
      const ear = (side: "left" | "right") =>
        Object.fromEntries(FREQS.map((f) => [f, toNum(v[`${side}_${f}`])]).filter(([, n]) => n !== undefined));
      return { left: ear("left"), right: ear("right"), age: toNum(v.age) };
    }
    case "lung":
      return { fev1: toNum(v.fev1), fvc: toNum(v.fvc), height_cm: toNum(v.height_cm), age: toNum(v.age), sex: v.sex || "male" };
    case "vision":
      return {
        acuity_right: v.acuity_right || undefined,
        acuity_left: v.acuity_left || undefined,
        acuity_binocular: v.acuity_binocular || undefined,
        field_horizontal_deg: toNum(v.field),
        colour_plates_correct: toNum(v.colour),
        corrected: flags.corrected,
      };
    case "ergonomics":
      return {
        method: v.method || "rula",
        score: toNum(v.score),
        task: v.task ?? "",
        actions: (v.actions ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
      };
    case "fatigue":
      return {
        epworth: toNum(v.epworth),
        hours_last_7d: toNum(v.hours),
        longest_shift_h: toNum(v.shift),
        sleep_last_24h: toNum(v.sleep24),
        sleep_last_48h: toNum(v.sleep48),
      };
  }
}

function SmallNumber({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[12px] text-dash-muted">
      {label}
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-dash-border px-2 text-[13px] text-brand-navy"
      />
    </label>
  );
}

export function HpResultForm({
  program,
  customerUuid,
  workerLabel,
  visitUuid,
  policyUuid,
  onClose,
}: {
  program: HpProgram;
  customerUuid: string;
  workerLabel?: string;
  visitUuid?: string;
  policyUuid?: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [v, setV] = useState<Values>({ method: "rula", sex: "male" });
  const [date, setDate] = useState(today());
  const [baseline, setBaseline] = useState(false);
  const [corrected, setCorrected] = useState(false);
  const [outcome, setOutcome] = useState<"" | HpOutcome>("");
  const [notes, setNotes] = useState("");
  const set = (key: string) => (value: string) => setV((prev) => ({ ...prev, [key]: value }));

  const save = useMutation({
    mutationFn: () =>
      recordHpResult({
        program,
        customer_uuid: customerUuid,
        visit_uuid: visitUuid,
        policy_uuid: policyUuid,
        performed_at: date,
        is_baseline: baseline || undefined,
        data: buildData(program, v, { corrected }),
        outcome: outcome || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (result) => {
      toast({
        variant: "success",
        title: `${PROGRAM_LABEL[program]}: ${OUTCOME_LABEL[result.outcome] ?? result.outcome}`,
        description: [headline(result), flagText(result.computed?.flags)].filter(Boolean).join(" · "),
      });
      void client.invalidateQueries({ queryKey: ["oh-hp"] });
      void client.invalidateQueries({ queryKey: ["oh-fit"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  return (
    <Drawer title={`${PROGRAM_LABEL[program]} result`} description={workerLabel || undefined} onClose={onClose} wide>
      <div data-testid={`oh-hp-form-${program}`} className="space-y-3">
        <Field label="Test date" type="date" value={date} onChange={setDate} required />
        {program === "hearing" ? (
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-brand-navy">Hearing levels (dB HL)</p>
            {(["left", "right"] as const).map((side) => (
              <div key={side} className="grid grid-cols-8 items-end gap-1.5">
                <span className="pb-2 text-[12px] font-medium capitalize text-brand-navy">{side}</span>
                {FREQS.map((f) => (
                  <SmallNumber key={f} label={`${side === "left" ? "L" : "R"} ${Number(f) / 1000}k`} value={v[`${side}_${f}`] ?? ""} onChange={set(`${side}_${f}`)} />
                ))}
              </div>
            ))}
            <Field label="Age (only used if the policy turns on age correction)" type="number" value={v.age ?? ""} onChange={set("age")} />
          </div>
        ) : null}
        {program === "lung" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="FEV1 (litres)" type="number" value={v.fev1 ?? ""} onChange={set("fev1")} required />
            <Field label="FVC (litres)" type="number" value={v.fvc ?? ""} onChange={set("fvc")} required />
            <Field label="Height (cm)" type="number" value={v.height_cm ?? ""} onChange={set("height_cm")} required />
            <Field label="Age" type="number" value={v.age ?? ""} onChange={set("age")} required />
            <SelectField label="Sex for reference values" value={v.sex ?? "male"} onChange={set("sex")}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </SelectField>
          </div>
        ) : null}
        {program === "vision" ? (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Right eye" value={v.acuity_right ?? ""} onChange={set("acuity_right")} placeholder="6/6" />
            <Field label="Left eye" value={v.acuity_left ?? ""} onChange={set("acuity_left")} placeholder="6/9" />
            <Field label="Both eyes" value={v.acuity_binocular ?? ""} onChange={set("acuity_binocular")} placeholder="6/6" />
            <Field label="Field (degrees)" type="number" value={v.field ?? ""} onChange={set("field")} />
            <Field label="Colour plates correct" type="number" value={v.colour ?? ""} onChange={set("colour")} />
            <div className="pt-6">
              <CheckField label="With glasses or lenses" checked={corrected} onChange={setCorrected} />
            </div>
          </div>
        ) : null}
        {program === "ergonomics" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Method" value={v.method ?? "rula"} onChange={set("method")}>
                <option value="rula">RULA (1-7)</option>
                <option value="reba">REBA (1-15)</option>
              </SelectField>
              <Field label="Final score" type="number" value={v.score ?? ""} onChange={set("score")} required />
            </div>
            <Field label="Task" value={v.task ?? ""} onChange={set("task")} placeholder="e.g. Overhead bolting" />
            <label className="block space-y-1.5 text-[13px] text-brand-navy">
              Actions (one per line)
              <textarea
                aria-label="Actions"
                value={v.actions ?? ""}
                onChange={(e) => set("actions")(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-dash-border px-3 py-2 text-[13px]"
              />
            </label>
          </div>
        ) : null}
        {program === "fatigue" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Epworth score (0-24)" type="number" value={v.epworth ?? ""} onChange={set("epworth")} required />
            <Field label="Hours worked, last 7 days" type="number" value={v.hours ?? ""} onChange={set("hours")} />
            <Field label="Longest shift (hours)" type="number" value={v.shift ?? ""} onChange={set("shift")} />
            <Field label="Sleep, last 24 h" type="number" value={v.sleep24 ?? ""} onChange={set("sleep24")} />
            <Field label="Sleep, last 48 h" type="number" value={v.sleep48 ?? ""} onChange={set("sleep48")} />
          </div>
        ) : null}
        {program === "hearing" || program === "lung" ? (
          <CheckField label="Use as the new baseline" checked={baseline} onChange={setBaseline} />
        ) : null}
        <SelectField label="Outcome" value={outcome} onChange={(x) => setOutcome(x as "" | HpOutcome)}>
          <option value="">Use the suggested outcome</option>
          <option value="fit">Fit</option>
          <option value="restricted">Fit with restrictions</option>
          <option value="unfit">Not fit</option>
        </SelectField>
        <Field label={outcome ? "Note (needed when you change the outcome)" : "Note"} value={notes} onChange={setNotes} />
      </div>
      <DrawerActions>
        <SecondaryButton size="sm" onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PageActionButton disabled={save.isPending} onClick={() => save.mutate()}>
          Save result
        </PageActionButton>
      </DrawerActions>
    </Drawer>
  );
}
