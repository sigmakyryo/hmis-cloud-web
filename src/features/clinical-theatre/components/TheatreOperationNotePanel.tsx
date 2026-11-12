"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useSignTheatreOperationNote,
  useTheatreOperationNote,
  useUpdateTheatreOperationNote,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCase,
  UpdateTheatreOperationNotePayload,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  errorMessage,
  isOperationNoteEditable,
  parseOptionalNumber,
} from "@/features/clinical-theatre/utils/theatre-record-display";

type TextKey = Exclude<
  keyof UpdateTheatreOperationNotePayload,
  "surgeon" | "specimens_sent_to_lab" | "estimated_blood_loss_ml"
>;

const SHORT_FIELDS: { key: TextKey; label: string }[] = [
  { key: "procedure_performed", label: "Procedure performed" },
  { key: "assistants", label: "Assistants" },
  { key: "incision", label: "Incision" },
  { key: "drains", label: "Drains" },
];

const LONG_FIELDS: { key: TextKey; label: string }[] = [
  { key: "indication", label: "Indication" },
  { key: "findings", label: "Findings" },
  { key: "procedure_details", label: "Procedure details" },
  { key: "implants", label: "Implants" },
  { key: "specimens", label: "Specimens" },
  { key: "closure", label: "Closure" },
  { key: "complications", label: "Complications" },
  { key: "post_op_instructions", label: "Post-op instructions" },
];

/** Surgeon's operation note; signing locks it. */
export function TheatreOperationNotePanel({ theatreCase }: { theatreCase: TheatreCase }) {
  const { data: saved, isLoading } = useTheatreOperationNote(theatreCase.uuid);
  const update = useUpdateTheatreOperationNote();
  const sign = useSignTheatreOperationNote();
  const [draft, setDraft] = useState<UpdateTheatreOperationNotePayload>({});
  const editable = isOperationNoteEditable(theatreCase.status, saved?.signed_at);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading operation note…</p>;
  }

  const value = <K extends keyof UpdateTheatreOperationNotePayload>(key: K) =>
    (key in draft ? draft[key] : saved?.[key]) as UpdateTheatreOperationNotePayload[K];
  const set = <K extends keyof UpdateTheatreOperationNotePayload>(
    key: K,
    next: UpdateTheatreOperationNotePayload[K],
  ) => setDraft((current) => ({ ...current, [key]: next }));

  const save = () =>
    update.mutate(
      { caseUuid: theatreCase.uuid, payload: draft },
      { onSuccess: () => setDraft({}) },
    );
  const error = update.error ?? sign.error;

  return (
    <section className="space-y-4" data-testid="theatre-operation-note-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-brand-navy">Operation note</h3>
        <p className="text-xs text-muted-foreground">
          Surgeon: {saved?.surgeon_name || theatreCase.lead_surgeon_name || "—"}
          {saved?.signed_at
            ? ` · Signed ${new Date(saved.signed_at).toLocaleString()}${
                saved.signed_by_name ? ` by ${saved.signed_by_name}` : ""
              }`
            : ""}
        </p>
      </div>
      {!editable && !saved?.signed_at ? (
        <p className="text-xs text-muted-foreground">
          The operation note opens once the patient is in theatre.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {SHORT_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`theatre-note-${field.key}`}>{field.label}</Label>
            <Input
              id={`theatre-note-${field.key}`}
              disabled={!editable}
              value={(value(field.key) as string) ?? ""}
              onChange={(event) => set(field.key, event.target.value)}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label htmlFor="theatre-note-ebl">Estimated blood loss (mL)</Label>
          <Input
            id="theatre-note-ebl"
            type="number"
            min={0}
            disabled={!editable}
            value={value("estimated_blood_loss_ml") ?? ""}
            onChange={(event) =>
              set("estimated_blood_loss_ml", parseOptionalNumber(event.target.value))
            }
          />
        </div>
        <label className="flex items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            disabled={!editable}
            checked={Boolean(value("specimens_sent_to_lab"))}
            onChange={(event) => set("specimens_sent_to_lab", event.target.checked)}
          />
          Specimens sent to the lab
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {LONG_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`theatre-note-${field.key}`}>{field.label}</Label>
            <Textarea
              id={`theatre-note-${field.key}`}
              disabled={!editable}
              value={(value(field.key) as string) ?? ""}
              onChange={(event) => set(field.key, event.target.value)}
            />
          </div>
        ))}
      </div>
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={update.isPending || Object.keys(draft).length === 0}
            onClick={save}
          >
            Save operation note
          </Button>
          <Button
            variant="outline"
            disabled={sign.isPending || Object.keys(draft).length > 0 || !saved}
            onClick={() => sign.mutate(theatreCase.uuid)}
          >
            Sign and lock
          </Button>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not save.")}</p>
      ) : null}
    </section>
  );
}
