"use client";

import { useState } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ClinicalFormRecord } from "@/features/occupational-health/lib/oh-form-catalog";
import {
  assertClinicalFormsClear,
  submitClinicalForm,
  uploadClinicalFormDocument,
} from "@/features/occupational-health/services/oh.service";

type CustomerOnboardingFormsProps = {
  customerUuid: string;
  forms: ClinicalFormRecord[];
  onFinished: () => void;
};

export function CustomerOnboardingForms({
  customerUuid,
  forms,
  onFinished,
}: CustomerOnboardingFormsProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      for (const form of forms) {
        const file = files[form.uuid];
        if (file) {
          await uploadClinicalFormDocument(form.uuid, { customer_uuid: customerUuid, file });
          continue;
        }
        const note = notes[form.uuid]?.trim() ?? "";
        if (!note) {
          setError(`Add a note or upload a file for ${form.name}.`);
          return;
        }
        await submitClinicalForm(form.uuid, { customer_uuid: customerUuid, note });
      }
      await assertClinicalFormsClear({ trigger: "onboarding", customer_uuid: customerUuid });
      onFinished();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Submit or upload each required form before continuing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="customer-onboarding-forms">
      <p className="text-[13px] text-dash-muted">
        This client is saved. Finish the required forms before leaving registration.
      </p>
      {forms.map((form) => (
        <div key={form.uuid} className="space-y-2 rounded-md border border-dash-border p-3">
          <p className="text-[13px] font-medium text-brand-navy">{form.name}</p>
          <Textarea
            value={notes[form.uuid] ?? ""}
            placeholder="Note"
            onChange={(event) => setNotes((current) => ({ ...current, [form.uuid]: event.target.value }))}
          />
          <Input
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(event) => setFiles((current) => ({ ...current, [form.uuid]: event.target.files?.[0] ?? null }))}
          />
        </div>
      ))}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <PrimaryButton type="button" disabled={busy} onClick={() => void finish()}>
        {busy ? "Saving forms..." : "Finish forms"}
      </PrimaryButton>
    </div>
  );
}
