"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { dischargeIpdStay } from "@/features/clinical-ipd/services/clinical-ipd.service";

type IpdStayDischargeDialogProps = {
  stayUuid: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** When false, discharge is blocked until a signed summary exists. */
  canDischarge?: boolean;
};

export function IpdStayDischargeDialog({
  stayUuid,
  open,
  onClose,
  onSuccess,
  canDischarge = true,
}: IpdStayDischargeDialogProps) {
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState("");
  const [closeVisit, setCloseVisit] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      dischargeIpdStay(stayUuid, {
        summary: summary.trim() || undefined,
        close_visit: closeVisit,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ipd-census"] });
      void queryClient.invalidateQueries({ queryKey: ["ipd-stay-for-visit"] });
      void queryClient.invalidateQueries({ queryKey: ["ipd-stays"] });
      onSuccess?.();
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-background p-4 shadow-lg">
        <h3 className="text-base font-medium">Discharge patient</h3>
        {!canDischarge ? (
          <p className="text-sm text-destructive">
            Sign a discharge summary on the Stay tab before discharging.
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="discharge-summary">Discharge notes</Label>
          <Textarea
            id="discharge-summary"
            rows={4}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Optional free-text notes"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={closeVisit}
            onChange={(event) => setCloseVisit(event.target.checked)}
          />
          Also close the visit
        </label>
        {mutation.error ? (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Discharge failed."}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canDischarge || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Discharge
          </Button>
        </div>
      </div>
    </div>
  );
}
