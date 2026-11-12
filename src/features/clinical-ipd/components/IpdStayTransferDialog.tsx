"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IpdBedSelect } from "@/features/clinical-ipd/components/IpdBedSelect";
import { IpdWardSelect } from "@/features/clinical-ipd/components/IpdWardSelect";
import { transferIpdStay } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdBed, IpdWard } from "@/features/clinical-ipd/types/clinical-ipd.types";

type IpdStayTransferDialogProps = {
  stayUuid: string;
  clinicUuid: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function IpdStayTransferDialog({
  stayUuid,
  clinicUuid,
  open,
  onClose,
  onSuccess,
}: IpdStayTransferDialogProps) {
  const queryClient = useQueryClient();
  const [ward, setWard] = useState<IpdWard | null>(null);
  const [bed, setBed] = useState<IpdBed | null>(null);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      transferIpdStay(stayUuid, {
        bed: bed!.uuid,
        reason: reason.trim() || undefined,
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
        <h3 className="text-base font-medium">Transfer patient</h3>
        <IpdWardSelect
          clinicUuid={clinicUuid}
          value={ward}
          onChange={(next) => {
            setWard(next);
            setBed(null);
          }}
        />
        <IpdBedSelect
          wardUuid={ward?.uuid}
          value={bed}
          onChange={setBed}
          availableOnly
        />
        <div className="space-y-1.5">
          <Label htmlFor="transfer-reason">Reason</Label>
          <Input
            id="transfer-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Optional"
          />
        </div>
        {mutation.error ? (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Transfer failed."}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!bed || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Transfer
          </Button>
        </div>
      </div>
    </div>
  );
}
