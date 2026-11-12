"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAddTheatreBaby,
  useUpdateTheatreBaby,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreBaby,
  TheatreBabyDestination,
  TheatreBabyOutcome,
  TheatreBabySex,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { localInputToIso } from "@/features/clinical-theatre/utils/theatre-case-display";
import {
  BABY_DESTINATION_OPTIONS,
  BABY_OUTCOME_OPTIONS,
  BABY_SEX_OPTIONS,
  babyFormError,
  parseOptionalInt,
} from "@/features/clinical-theatre/utils/theatre-obstetric-display";
import {
  errorMessage,
  isoToLocalInput,
} from "@/features/clinical-theatre/utils/theatre-record-display";

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

type TheatreBabyFormProps = {
  caseUuid: string;
  baby?: TheatreBaby;
  onDone: () => void;
};

function numberText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/** Record (or correct) one baby: time of birth, sex, weight, Apgar, outcome. */
export function TheatreBabyForm({ caseUuid, baby, onDone }: TheatreBabyFormProps) {
  const registered = Boolean(baby?.newborn_uuid);
  const [timeOfBirth, setTimeOfBirth] = useState(
    isoToLocalInput(baby?.time_of_birth ?? new Date().toISOString()),
  );
  const [sex, setSex] = useState<TheatreBabySex | "">(baby?.sex ?? "");
  const [outcome, setOutcome] = useState<TheatreBabyOutcome>(baby?.outcome ?? "live_birth");
  const [weight, setWeight] = useState(numberText(baby?.birth_weight_g));
  const [apgar1, setApgar1] = useState(numberText(baby?.apgar_1));
  const [apgar5, setApgar5] = useState(numberText(baby?.apgar_5));
  const [apgar10, setApgar10] = useState(numberText(baby?.apgar_10));
  const [resuscitation, setResuscitation] = useState(baby?.resuscitation ?? false);
  const [resuscitationNotes, setResuscitationNotes] = useState(
    baby?.resuscitation_notes ?? "",
  );
  const [destination, setDestination] = useState<TheatreBabyDestination>(
    baby?.destination ?? "with_mother",
  );
  const [notes, setNotes] = useState(baby?.notes ?? "");
  const [touched, setTouched] = useState(false);
  const add = useAddTheatreBaby();
  const update = useUpdateTheatreBaby();
  const mutation = baby ? update : add;

  const numbers = {
    birth_weight_g: parseOptionalInt(weight),
    apgar_1: parseOptionalInt(apgar1),
    apgar_5: parseOptionalInt(apgar5),
    apgar_10: parseOptionalInt(apgar10),
  };
  const validation = !sex ? "Choose the baby's sex." : babyFormError(numbers);
  const idPrefix = baby ? `baby-${baby.uuid}` : `baby-new-${caseUuid}`;

  return (
    <form
      className="space-y-3 rounded-md border bg-muted/30 p-3"
      data-testid="theatre-baby-form"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (validation || !sex) return;
        const payload = {
          time_of_birth: localInputToIso(timeOfBirth),
          sex,
          outcome,
          ...numbers,
          resuscitation,
          resuscitation_notes: resuscitation ? resuscitationNotes.trim() : "",
          destination,
          notes: notes.trim(),
        };
        if (baby) {
          update.mutate(
            { caseUuid, babyUuid: baby.uuid, payload },
            { onSuccess: onDone },
          );
        } else {
          add.mutate({ caseUuid, payload }, { onSuccess: onDone });
        }
      }}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-time`}>Time of birth</Label>
          <Input
            id={`${idPrefix}-time`}
            type="datetime-local"
            value={timeOfBirth}
            onChange={(event) => setTimeOfBirth(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-sex`}>Sex</Label>
          <select
            id={`${idPrefix}-sex`}
            className={SELECT_CLASS}
            value={sex}
            disabled={registered}
            onChange={(event) => setSex(event.target.value as TheatreBabySex)}
          >
            <option value="">Choose</option>
            {BABY_SEX_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-outcome`}>Outcome</Label>
          <select
            id={`${idPrefix}-outcome`}
            className={SELECT_CLASS}
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as TheatreBabyOutcome)}
          >
            {BABY_OUTCOME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-weight`}>Birth weight (g)</Label>
          <Input
            id={`${idPrefix}-weight`}
            type="number"
            min={200}
            max={7000}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </div>
        {(
          [
            ["1", apgar1, setApgar1],
            ["5", apgar5, setApgar5],
            ["10", apgar10, setApgar10],
          ] as const
        ).map(([minute, value, setter]) => (
          <div key={minute} className="space-y-1">
            <Label htmlFor={`${idPrefix}-apgar-${minute}`}>Apgar {minute} min</Label>
            <Input
              id={`${idPrefix}-apgar-${minute}`}
              type="number"
              min={0}
              max={10}
              value={value}
              onChange={(event) => setter(event.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-destination`}>Baby goes to</Label>
          <select
            id={`${idPrefix}-destination`}
            className={SELECT_CLASS}
            value={destination}
            onChange={(event) =>
              setDestination(event.target.value as TheatreBabyDestination)
            }
          >
            {BABY_DESTINATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={resuscitation}
              onChange={(event) => setResuscitation(event.target.checked)}
            />
            Needed resuscitation
          </label>
          {resuscitation ? (
            <Input
              aria-label="Resuscitation details"
              placeholder="e.g. Bag-mask ventilation 2 min"
              value={resuscitationNotes}
              onChange={(event) => setResuscitationNotes(event.target.value)}
            />
          ) : null}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Input
          id={`${idPrefix}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      {touched && validation ? (
        <p className="text-xs text-red-600" role="alert">
          {validation}
        </p>
      ) : null}
      {mutation.error ? (
        <p className="text-xs text-red-600">
          {errorMessage(mutation.error, "Could not save the baby.")}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {baby ? "Save baby" : "Add baby"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
    </form>
  );
}
