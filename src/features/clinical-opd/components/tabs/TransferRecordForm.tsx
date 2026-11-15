"use client";

import { useState } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPTY_HOSPITAL_CHOICE,
  HospitalChoiceFields,
  type HospitalChoiceValue,
} from "@/features/clinical-opd/components/tabs/HospitalChoiceFields";
import { useCreateExternalTransfer } from "@/features/clinical-opd/hooks/use-external-care";
import type { OutsideHospital } from "@/features/clinical-opd/types/external-care.types";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { useToast } from "@/providers/toast-provider";

type TransferRecordFormProps = {
  visitUuid: string;
  encounterUuid: string;
  direction: "inbound" | "outbound";
  hospitals: OutsideHospital[];
  disabled?: boolean;
};

function localDateTimeToIso(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function TransferRecordForm({
  visitUuid,
  encounterUuid,
  direction,
  hospitals,
  disabled = false,
}: TransferRecordFormProps) {
  const { toast } = useToast();
  const createTransfer = useCreateExternalTransfer(visitUuid, encounterUuid);
  const [hospital, setHospital] = useState<HospitalChoiceValue>(EMPTY_HOSPITAL_CHOICE);
  const [theirReference, setTheirReference] = useState("");
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const idPrefix = direction === "inbound" ? "inbound" : "outbound";

  async function submit() {
    const trimmedReason = reason.trim();
    const trimmedName = hospital.hospitalName.trim();
    if (!trimmedReason) {
      toast({ title: "Enter the reason", variant: "error" });
      return;
    }
    if (!hospital.hospitalUuid && !trimmedName) {
      toast({ title: "Enter the hospital", variant: "error" });
      return;
    }
    try {
      const saved = await createTransfer.mutateAsync({
        input: {
          direction,
          hospital_uuid: hospital.hospitalUuid || null,
          hospital_name: trimmedName,
          town: hospital.town,
          phone: hospital.phone,
          their_reference: theirReference.trim(),
          reason: trimmedReason,
          contact: contact.trim(),
          occurred_at: localDateTimeToIso(occurredAt),
          notes: notes.trim(),
        },
        files,
      });
      setHospital(EMPTY_HOSPITAL_CHOICE);
      setTheirReference("");
      setReason("");
      setContact("");
      setOccurredAt("");
      setNotes("");
      setFiles([]);
      setFileInputKey((current) => current + 1);
      toast({
        title: direction === "inbound" ? "Arrival recorded" : "Referral recorded",
        description:
          saved.failedFileNames.length > 0
            ? `These files were not attached: ${saved.failedFileNames.join(", ")}`
            : undefined,
        variant: saved.failedFileNames.length > 0 ? "error" : "success",
      });
    } catch (error) {
      toast({
        title: "Could not save the transfer",
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
      <HospitalChoiceFields
        hospitals={hospitals}
        value={hospital}
        onChange={setHospital}
        disabled={disabled}
        required
        idPrefix={idPrefix}
      />
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-reference`}>Their reference</Label>
        <Input
          id={`${idPrefix}-reference`}
          data-testid={`${idPrefix}-reference`}
          disabled={disabled}
          value={theirReference}
          onChange={(event) => setTheirReference(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-reason`}>
          Reason <RequiredFieldMarker />
        </Label>
        <Textarea
          id={`${idPrefix}-reason`}
          rows={2}
          disabled={disabled}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-contact`}>Department or clinician</Label>
        <Input
          id={`${idPrefix}-contact`}
          disabled={disabled}
          value={contact}
          onChange={(event) => setContact(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-when`}>When</Label>
        <Input
          id={`${idPrefix}-when`}
          type="datetime-local"
          disabled={disabled}
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          rows={2}
          disabled={disabled}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-files`}>Documents</Label>
        <Input
          key={fileInputKey}
          id={`${idPrefix}-files`}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          multiple
          disabled={disabled}
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
      </div>
      <PrimaryButton
        type="button"
        disabled={disabled || createTransfer.isPending}
        onClick={() => void submit()}
      >
        {direction === "inbound" ? "Record arrival" : "Record referral"}
      </PrimaryButton>
    </div>
  );
}
