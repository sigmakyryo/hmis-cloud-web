"use client";

import { useState } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import {
  EMPTY_HOSPITAL_CHOICE,
  HospitalChoiceFields,
  type HospitalChoiceValue,
} from "@/features/clinical-opd/components/tabs/HospitalChoiceFields";
import { useCreateExternalReference } from "@/features/clinical-opd/hooks/use-external-care";
import type {
  ExternalReferenceKind,
  OutsideHospital,
} from "@/features/clinical-opd/types/external-care.types";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { useToast } from "@/providers/toast-provider";

type ReferenceRecordFormProps = {
  visitUuid: string;
  encounterUuid: string;
  hospitals: OutsideHospital[];
  kinds: ExternalReferenceKind[];
  disabled?: boolean;
};

export function ReferenceRecordForm({
  visitUuid,
  encounterUuid,
  hospitals,
  kinds,
  disabled = false,
}: ReferenceRecordFormProps) {
  const { toast } = useToast();
  const createReference = useCreateExternalReference(visitUuid, encounterUuid);
  const [kindUuid, setKindUuid] = useState("");
  const [value, setValue] = useState("");
  const [hospital, setHospital] = useState<HospitalChoiceValue>(EMPTY_HOSPITAL_CHOICE);
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  async function submit() {
    const number = value.trim();
    if (!kindUuid || !number) {
      toast({ title: "Choose a kind and enter the number", variant: "error" });
      return;
    }
    try {
      const saved = await createReference.mutateAsync({
        input: {
          kind_uuid: kindUuid,
          value: number,
          hospital_uuid: hospital.hospitalUuid || null,
          hospital_name: hospital.hospitalName.trim(),
          town: hospital.town,
          phone: hospital.phone,
        },
        files,
      });
      setKindUuid("");
      setValue("");
      setHospital(EMPTY_HOSPITAL_CHOICE);
      setFiles([]);
      setFileInputKey((current) => current + 1);
      toast({
        title: "Reference saved",
        description:
          saved.failedFileNames.length > 0
            ? `These files were not attached: ${saved.failedFileNames.join(", ")}`
            : undefined,
        variant: saved.failedFileNames.length > 0 ? "error" : "success",
      });
    } catch (error) {
      toast({
        title: "Could not save the reference",
        description:
          error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : "Try again.",
        variant: "error",
      });
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-brand-border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="reference-kind">
          Kind <RequiredFieldMarker />
        </Label>
        <select
          id="reference-kind"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          disabled={disabled || kinds.length === 0}
          value={kindUuid}
          onChange={(event) => setKindUuid(event.target.value)}
        >
          <option value="">Select a kind</option>
          {kinds.map((kind) => (
            <option key={kind.uuid} value={kind.uuid}>
              {kind.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reference-value">
          Number <RequiredFieldMarker />
        </Label>
        <Input
          id="reference-value"
          disabled={disabled}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <HospitalChoiceFields
        hospitals={hospitals}
        value={hospital}
        onChange={setHospital}
        disabled={disabled}
        idPrefix="reference"
      />
      <div className="space-y-1.5">
        <Label htmlFor="reference-files">Documents</Label>
        <Input
          key={fileInputKey}
          id="reference-files"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          multiple
          disabled={disabled}
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
      </div>
      <PrimaryButton
        type="button"
        disabled={disabled || createReference.isPending || kinds.length === 0}
        onClick={() => void submit()}
      >
        Save reference
      </PrimaryButton>
    </div>
  );
}
