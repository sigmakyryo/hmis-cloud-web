"use client";

import { use, useEffect, useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import { parseExamTemplateSnapshot, type ExamTemplateAnswers } from "@/features/occupational-health/lib/exam-template-snapshot";
import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { appFont } from "@/lib/fonts";
import { bffRequest } from "@/lib/bff-client";

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
  const [answers, setAnswers] = useState<ExamTemplateAnswers | null>(null);

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
  const envelope = form?.responses_json.__employee_form__ as { answers?: ExamTemplateAnswers } | undefined;
  const current = answers ?? envelope?.answers ?? { picks: {}, fields: {} };

  async function save(submit: boolean) {
    if (!form) return;
    const next = await bffRequest<PublicForm>(BFF_OCCUPATIONAL_HEALTH_ROUTES.workforceForm(token), {
      method: "PATCH",
      body: {
        row_version: form.row_version,
        submit,
        responses_json: { __employee_form__: { ...(envelope ?? {}), answers: current } },
      },
    });
    setAnswers(null);
    setForm(next);
  }

  return (
    <main className={`${appFont.className} mx-auto min-h-svh max-w-2xl bg-[#f7f8f7] px-4 py-8`} data-testid="public-workforce-form">
      <h1 className="text-lg font-semibold text-brand-navy">Employee form</h1>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {!form && !error ? <p className="mt-4 text-sm text-dash-muted">Loading the form.</p> : null}
      {form && snapshot ? (
        <div className="mt-6 rounded-md bg-white p-4">
          <OhExamTemplateCaptureForm snapshot={snapshot} value={current} onChange={setAnswers} />
          <div className="mt-4 flex gap-2">
            <SecondaryButton type="button" onClick={() => void save(false)}>Save</SecondaryButton>
            <PrimaryButton type="button" onClick={() => void save(true)}>Submit</PrimaryButton>
          </div>
          <label className="mt-4 block text-[13px]">
            Or upload a completed document
            <input
              className="mt-1 block"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const body = new FormData();
                body.set("document", file);
                void bffRequest<PublicForm>(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.workforceForm(token)}/document`, {
                  method: "POST",
                  body,
                }).then(setForm);
              }}
            />
          </label>
        </div>
      ) : null}
      {form?.status === "submitted" || form?.status === "uploaded" ? <p className="mt-4 text-sm text-brand-navy">This form is complete.</p> : null}
    </main>
  );
}
