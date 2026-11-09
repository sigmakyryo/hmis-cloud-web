"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import { hasCompleteExamDefinitions, parseExamTemplateSnapshot, type ExamTemplateAnswers } from "@/features/occupational-health/lib/exam-template-snapshot";
import {
  createOhEmployeeFormInvite,
  createOhEmployeeFormResponse,
  patchOhEmployeeFormResponses,
} from "@/features/occupational-health/services/oh.service";
import type { OhTemplateCapture, OhVisitEncounter } from "@/features/occupational-health/types";
import { ROUTES } from "@/constants/routes";

type OhSessionEmployeeFormProps = {
  encounter: OhVisitEncounter;
  records: OhTemplateCapture[];
  onSaved: () => Promise<unknown>;
};

type Mode = "actions" | "manual";

export function OhSessionEmployeeForm({ encounter, records, onSaved }: OhSessionEmployeeFormProps) {
  const existing = records.find((row) => row.is_active !== false) ?? null;
  const [created, setCreated] = useState<OhTemplateCapture | null>(null);
  const form = existing ?? created;
  const [mode, setMode] = useState<Mode>("actions");
  const [answers, setAnswers] = useState<ExamTemplateAnswers | null>(null);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const snapshot = parseExamTemplateSnapshot(form?.template_snapshot ?? null);
  const incomplete = Boolean(snapshot && !hasCompleteExamDefinitions(snapshot));
  const envelope = form?.responses_json?.__employee_form__ as { answers?: ExamTemplateAnswers } | undefined;
  const currentAnswers = answers ?? envelope?.answers ?? { picks: {}, fields: {} };
  const locked = form?.status === "submitted" || form?.status === "uploaded";

  const refresh = async (record?: OhTemplateCapture) => {
    if (record) {
      setCreated(record);
    }
    setAnswers(null);
    await onSaved();
  };

  const ensureRecord = async () => {
    if (form) {
      return form;
    }
    const record = await createOhEmployeeFormResponse({ encounter: encounter.id });
    setCreated(record);
    await onSaved();
    return record;
  };

  const manual = useMutation({
    mutationFn: ensureRecord,
    onSuccess: () => setMode("manual"),
  });
  const save = useMutation({
    mutationFn: (submit: boolean) => patchOhEmployeeFormResponses(form!.uuid, {
      row_version: form!.row_version ?? 1,
      submit,
      responses_json: { __employee_form__: { ...(envelope ?? {}), answers: currentAnswers } },
    }),
    onSuccess: async (record) => {
      await refresh(record);
      setMode("actions");
    },
  });
  const link = useMutation({
    mutationFn: async () => {
      if (publicLink) {
        return publicLink;
      }
      const record = await ensureRecord();
      const invite = await createOhEmployeeFormInvite(record.uuid);
      return `${window.location.origin}${ROUTES.workforceForm(invite.token)}`;
    },
    onSuccess: async (next) => {
      setPublicLink(next);
      try {
        await navigator.clipboard.writeText(next);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="oh-session-employee-form">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {mode === "actions" ? (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
            <Choice
              title="Enter manually"
              detail="Fill the questions for this visit here."
              disabled={manual.isPending || encounter.is_active === false}
              onClick={() => manual.mutate()}
            />
            <Choice
              title="Send link"
              detail="Create the page for this visit so you can send it to the employee."
              disabled={link.isPending || locked || encounter.is_active === false}
              onClick={() => link.mutate()}
            />
            <Choice
              title="Copy link"
              detail={copied ? "Copied. The employee opens this page to fill the form." : "Copy the page for this visit."}
              disabled={link.isPending || locked || encounter.is_active === false}
              onClick={() => link.mutate()}
            />
            {publicLink ? (
              <p className="break-all px-1 text-[13px] text-brand-primary" data-testid="oh-session-employee-link">{publicLink}</p>
            ) : null}
            {manual.isError ? <p className="text-sm text-red-700">{message(manual.error, "The employee form could not be opened.")}</p> : null}
            {link.isError ? <p className="text-sm text-red-700">{message(link.error, "The public link could not be created.")}</p> : null}
            {incomplete && !locked ? <p className="text-sm text-dash-muted">This form needs updated fields from Occupational Health settings before it can be completed.</p> : null}
            {locked ? <p className="text-sm text-dash-muted">This form is already complete.</p> : null}
          </div>
        ) : (
          <div className="space-y-4">
            {snapshot ? (
              <OhExamTemplateCaptureForm
                snapshot={snapshot}
                value={currentAnswers}
                disabled={save.isPending || encounter.is_active === false}
                onChange={setAnswers}
              />
            ) : incomplete ? (
              <p className="text-sm text-dash-muted">Ask an administrator to publish the configured fields, then reopen this form.</p>
            ) : (
              <p className="text-sm text-dash-muted">This form has no questions to fill yet.</p>
            )}
            {save.isError ? <p className="text-sm text-red-700">{message(save.error, "The answers could not be saved.")}</p> : null}
          </div>
        )}
      </div>
      {mode === "manual" ? (
        <div className="flex justify-end gap-2 border-t border-dash-border px-5 py-4">
          <SecondaryButton type="button" onClick={() => setMode("actions")}>Back</SecondaryButton>
          <SecondaryButton type="button" onClick={() => save.mutate(false)} disabled={!form || save.isPending}>Save</SecondaryButton>
          <PrimaryButton type="button" onClick={() => save.mutate(true)} disabled={!form || save.isPending}>Submit</PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}

function Choice({
  title,
  detail,
  disabled,
  onClick,
}: {
  title: string;
  detail: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full flex-col rounded-xl border border-dash-border bg-white px-4 py-3 text-left hover:bg-brand-tint/40 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="text-[13px] font-medium text-brand-navy">{title}</span>
      <span className="text-[12px] text-dash-muted">{detail}</span>
    </button>
  );
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
