"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import {
  hasCompleteExamDefinitions,
  parseExamTemplateSnapshot,
  type ExamTemplateAnswers,
} from "@/features/occupational-health/lib/exam-template-snapshot";
import { focusFirstExamError, validateExamAnswers } from "@/features/occupational-health/lib/exam-template-validation";
import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { appFont } from "@/lib/fonts";
import { BffError, bffRequest } from "@/lib/bff-client";

type PublicForm = {
  uuid: string;
  status: string;
  row_version: number;
  responses_json: Record<string, unknown>;
  template_snapshot?: Record<string, unknown> | null;
};

export default function PublicWorkforceFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [form, setForm] = useState<PublicForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<ExamTemplateAnswers | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await bffRequest<PublicForm>(BFF_OCCUPATIONAL_HEALTH_ROUTES.workforceForm(token));
        if (!cancelled) setForm(data);
      } catch {
        if (!cancelled) setError("This link is not available.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const snapshot = parseExamTemplateSnapshot(form?.template_snapshot ?? null);
  const incomplete = Boolean(snapshot && !hasCompleteExamDefinitions(snapshot));
  const envelope = form?.responses_json.__employee_form__ as {
    answers?: ExamTemplateAnswers;
    template_uuid?: string;
    template_version_uuid?: string;
    version_number?: number | null;
  } | undefined;
  const current = answers ?? envelope?.answers ?? { picks: {}, fields: {} };
  const locked = form?.status === "submitted" || form?.status === "uploaded";
  const visibleErrors = useMemo(() => fieldErrors, [fieldErrors]);

  async function save(submit: boolean) {
    if (!form || locked) return;
    if (incomplete) {
      setError("This form needs updated fields from your occupational health team before it can be completed.");
      return;
    }
    if (snapshot && submit) {
      const nextErrors = validateExamAnswers(snapshot, current);
      if (Object.keys(nextErrors).length) {
        setFieldErrors(nextErrors);
        setError("Review the highlighted responses before submitting.");
        requestAnimationFrame(() => focusFirstExamError(formRef.current, nextErrors));
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const next = await bffRequest<PublicForm>(BFF_OCCUPATIONAL_HEALTH_ROUTES.workforceForm(token), {
        method: "PATCH",
        body: {
          row_version: form.row_version,
          submit,
          responses_json: {
            __employee_form__: {
              template_uuid: envelope?.template_uuid,
              template_version_uuid: envelope?.template_version_uuid,
              version_number: envelope?.version_number,
              answers: current,
            },
          },
        },
      });
      setAnswers(null);
      setFieldErrors({});
      setForm(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : "This form could not be saved.";
      setError(message);
      if (err instanceof BffError && err.errors.length) {
        const mapped: Record<string, string> = {};
        for (const item of err.errors) {
          if (item.field) mapped[item.field] = item.message;
        }
        if (Object.keys(mapped).length) {
          setFieldErrors(mapped);
          requestAnimationFrame(() => focusFirstExamError(formRef.current, mapped));
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`${appFont.className} mx-auto min-h-svh max-w-2xl bg-[#f7f8f7] px-4 py-8`} data-testid="public-workforce-form">
      <h1 className="text-lg font-semibold text-brand-navy">Employee form</h1>
      {error ? <p className="mt-4 text-sm text-red-700" role="alert">{error}</p> : null}
      {!form && !error ? <p className="mt-4 text-sm text-dash-muted">Loading the form.</p> : null}
      {form && incomplete && !locked ? (
        <p className="mt-4 text-sm text-dash-muted" role="status">
          This form is missing its questions. Contact your occupational health team for an updated link.
        </p>
      ) : null}
      {form && snapshot && !incomplete && !locked ? (
        <div className="mt-6 rounded-md bg-white p-4">
          <div ref={formRef}>
            <OhExamTemplateCaptureForm
              snapshot={snapshot}
              value={current}
              onChange={(next) => {
                setAnswers(next);
                setFieldErrors({});
              }}
              disabled={busy}
              errors={visibleErrors}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <SecondaryButton type="button" disabled={busy} onClick={() => void save(false)}>
              {busy ? "Saving…" : "Save"}
            </SecondaryButton>
            <PrimaryButton type="button" disabled={busy} onClick={() => void save(true)}>
              Submit
            </PrimaryButton>
          </div>
          <label className="mt-4 block text-[13px]">
            Or upload a completed document
            <input
              className="mt-1 block"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const body = new FormData();
                body.set("document", file);
                setBusy(true);
                void bffRequest<PublicForm>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.workforceForm(token)}/document`, {
                  method: "POST",
                  body,
                })
                  .then(setForm)
                  .catch((err) => {
                    setError(err instanceof Error ? err.message : "The document could not be uploaded.");
                  })
                  .finally(() => setBusy(false));
              }}
            />
          </label>
        </div>
      ) : null}
      {locked ? <p className="mt-4 text-sm text-brand-navy">This form is complete.</p> : null}
    </main>
  );
}
