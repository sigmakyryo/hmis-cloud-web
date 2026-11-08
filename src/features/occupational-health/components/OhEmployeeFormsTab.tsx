"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import { parseExamTemplateSnapshot, type ExamTemplateAnswers } from "@/features/occupational-health/lib/exam-template-snapshot";
import {
  createOhEmployeeFormInvite,
  fetchOhEmployeeFormResponses,
  openOhEmployeeForm,
  patchOhEmployeeFormResponses,
  uploadOhEmployeeFormDocument,
} from "@/features/occupational-health/services/oh.service";
import { ROUTES } from "@/constants/routes";

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  uploaded: "Uploaded",
} as const;

type OhEmployeeFormsTabProps = {
  customerUuid: string;
};

export function OhEmployeeFormsTab({ customerUuid }: OhEmployeeFormsTabProps) {
  const queryClient = useQueryClient();
  const responses = useQuery({
    queryKey: ["oh-employee-form-responses", customerUuid],
    queryFn: fetchOhEmployeeFormResponses,
  });
  const form = (responses.data ?? []).find((row) => row.customer_uuid === customerUuid && row.is_active !== false) ?? null;
  const [link, setLink] = useState<string | null>(null);
  const [answers, setAnswers] = useState<ExamTemplateAnswers | null>(null);
  const snapshot = parseExamTemplateSnapshot(form?.template_snapshot ?? null);
  const envelope = form?.responses_json?.__employee_form__ as { answers?: ExamTemplateAnswers } | undefined;
  const currentAnswers = answers ?? envelope?.answers ?? { picks: {}, fields: {} };
  const status = form?.status ?? "not_started";
  const locked = status === "submitted" || status === "uploaded";

  const refresh = async () => {
    setAnswers(null);
    await queryClient.invalidateQueries({ queryKey: ["oh-employee-form-responses", customerUuid] });
  };
  const open = useMutation({ mutationFn: () => openOhEmployeeForm(customerUuid), onSuccess: () => void refresh() });
  const save = useMutation({
    mutationFn: (submit: boolean) => patchOhEmployeeFormResponses(form!.uuid, {
      row_version: form!.row_version ?? 1,
      submit,
      responses_json: { __employee_form__: { ...(envelope ?? {}), answers: currentAnswers } },
    }),
    onSuccess: () => void refresh(),
  });
  const invite = useMutation({
    mutationFn: () => createOhEmployeeFormInvite(form!.uuid),
    onSuccess: (result) => setLink(`${window.location.origin}${ROUTES.workforceForm(result.token)}`),
  });
  const upload = useMutation({
    mutationFn: (file: File) => uploadOhEmployeeFormDocument(form!.uuid, file),
    onSuccess: () => void refresh(),
  });

  return (
    <div className="space-y-4 p-5" data-testid="oh-employee-forms-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-brand-navy">Employee form status: <span data-testid="oh-employee-form-status">{STATUS_LABEL[status]}</span></p>
        <div className="flex flex-wrap gap-2">
          {!form ? <PrimaryButton type="button" onClick={() => open.mutate()} disabled={open.isPending}>Open form</PrimaryButton> : null}
          {form && !locked ? (
            <>
              <SecondaryButton type="button" onClick={() => save.mutate(false)} disabled={save.isPending}>Save</SecondaryButton>
              <PrimaryButton type="button" onClick={() => save.mutate(true)} disabled={save.isPending}>Submit</PrimaryButton>
              <SecondaryButton type="button" onClick={() => invite.mutate()} disabled={invite.isPending}>Send link</SecondaryButton>
            </>
          ) : null}
        </div>
      </div>
      {link ? <p className="break-all text-[13px] text-brand-primary" data-testid="oh-employee-form-link">{link}</p> : null}
      {form ? (
        <label className="block text-[13px] text-brand-navy">
          Upload document
          <input
            className="mt-1 block text-[13px]"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            disabled={locked || upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
            }}
          />
          {form.document_original_name ? <span className="mt-1 block text-dash-muted">{form.document_original_name}</span> : null}
        </label>
      ) : null}
      {snapshot && form ? (
        <OhExamTemplateCaptureForm
          snapshot={snapshot}
          value={currentAnswers}
          disabled={locked}
          onChange={(next) => setAnswers(next)}
        />
      ) : null}
      {open.isError || save.isError ? <p className="text-sm text-red-700">The risk profile needs a published employee form before this can be saved.</p> : null}
    </div>
  );
}
