"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import { useUpdateTheatreCaseDetails } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCase,
  TheatreCaseUrgency,
  TheatreNcepodCategory,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { NCEPOD_OPTIONS } from "@/features/clinical-theatre/utils/theatre-advanced-display";

const CLOSED = new Set(["discharged_ward", "discharged_home", "cancelled"]);

const URGENCY_OPTIONS: { value: TheatreCaseUrgency; label: string }[] = [
  { value: "elective", label: "Elective" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

type TheatreCaseDetailsFormProps = {
  theatreCase: TheatreCase;
  canEdit: boolean;
  onSaved?: () => void;
};

/** Procedure, urgency and notes of a case. */
export function TheatreCaseDetailsForm({
  theatreCase,
  canEdit,
  onSaved,
}: TheatreCaseDetailsFormProps) {
  const update = useUpdateTheatreCaseDetails();
  const [procedure, setProcedure] = useState(theatreCase.procedure_description);
  const [urgency, setUrgency] = useState<TheatreCaseUrgency>(theatreCase.urgency);
  const [notes, setNotes] = useState(theatreCase.notes);
  const [ncepod, setNcepod] = useState<TheatreNcepodCategory | "">(
    theatreCase.ncepod_category ?? "",
  );
  const editable = canEdit && !CLOSED.has(theatreCase.status);
  // Several procedures: the description is a summary built from the list.
  const procedureFromList = (theatreCase.procedures?.length ?? 0) > 1;
  const dirty =
    procedure.trim() !== theatreCase.procedure_description ||
    urgency !== theatreCase.urgency ||
    notes.trim() !== theatreCase.notes ||
    ncepod !== (theatreCase.ncepod_category ?? "");

  return (
    <form
      className="space-y-4"
      data-testid="theatre-case-details-form"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate(
          {
            uuid: theatreCase.uuid,
            payload: {
              ...(procedureFromList ? {} : { procedure_description: procedure.trim() }),
              urgency,
              notes: notes.trim(),
              ncepod_category: ncepod,
            },
          },
          { onSuccess: () => onSaved?.() },
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`procedure-${theatreCase.uuid}`}>Procedure</Label>
          <Input
            id={`procedure-${theatreCase.uuid}`}
            className="w-full"
            value={procedure}
            placeholder="e.g. Laparoscopic cholecystectomy"
            disabled={!editable || procedureFromList}
            title={procedureFromList ? "Edit the procedures list below" : undefined}
            onChange={(event) => setProcedure(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Urgency</Label>
          <Select
            disabled={!editable}
            value={urgency}
            onValueChange={(value) => setUrgency(value as TheatreCaseUrgency)}
          >
            <SelectTrigger aria-label="Urgency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`ncepod-${theatreCase.uuid}`}>NCEPOD category</Label>
          <select
            id={`ncepod-${theatreCase.uuid}`}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
            value={ncepod}
            disabled={!editable}
            onChange={(event) => setNcepod(event.target.value as TheatreNcepodCategory | "")}
          >
            <option value="">Not classified</option>
            {NCEPOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`notes-${theatreCase.uuid}`}>Notes</Label>
          <Textarea
            id={`notes-${theatreCase.uuid}`}
            className="w-full"
            value={notes}
            rows={4}
            disabled={!editable}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </div>
      {editable ? (
        <Button type="submit" size="sm" disabled={!dirty || update.isPending}>
          {update.isPending ? "Saving…" : "Save details"}
        </Button>
      ) : null}
      {update.error ? (
        <p className="text-sm text-red-600">
          {update.error instanceof Error ? update.error.message : "Could not save."}
        </p>
      ) : null}
    </form>
  );
}
