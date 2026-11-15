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
import { IpdDepartmentSelect } from "@/features/clinical-ipd/components/IpdDepartmentSelect";
import { createIpdWard } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdWard, IpdWardClass } from "@/features/clinical-ipd/types/clinical-ipd.types";
import type { ClinicalClinic, ClinicalDepartment } from "@/features/clinical/types/clinical-catalog.types";
import { appFont } from "@/lib/fonts";

const WARD_CLASSES: { value: IpdWardClass; label: string }[] = [
  { value: "general", label: "General" },
  { value: "icu", label: "ICU" },
  { value: "maternity", label: "Maternity" },
  { value: "other", label: "Other" },
];

type IpdCreateWardDialogProps = {
  clinic: ClinicalClinic;
  onClose: () => void;
  onCreated: (ward: IpdWard) => void;
};

export function IpdCreateWardDialog({ clinic, onClose, onCreated }: IpdCreateWardDialogProps) {
  const queryClient = useQueryClient();
  const [department, setDepartment] = useState<ClinicalDepartment | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [wardClass, setWardClass] = useState<IpdWardClass>("general");

  const mutation = useMutation({
    mutationFn: () =>
      createIpdWard({
        name: name.trim(),
        code: code.trim(),
        clinic: clinic.uuid,
        department: department?.uuid,
        ward_class: wardClass,
      }),
    onSuccess: (ward) => {
      void queryClient.invalidateQueries({ queryKey: ["ipd-wards"] });
      onCreated(ward);
    },
  });

  const canSubmit = Boolean(department && name.trim() && code.trim()) && !mutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={appFont.className}>
        <DialogHeader>
          <DialogTitle>New ward</DialogTitle>
          <DialogDescription>Add a ward at {clinic.name}. Beds are added after the ward exists.</DialogDescription>
        </DialogHeader>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          <IpdDepartmentSelect clinicId={clinic.id} value={department} onChange={setDepartment} label="Department" />
          <div className="space-y-1.5">
            <Label htmlFor="ward-name">
              Ward name <RequiredFieldMarker />
            </Label>
            <Input id="ward-name" value={name} placeholder="General A" onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ward-code">
              Ward code <RequiredFieldMarker />
            </Label>
            <Input id="ward-code" value={code} placeholder="GEN-A" onChange={(event) => setCode(event.target.value)} />
          </div>
          <IpdChoiceGroup label="Class" value={wardClass} options={WARD_CLASSES} onChange={setWardClass} />
          {mutation.error ? (
            <p className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Could not create the ward."}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              Create ward
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
