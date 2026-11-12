"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IpdBedSelect } from "@/features/clinical-ipd/components/IpdBedSelect";
import { IpdWardSelect } from "@/features/clinical-ipd/components/IpdWardSelect";
import type { IpdBed, IpdWard } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { useConvertTheatreCaseToIpd } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type { TheatreCase } from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  canConvertToIpd,
  conversionSummary,
} from "@/features/clinical-theatre/utils/theatre-obstetric-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

/**
 * Day case → inpatient: admit the patient to a ward bed part-way through the
 * case, on the same visit, so the case can be discharged to the ward.
 */
export function TheatreIpdConversionPanel({
  theatreCase,
  canConvert,
}: {
  theatreCase: TheatreCase;
  canConvert: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [ward, setWard] = useState<IpdWard | null>(null);
  const [bed, setBed] = useState<IpdBed | null>(null);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const mutation = useConvertTheatreCaseToIpd();
  const summary = conversionSummary(theatreCase);
  const convertible = canConvertToIpd(theatreCase);
  const validation = !bed
    ? "Choose a ward bed."
    : !reason.trim()
      ? "Give the reason the patient needs to stay in."
      : null;

  return (
    <div className="space-y-2" data-testid="theatre-ipd-conversion-panel">
      {summary ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {summary}
          <span className="block text-xs">
            The patient now appears on the IPD ward board; discharge from theatre to the
            ward when recovery is done.
          </span>
        </div>
      ) : null}
      {!summary && theatreCase.source === "ipd_stay" ? (
        <p className="text-sm text-muted-foreground">This case is for an inpatient.</p>
      ) : null}
      {!summary && theatreCase.source !== "ipd_stay" && !open ? (
        <p className="text-sm text-muted-foreground">
          Day case. If the patient now needs to stay overnight, admit them to a ward bed;
          theatre and ward charges stay on the same visit.
        </p>
      ) : null}
      {canConvert && convertible && !open ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          Convert to inpatient
        </Button>
      ) : null}
      {open ? (
        <form
          className="space-y-3 rounded-md border bg-muted/30 p-3"
          data-testid="theatre-ipd-conversion-form"
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (validation || !bed) return;
            mutation.mutate(
              {
                caseUuid: theatreCase.uuid,
                payload: { bed: bed.uuid, reason: reason.trim() },
              },
              { onSuccess: () => setOpen(false) },
            );
          }}
        >
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
          <div className="space-y-1">
            <Label htmlFor={`convert-reason-${theatreCase.uuid}`}>Reason for admission</Label>
            <Textarea
              id={`convert-reason-${theatreCase.uuid}`}
              rows={2}
              placeholder="e.g. Post-operative bleeding, observe overnight"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          {touched && validation ? (
            <p className="text-xs text-red-600" role="alert">
              {validation}
            </p>
          ) : null}
          {mutation.error ? (
            <p className="text-xs text-red-600">
              {errorMessage(mutation.error, "Could not admit the patient.")}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              Admit to ward
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
