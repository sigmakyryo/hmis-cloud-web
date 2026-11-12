"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheatreCancellationReasons } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import {
  cancellationFormError,
  groupCancellationReasons,
} from "@/features/clinical-theatre/utils/theatre-cancellation-display";

type TheatreCancelReasonFormProps = {
  caseUuid: string;
  actionLabel: string;
  pending: boolean;
  onSubmit: (input: { cancellation_reason: string | null; reason: string }) => void;
  onBack: () => void;
};

/** Standard reason (grouped by category) plus an optional note. */
export function TheatreCancelReasonForm({
  caseUuid,
  actionLabel,
  pending,
  onSubmit,
  onBack,
}: TheatreCancelReasonFormProps) {
  const reasonsQuery = useTheatreCancellationReasons();
  const reasons = reasonsQuery.data ?? [];
  const groups = groupCancellationReasons(reasons);
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const chosen = reasons.find((reason) => reason.uuid === selected);
  const validation = cancellationFormError(reasons, selected, note);
  const hasList = groups.length > 0;

  return (
    <form
      className="space-y-2 rounded-lg bg-muted/40 p-3"
      data-testid="theatre-cancel-reason-form"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (validation) return;
        onSubmit({ cancellation_reason: hasList ? selected : null, reason: note.trim() });
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {hasList ? (
          <div className="space-y-1.5">
            <Label htmlFor={`cancel-reason-${caseUuid}`}>Reason ({actionLabel})</Label>
            <select
              id={`cancel-reason-${caseUuid}`}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Choose a reason…</option>
              {groups.map((group) => (
                <optgroup key={group.category} label={group.label}>
                  {group.reasons.map((reason) => (
                    <option key={reason.uuid} value={reason.uuid}>
                      {reason.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor={`cancel-note-${caseUuid}`}>
            {hasList
              ? chosen?.requires_note
                ? "Note (required)"
                : "Note (optional)"
              : `Reason (${actionLabel})`}
          </Label>
          <Input
            id={`cancel-note-${caseUuid}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </div>
      {reasonsQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading reasons…</p>
      ) : null}
      {touched && validation ? (
        <p className="text-xs text-red-600" role="alert">
          {validation}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Confirm
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onBack}>
          Back
        </Button>
      </div>
    </form>
  );
}
