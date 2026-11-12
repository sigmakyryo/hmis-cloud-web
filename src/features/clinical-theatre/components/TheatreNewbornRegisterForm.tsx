"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IpdBedSelect } from "@/features/clinical-ipd/components/IpdBedSelect";
import { IpdWardSelect } from "@/features/clinical-ipd/components/IpdWardSelect";
import type { IpdBed, IpdWard } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { useRegisterTheatreNewborn } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreBaby,
  TheatreCase,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import { canAdmitBaby } from "@/features/clinical-theatre/utils/theatre-obstetric-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

type TheatreNewbornRegisterFormProps = {
  theatreCase: TheatreCase;
  baby: TheatreBaby;
  onDone: () => void;
};

/**
 * Create the newborn's own patient record (linked to the mother) and,
 * optionally, admit the baby to a ward bed.
 */
export function TheatreNewbornRegisterForm({
  theatreCase,
  baby,
  onDone,
}: TheatreNewbornRegisterFormProps) {
  const alreadyRegistered = Boolean(baby.newborn_uuid);
  const surname = theatreCase.customer_name.trim().split(/\s+/).slice(-1)[0] ?? "";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState(surname);
  const [admit, setAdmit] = useState(alreadyRegistered);
  const [ward, setWard] = useState<IpdWard | null>(null);
  const [bed, setBed] = useState<IpdBed | null>(null);
  const [touched, setTouched] = useState(false);
  const mutation = useRegisterTheatreNewborn();
  const admittable = canAdmitBaby(baby);
  const validation = admit && !bed ? "Choose a bed to admit the baby." : null;

  return (
    <form
      className="space-y-3 rounded-lg bg-muted/40 p-3"
      data-testid="theatre-newborn-register-form"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (validation) return;
        mutation.mutate(
          {
            caseUuid: theatreCase.uuid,
            babyUuid: baby.uuid,
            payload: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              bed: admit && bed ? bed.uuid : null,
            },
          },
          { onSuccess: onDone },
        );
      }}
    >
      {alreadyRegistered ? (
        <p className="text-xs text-muted-foreground">
          {baby.newborn_name} is registered. Choose a bed to admit the baby.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Creates the baby&apos;s own patient record, linked to the mother as parent and
            guardian. Date of birth is taken from the time of birth.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`newborn-first-${baby.uuid}`}>First name</Label>
              <Input
                id={`newborn-first-${baby.uuid}`}
                placeholder="Baby"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`newborn-last-${baby.uuid}`}>Surname</Label>
              <Input
                id={`newborn-last-${baby.uuid}`}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
          </div>
        </>
      )}
      {admittable && !alreadyRegistered ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={admit}
            onChange={(event) => setAdmit(event.target.checked)}
          />
          Admit the baby to a ward bed (e.g. neonatal unit)
        </label>
      ) : null}
      {admit && admittable ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <IpdWardSelect
            clinicUuid={theatreCase.clinic_uuid}
            value={ward}
            onChange={(next) => {
              setWard(next);
              setBed(null);
            }}
          />
          <IpdBedSelect wardUuid={ward?.uuid} value={bed} onChange={setBed} availableOnly />
        </div>
      ) : null}
      {touched && validation ? (
        <p className="text-xs text-red-600" role="alert">
          {validation}
        </p>
      ) : null}
      {mutation.error ? (
        <p className="text-xs text-red-600">
          {errorMessage(mutation.error, "Could not register the baby.")}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {alreadyRegistered ? "Admit baby" : "Register newborn"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
    </form>
  );
}
