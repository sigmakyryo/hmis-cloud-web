"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { IpdChoiceGroup } from "@/features/clinical-ipd/components/IpdChoiceGroup";
import { createIpdBed } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdWard } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { appFont } from "@/lib/fonts";

type BedGender = "any" | "male" | "female";

const GENDERS: { value: BedGender; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

type IpdCreateBedDialogProps = {
  ward: IpdWard;
  onClose: () => void;
};

export function IpdCreateBedDialog({ ward, onClose }: IpdCreateBedDialogProps) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [gender, setGender] = useState<BedGender>("any");

  const mutation = useMutation({
    mutationFn: () =>
      createIpdBed({
        ward: ward.uuid,
        code: code.trim(),
        label: label.trim(),
        gender_restriction: gender,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ipd-beds"] });
      void queryClient.invalidateQueries({ queryKey: ["ipd-census"] });
      onClose();
    },
  });

  const canSubmit = Boolean(code.trim()) && !mutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={appFont.className}>
        <DialogHeader>
          <DialogTitle>Add bed</DialogTitle>
          <DialogDescription>Add a bed to {ward.name}. The code is unique inside this ward.</DialogDescription>
        </DialogHeader>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="bed-code">
              Bed code <RequiredFieldMarker />
            </Label>
            <Input id="bed-code" value={code} placeholder="B01" onChange={(event) => setCode(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bed-label">Label</Label>
            <Input
              id="bed-label"
              value={label}
              placeholder="Window bed"
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <IpdChoiceGroup label="Who can use it" value={gender} options={GENDERS} onChange={setGender} />
          {mutation.error ? (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Could not add the bed."}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              Add bed
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
