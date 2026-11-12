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
} from "@/features/clinical-theatre/types/clinical-theatre.types";

const CLOSED = new Set(["discharged_ward", "discharged_home", "cancelled"]);

const URGENCY_OPTIONS: { value: TheatreCaseUrgency; label: string }[] = [
  { value: "elective", label: "Elective" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

type TheatreCaseDetailsFormProps = {
  theatreCase: TheatreCase;
  canEdit: boolean;
};

/** Procedure, urgency and notes of a case. */
export function TheatreCaseDetailsForm({ theatreCase, canEdit }: TheatreCaseDetailsFormProps) {
  const update = useUpdateTheatreCaseDetails();
  const [procedure, setProcedure] = useState(theatreCase.procedure_description);
  const [urgency, setUrgency] = useState<TheatreCaseUrgency>(theatreCase.urgency);
  const [notes, setNotes] = useState(theatreCase.notes);
  const editable = canEdit && !CLOSED.has(theatreCase.status);
  const dirty =
    procedure.trim() !== theatreCase.procedure_description ||
    urgency !== theatreCase.urgency ||
    notes.trim() !== theatreCase.notes;

  return (
    <form
      className="space-y-3"
      data-testid="theatre-case-details-form"
      onSubmit={(event) => {
        event.preventDefault();
        update.mutate({
          uuid: theatreCase.uuid,
          payload: {
            procedure_description: procedure.trim(),
            urgency,
            notes: notes.trim(),
          },
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor={`procedure-${theatreCase.uuid}`}>Procedure</Label>
          <Input
            id={`procedure-${theatreCase.uuid}`}
            value={procedure}
            placeholder="e.g. Laparoscopic cholecystectomy"
            disabled={!editable}
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
            <SelectTrigger aria-label="Urgency">
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
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`notes-${theatreCase.uuid}`}>Notes</Label>
        <Textarea
          id={`notes-${theatreCase.uuid}`}
          value={notes}
          rows={2}
          disabled={!editable}
          onChange={(event) => setNotes(event.target.value)}
        />
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
