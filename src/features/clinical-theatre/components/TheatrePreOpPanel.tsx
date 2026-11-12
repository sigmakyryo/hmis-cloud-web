"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DateTimeLocalInput } from "@/components/ui/datetime-local-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useTheatrePreOp,
  useUpdateTheatrePreOp,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCase,
  TheatreCaseStatus,
  TheatrePreOp,
  UpdateTheatrePreOpPayload,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { localInputToIso } from "@/features/clinical-theatre/utils/theatre-case-display";

const EDITABLE: ReadonlySet<TheatreCaseStatus> = new Set([
  "booked",
  "waiting",
  "pre_op",
  "postponed",
]);

const ASA_GRADES = ["1", "2", "3", "4", "5", "6"] as const;
const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

const ANAESTHESIA_PLANS: { value: string; label: string }[] = [
  { value: "general", label: "General" },
  { value: "spinal", label: "Spinal" },
  { value: "regional", label: "Regional block" },
  { value: "local", label: "Local" },
  { value: "sedation", label: "Sedation" },
];

const FLAGS: { key: keyof TheatrePreOp & keyof UpdateTheatrePreOpPayload; label: string }[] = [
  { key: "consent_signed", label: "Consent signed" },
  { key: "site_marked", label: "Site marked" },
  { key: "allergies_reviewed", label: "Allergies reviewed" },
  { key: "blood_available", label: "Blood available" },
  { key: "asa_emergency", label: "Emergency (ASA E)" },
];

function isoToLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Anaesthetic / readiness assessment that gates entry to theatre. */
export function TheatrePreOpPanel({ theatreCase }: { theatreCase: TheatreCase }) {
  const { data: saved, isLoading } = useTheatrePreOp(theatreCase.uuid);
  const update = useUpdateTheatrePreOp();
  const [draft, setDraft] = useState<UpdateTheatrePreOpPayload>({});
  const editable = EDITABLE.has(theatreCase.status);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading pre-op…</p>;
  }

  const value = <K extends keyof UpdateTheatrePreOpPayload>(key: K) =>
    (key in draft ? draft[key] : saved?.[key]) as UpdateTheatrePreOpPayload[K];
  const set = <K extends keyof UpdateTheatrePreOpPayload>(
    key: K,
    next: UpdateTheatrePreOpPayload[K],
  ) => setDraft((current) => ({ ...current, [key]: next }));

  const save = () =>
    update.mutate(
      { caseUuid: theatreCase.uuid, payload: draft },
      { onSuccess: () => setDraft({}) },
    );

  return (
    <section className="space-y-4" data-testid="theatre-pre-op-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-brand-navy">Pre-op assessment</h3>
        {saved?.assessed_at ? (
          <p className="text-xs text-muted-foreground">
            Last updated {new Date(saved.assessed_at).toLocaleString()}
            {saved.assessed_by_name ? ` by ${saved.assessed_by_name}` : ""}
          </p>
        ) : null}
      </div>
      {theatreCase.urgency !== "emergency" ? (
        <p className="text-xs text-muted-foreground">
          An ASA grade and signed consent are required before the patient goes
          into theatre.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>ASA grade</Label>
          <Select
            disabled={!editable}
            value={(value("asa_grade") as string) || undefined}
            onValueChange={(next) => set("asa_grade", next as TheatrePreOp["asa_grade"])}
          >
            <SelectTrigger aria-label="ASA grade">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASA_GRADES.map((grade, index) => (
                <SelectItem key={grade} value={grade}>
                  ASA {ROMAN[index]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Anaesthesia plan</Label>
          <Select
            disabled={!editable}
            value={(value("anaesthesia_plan") as string) || undefined}
            onValueChange={(next) =>
              set("anaesthesia_plan", next as TheatrePreOp["anaesthesia_plan"])
            }
          >
            <SelectTrigger aria-label="Anaesthesia plan">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ANAESTHESIA_PLANS.map((plan) => (
                <SelectItem key={plan.value} value={plan.value}>
                  {plan.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theatre-pre-op-weight">Weight (kg)</Label>
          <Input
            id="theatre-pre-op-weight"
            type="number"
            min={0}
            step="0.1"
            disabled={!editable}
            value={value("weight_kg") ?? ""}
            onChange={(event) => set("weight_kg", event.target.value || null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theatre-pre-op-fasting">Nil by mouth since</Label>
          <DateTimeLocalInput
            id="theatre-pre-op-fasting"
            disabled={!editable}
            value={isoToLocalInput(value("fasting_since"))}
            onChange={(event) =>
              set("fasting_since", localInputToIso(event.target.value))
            }
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        {FLAGS.map((flag) => (
          <label key={flag.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={!editable}
              checked={Boolean(value(flag.key))}
              onChange={(event) => set(flag.key, event.target.checked)}
            />
            {flag.label}
          </label>
        ))}
      </div>
      {saved?.consent_signed_at ? (
        <p className="text-xs text-muted-foreground">
          Consent recorded {new Date(saved.consent_signed_at).toLocaleString()}
        </p>
      ) : null}
      <Textarea
        aria-label="Pre-op notes"
        placeholder="Notes"
        disabled={!editable}
        value={(value("notes") as string) ?? ""}
        onChange={(event) => set("notes", event.target.value)}
      />
      {editable ? (
        <Button
          disabled={update.isPending || Object.keys(draft).length === 0}
          onClick={save}
        >
          Save pre-op
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          The pre-op assessment is locked once the patient is in theatre.
        </p>
      )}
      {update.error ? (
        <p className="text-sm text-red-600">
          {update.error instanceof Error ? update.error.message : "Could not save."}
        </p>
      ) : null}
    </section>
  );
}
