"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import {
  emptyExamTemplateAnswers,
  hasCompleteExamDefinitions,
  parseExamTemplateSnapshot,
  type ExamTemplateAnswers,
  type ExamTemplateResponseEnvelope,
} from "@/features/occupational-health/lib/exam-template-snapshot";
import { focusFirstExamError, validateExamAnswers } from "@/features/occupational-health/lib/exam-template-validation";
import {
  createOhCofResponse,
  createOhEmployeeFormResponse,
  fetchOhCofTemplateVersions,
  fetchOhEmployeeFormTemplateVersions,
  patchOhCofResponses,
  patchOhEmployeeFormResponses,
  publishOhCofTemplate,
  publishOhEmployeeFormTemplate,
  recoverOhCofResponseVersion,
  recoverOhEmployeeFormResponseVersion,
} from "@/features/occupational-health/services/oh.service";
import type { OhTemplateCapture, OhVisitEncounter } from "@/features/occupational-health/types";
import { fetchOhImmFitnessGate } from "@/features/occupational-health/services/immunisation.service";
import Link from "next/link";
import { appFont } from "@/lib/fonts";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/providers/user-provider";

type OhVisitTemplateStepProps = {
  family: "employee" | "cof";
  title: string;
  responseKey: string;
  encounter: OhVisitEncounter;
  records: OhTemplateCapture[];
  locked: boolean;
  lockReason?: string;
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
  lockReason = "Save the previous step before opening this form.",
  completionRef,
  onSaved,
}: OhVisitTemplateStepProps) {
  const { toast } = useToast();
  const { userData } = useUser();
  const canConfigure = Boolean(userData?.is_admin);
  const record = records[0] ?? null;
  const [current, setCurrent] = useState<OhTemplateCapture | null>(record);
  const [answers, setAnswers] = useState<ExamTemplateAnswers>(emptyExamTemplateAnswers());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [immWarnings, setImmWarnings] = useState<string[]>([]);
  const [immBlocked, setImmBlocked] = useState<string | null>(null);
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
  const definitionsMissing = Boolean(
    snapshot?.sections.some((section) =>
      section.content_mode === "direct"
        ? section.response_definitions_missing
        : section.items.some((item) => item.response_definitions_missing),
    ),
  );
  const hasEnteredResponses = Object.values(answers.fields).some((values) =>
    Object.values(values).some((value) => String(value ?? "").trim() !== ""),
  );
  const templateUuid = current?.template_uuid ?? null;
  const fitnessGateQuery = useQuery({
    queryKey: ["oh-imm-fitness-gate", encounter.customer_uuid],
    queryFn: () => fetchOhImmFitnessGate(encounter.customer_uuid),
    enabled: family === "cof" && Boolean(encounter.customer_uuid),
  });
  const gateWarnings = useMemo(() => {
    if (family !== "cof" || !fitnessGateQuery.data) return [] as string[];
    const data = fitnessGateQuery.data;
    if (data.mode === "warn" && (data.issues?.length ?? 0) > 0) {
      return data.issues.map((i) => i.message);
    }
    return [] as string[];
  }, [family, fitnessGateQuery.data]);
  const gateBlocked = useMemo(() => {
    if (family !== "cof" || !fitnessGateQuery.data?.blocking) return null as string | null;
    const data = fitnessGateQuery.data;
    return (
      data.issues.map((i) => i.message).join(" ") ||
      "Required vaccines are incomplete before this certificate can continue."
    );
  }, [family, fitnessGateQuery.data]);
  const displayWarnings = immWarnings.length > 0 ? immWarnings : gateWarnings;
  const displayBlocked = immBlocked ?? gateBlocked;
  const versionsQuery = useQuery({
    queryKey: ["oh-template-versions", family, templateUuid],
    queryFn: () =>
      family === "cof"
        ? fetchOhCofTemplateVersions(templateUuid!)
        : fetchOhEmployeeFormTemplateVersions(templateUuid!),
    enabled: Boolean(templateUuid) && definitionsMissing && encounter.is_active !== false,
  });
  const readyReplacement = [...(versionsQuery.data ?? [])]
    .filter(
      (row) =>
        row.status === "published" &&
        hasCompleteExamDefinitions(row.snapshot_json) &&
        row.uuid !== current?.template_version_uuid,
    )
    .sort((a, b) => b.number - a.number || b.id - a.id)[0];

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
        if (family === "cof" && Array.isArray(created.immunisation_warnings)) {
          setImmWarnings(created.immunisation_warnings);
        }
        onSavedRef.current();
      } catch (error) {
        if (!cancelled) {
          const msg = error instanceof Error ? error.message : "This form could not be opened.";
          setMessage(msg);
          if (family === "cof" && /immunisation|immunization|vaccine/i.test(msg)) {
            setImmBlocked(msg);
          }
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
      if (family === "cof" && Array.isArray(updated.immunisation_warnings)) {
        setImmWarnings(updated.immunisation_warnings);
      }
      onSavedRef.current();
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "This form could not be saved.";
      setMessage(msg);
      if (family === "cof" && /immunisation|immunization|vaccine/i.test(msg)) {
        setImmBlocked(msg);
      }
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

  async function loadUpdatedForm() {
    const active = currentRef.current;
    if (!active || !templateUuid || hasEnteredResponses || encounter.is_active === false) return;
    setRecovering(true);
    setRecoveryError(null);
    try {
      if (answersRef.current !== emptyExamTemplateAnswers()) {
        await persist(answersRef.current, false);
      }
      const target =
        readyReplacement ??
        (canConfigure
          ? family === "cof"
            ? await publishOhCofTemplate(templateUuid)
            : await publishOhEmployeeFormTemplate(templateUuid)
          : null);
      if (!target?.uuid) {
        setRecoveryError("Ask an administrator to publish the configured fields, then try again.");
        return;
      }
      const updated =
        family === "cof"
          ? await recoverOhCofResponseVersion(active.uuid, {
              row_version: currentRef.current?.row_version ?? active.row_version ?? 1,
              template_version_uuid: target.uuid,
            })
          : await recoverOhEmployeeFormResponseVersion(active.uuid, {
              row_version: currentRef.current?.row_version ?? active.row_version ?? 1,
              template_version_uuid: target.uuid,
            });
      setCurrent(updated);
      currentRef.current = updated;
      const envelope = updated.responses_json?.[responseKey] as ExamTemplateResponseEnvelope | undefined;
      setAnswers(envelope?.answers ?? emptyExamTemplateAnswers());
      setRecoveryOpen(false);
      onSavedRef.current();
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : "The configured fields could not be loaded.");
    } finally {
      setRecovering(false);
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
      <div className="flex flex-1 flex-col items-start justify-center gap-2 px-5 py-10" data-testid={`oh-${family}-step-locked`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-primary">{title}</p>
        <p className="max-w-md text-sm text-dash-muted">{lockReason}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid={`oh-${family}-step`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dash-border px-5 py-3">
        <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {definitionsMissing && encounter.is_active !== false && !hasEnteredResponses && (canConfigure || readyReplacement) ? (
            <SecondaryButton
              type="button"
              disabled={recovering || saving}
              onClick={() => {
                setRecoveryError(null);
                setRecoveryOpen(true);
              }}
            >
              Load configured fields
            </SecondaryButton>
          ) : null}
          <PrimaryButton
            type="button"
            disabled={saving || encounter.is_active === false || !snapshot}
            onClick={() => void persist(answers, false)}
          >
            {saving ? "Saving…" : "Save"}
          </PrimaryButton>
        </div>
      </div>
      {definitionsMissing && encounter.is_active !== false && !hasEnteredResponses && !(canConfigure || readyReplacement) ? (
        <p className="px-5 py-3 text-sm text-dash-muted" role="status">
          This form needs updated fields from Occupational Health settings before it can be completed.
        </p>
      ) : null}
      {message ? <p role="alert" className="px-5 py-3 text-sm text-red-700">{message}</p> : null}
      <div ref={formRef} className="min-h-0 flex-1 overflow-y-auto px-5">
        {snapshot ? (
          <OhExamTemplateCaptureForm
            snapshot={snapshot}
            value={answers}
            onChange={(next) => {
              setAnswers(next);
              if (showErrors) setShowErrors(false);
            }}
            disabled={encounter.is_active === false || saving}
            errors={errors}
            billingCharges={current?.billing_charges ?? []}
          />
        ) : (
          <p className="py-6 text-sm text-dash-muted">Opening the published form.</p>
        )}
      </div>
      <Dialog
        open={recoveryOpen}
        onOpenChange={(open) => {
          if (!recovering) setRecoveryOpen(open);
        }}
      >
        <DialogContent className={appFont.className}>
          <DialogHeader>
            <DialogTitle>Use updated form fields?</DialogTitle>
            <DialogDescription>
              {readyReplacement
                ? `Use published version ${readyReplacement.number} for this unanswered form.`
                : "Publish the configured fields as a new version and use them for this unanswered form."}{" "}
              Existing entered responses are not changed.
            </DialogDescription>
          </DialogHeader>
          {recoveryError ? <p role="alert" className="text-sm text-red-700">{recoveryError}</p> : null}
          <DialogFooter>
            <SecondaryButton type="button" disabled={recovering} onClick={() => setRecoveryOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="button" disabled={recovering} onClick={() => void loadUpdatedForm()}>
              {recovering ? "Loading fields…" : readyReplacement ? "Use published version" : "Publish and load fields"}
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
