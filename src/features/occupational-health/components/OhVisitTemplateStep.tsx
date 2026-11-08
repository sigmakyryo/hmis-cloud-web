"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import {
  emptyExamTemplateAnswers,
  parseExamTemplateSnapshot,
  type ExamTemplateAnswers,
  type ExamTemplateResponseEnvelope,
} from "@/features/occupational-health/lib/exam-template-snapshot";
import { focusFirstExamError, validateExamAnswers } from "@/features/occupational-health/lib/exam-template-validation";
import {
  createOhCofResponse,
  createOhEmployeeFormResponse,
  patchOhCofResponses,
  patchOhEmployeeFormResponses,
} from "@/features/occupational-health/services/oh.service";
import type { OhTemplateCapture, OhVisitEncounter } from "@/features/occupational-health/types";
import { useToast } from "@/providers/toast-provider";

type OhVisitTemplateStepProps = {
  family: "employee" | "cof";
  title: string;
  responseKey: string;
  encounter: OhVisitEncounter;
  records: OhTemplateCapture[];
  locked: boolean;
  completionRef?: { current: (() => Promise<boolean>) | null };
  onSaved: () => void;
};

export function OhVisitTemplateStep({
  family,
  title,
  responseKey,
  encounter,
  records,
  locked,
  completionRef,
  onSaved,
}: OhVisitTemplateStepProps) {
  const { toast } = useToast();
  const record = records[0] ?? null;
  const [current, setCurrent] = useState<OhTemplateCapture | null>(record);
  const [answers, setAnswers] = useState<ExamTemplateAnswers>(emptyExamTemplateAnswers());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef(answers);
  const currentRef = useRef(current);
  const onSavedRef = useRef(onSaved);
  const recordKey = record?.uuid ?? "";
  const recordVersion = record?.row_version ?? 0;

  const snapshot = useMemo(
    () => parseExamTemplateSnapshot(current?.template_snapshot),
    [current?.template_snapshot],
  );
  const errors = showErrors && snapshot ? validateExamAnswers(snapshot, answers) : {};

  useEffect(() => {
    let cancelled = false;
    async function open() {
      await Promise.resolve();
      if (cancelled || locked || encounter.is_active === false) return;
      const existing = records[0] ?? null;
      if (existing) {
        setCurrent((previous) =>
          previous && previous.uuid === existing.uuid && (previous.row_version ?? 0) >= (existing.row_version ?? 0)
            ? previous
            : existing,
        );
        const envelope = existing.responses_json?.[responseKey] as ExamTemplateResponseEnvelope | undefined;
        setAnswers(envelope?.answers ?? emptyExamTemplateAnswers());
        return;
      }
      try {
        const created = family === "employee"
          ? await createOhEmployeeFormResponse({ encounter: encounter.id })
          : await createOhCofResponse({ encounter: encounter.id });
        if (cancelled) return;
        setCurrent(created);
        const envelope = created.responses_json?.[responseKey] as ExamTemplateResponseEnvelope | undefined;
        setAnswers(envelope?.answers ?? emptyExamTemplateAnswers());
        onSavedRef.current();
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "This form could not be opened.");
        }
      }
    }
    void open();
    return () => {
      cancelled = true;
    };
  }, [encounter.id, encounter.is_active, family, locked, recordKey, recordVersion, records, responseKey]);

  async function persist(next: ExamTemplateAnswers, requireComplete: boolean) {
    const active = currentRef.current;
    if (!active || !snapshot || encounter.is_active === false) return false;
    if (requireComplete) {
      const nextErrors = validateExamAnswers(snapshot, next);
      if (Object.keys(nextErrors).length) {
        setShowErrors(true);
        setMessage("Review the highlighted responses before continuing.");
        requestAnimationFrame(() => focusFirstExamError(formRef.current, nextErrors));
        return false;
      }
    }
    const envelope: ExamTemplateResponseEnvelope = {
      template_uuid: active.template_uuid ?? "",
      template_version_uuid: active.template_version_uuid ?? "",
      template_name: undefined,
      version_number: active.template_version_number ?? null,
      answers: next,
    };
    setSaving(true);
    try {
      const payload = {
        responses_json: { ...(active.responses_json ?? {}), [responseKey]: envelope },
        row_version: active.row_version ?? 1,
      };
      const updated = family === "employee"
        ? await patchOhEmployeeFormResponses(active.uuid, payload)
        : await patchOhCofResponses(active.uuid, payload);
      setCurrent(updated);
      currentRef.current = updated;
      setMessage(null);
      onSavedRef.current();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This form could not be saved.");
      toast({
        variant: "error",
        title: "Could not save this form",
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    answersRef.current = answers;
    currentRef.current = current;
    onSavedRef.current = onSaved;
    if (!completionRef) return;
    completionRef.current = async () => {
      if (locked || encounter.is_active === false) return false;
      return persist(answersRef.current, true);
    };
    return () => {
      completionRef.current = null;
    };
  });

  if (locked) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-dash-muted" data-testid={`oh-${family}-step-locked`}>
        Save the previous step before opening {title.toLowerCase()}.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid={`oh-${family}-step`}>
      <div className="flex items-center justify-between gap-3 border-b border-dash-border px-5 py-3">
        <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
        <PrimaryButton
          type="button"
          disabled={saving || encounter.is_active === false || !snapshot}
          onClick={() => void persist(answers, false)}
        >
          {saving ? "Saving…" : "Save"}
        </PrimaryButton>
      </div>
      {message ? <p role="alert" className="px-5 py-3 text-sm text-red-700">{message}</p> : null}
      <div ref={formRef} className="min-h-0 flex-1 overflow-y-auto px-5">
        {snapshot ? (
          <OhExamTemplateCaptureForm snapshot={snapshot} value={answers} onChange={setAnswers} disabled={encounter.is_active === false || saving} errors={errors} />
        ) : (
          <p className="py-6 text-sm text-dash-muted">Opening the published form.</p>
        )}
      </div>
    </div>
  );
}
