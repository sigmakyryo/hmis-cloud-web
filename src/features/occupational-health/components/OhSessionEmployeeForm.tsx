"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import dynamic from "next/dynamic";
import { useMutation } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { OhExamTemplateCaptureForm } from "@/features/occupational-health/components/OhExamTemplateCaptureForm";
import {
  hasCompleteExamDefinitions,
  parseExamTemplateSnapshot,
  type ExamTemplateAnswers,
} from "@/features/occupational-health/lib/exam-template-snapshot";
import { summarizeExamAnswers } from "@/features/occupational-health/lib/oh-session-forms";
import {
  createOhEmployeeFormInvite,
  createOhEmployeeFormResponse,
  patchOhEmployeeFormResponses,
  reopenOhEmployeeFormResponse,
} from "@/features/occupational-health/services/oh.service";
import type { OhTemplateCapture, OhVisitEncounter } from "@/features/occupational-health/types";
import { employeeFormExportUrl } from "@/features/occupational-health/services/oh-ext.service";
import { ROUTES } from "@/constants/routes";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { appFont } from "@/lib/fonts";
import { useToast } from "@/providers/toast-provider";

const EmployeeInviteQr = dynamic(() => import("qrcode.react").then((module) => module.QRCodeSVG), {
  loading: () => <p role="status">Loading QR code…</p>,
});

type OhSessionEmployeeFormProps = {
  encounter: OhVisitEncounter;
  records: OhTemplateCapture[];
  continueRef?: { current: (() => Promise<boolean>) | null };
  onSaved: () => Promise<unknown>;
};

type Mode = "actions" | "manual";

export function OhSessionEmployeeForm({
  encounter,
  records,
  continueRef,
  onSaved,
}: OhSessionEmployeeFormProps) {
  const existing = records.find((row) => row.is_active !== false) ?? null;
  const [created, setCreated] = useState<OhTemplateCapture | null>(null);
  const form = existing ?? created;
  const snapshot = parseExamTemplateSnapshot(form?.template_snapshot ?? null);
  const incomplete = Boolean(snapshot && !hasCompleteExamDefinitions(snapshot));
  const envelope = form?.responses_json?.__employee_form__ as { answers?: ExamTemplateAnswers } | undefined;
  const [answers, setAnswers] = useState<ExamTemplateAnswers | null>(null);
  const currentAnswers = useMemo(
    () => answers ?? envelope?.answers ?? { picks: {}, fields: {} },
    [answers, envelope?.answers],
  );
  const submitted = form?.status === "submitted" || form?.status === "uploaded";
  const summaryRows = useMemo(
    () => summarizeExamAnswers(snapshot, envelope?.answers),
    [snapshot, envelope?.answers],
  );
  const [editing, setEditing] = useState(false);
  const mode: Mode = editing ? "manual" : "actions";
  const showSummary = submitted && summaryRows.length > 0 && !editing;
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const { toast } = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const formRef = useRef(form);
  const answersRef = useRef(currentAnswers);
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    formRef.current = form;
    answersRef.current = currentAnswers;
    onSavedRef.current = onSaved;
  }, [form, currentAnswers, onSaved]);

  const refresh = async (record?: OhTemplateCapture) => {
    if (record) setCreated(record);
    setAnswers(null);
    await onSaved();
  };

  const ensureRecord = async () => {
    if (form) return form;
    const record = await createOhEmployeeFormResponse({ encounter: encounter.id });
    setCreated(record);
    await onSaved();
    return record;
  };

  const manual = useMutation({
    mutationFn: ensureRecord,
    onSuccess: () => {
      setEditing(true);
      setMessage(null);
    },
  });

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      const active = formRef.current ?? (await ensureRecord());
      return patchOhEmployeeFormResponses(active.uuid, {
        row_version: active.row_version ?? 1,
        submit,
        responses_json: {
          __employee_form__: {
            ...(active.responses_json?.__employee_form__ as object | undefined),
            answers: answersRef.current,
          },
        },
      });
    },
    onSuccess: async (record) => {
      await refresh(record);
      setEditing(false);
      setMessage(null);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "The answers could not be saved.");
    },
  });

  const reopen = useMutation({
    mutationFn: async () => {
      const active = formRef.current ?? (await ensureRecord());
      if (active.status === "submitted" || active.status === "uploaded") {
        return reopenOhEmployeeFormResponse(active.uuid, { row_version: active.row_version ?? 1 });
      }
      return active;
    },
    onSuccess: async (record) => {
      await refresh(record);
      setEditing(true);
      setMessage(null);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "This form could not be reopened.");
    },
  });

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ variant: "success", title: "Link copied to clipboard" });
    } catch {
      toast({
        variant: "error",
        title: "Could not copy link",
        description: "Select the link to copy it manually.",
      });
    }
  }

  const link = useMutation({
    mutationFn: async (_action: "copy" | "qr" | "show") => {
      const record = await ensureRecord();
      const invite = await createOhEmployeeFormInvite(record.uuid);
      return `${window.location.origin}${ROUTES.workforceForm(invite.token)}`;
    },
    onSuccess: (url, action) => {
      setPublicLink(url);
      setMessage(null);
      if (action === "qr") setQrOpen(true);
      if (action === "copy") void copyLink(url);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Could not create the employee form link.");
    },
  });

  function share(action: "copy" | "qr" | "show") {
    if (!publicLink) {
      link.mutate(action);
      return;
    }
    if (action === "qr") setQrOpen(true);
    if (action === "copy") void copyLink(publicLink);
  }

  const shareDisabled = link.isPending || submitted || encounter.is_active === false || form?.template_available === false;

  useEffect(() => {
    if (!continueRef) return;
    continueRef.current = async () => {
      if (encounter.is_active === false) return false;
      if (mode === "manual") {
        const saved = await save.mutateAsync(false).then(() => true).catch(() => false);
        return saved;
      }
      return true;
    };
    return () => {
      continueRef.current = null;
    };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="oh-session-employee-form">
      <div className="flex items-center justify-between gap-3 border-b border-dash-border px-5 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-primary">Employee form</p>
          <h2 className="text-sm font-semibold text-brand-navy">
            {submitted ? "Submitted details" : "Collect employee details"}
          </h2>
        </div>
        {submitted && form ? (
          <SecondaryButton asChild>
            <a href={employeeFormExportUrl(form.uuid)} target="_blank" rel="noreferrer">
              {form.status === "uploaded" ? "Download document" : "Export PDF"}
            </a>
          </SecondaryButton>
        ) : null}
        {showSummary && encounter.is_active !== false ? (
          <SecondaryButton type="button" disabled={reopen.isPending} onClick={() => reopen.mutate()}>
            {reopen.isPending ? "Opening…" : "Edit"}
          </SecondaryButton>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {message ? <p className="mb-3 text-sm text-red-700" role="alert">{message}</p> : null}

        {showSummary ? (
          <div className="space-y-3" data-testid="oh-session-employee-summary">
            {summaryRows.length ? (
              <dl className="divide-y divide-dash-border border-y border-dash-border">
                {summaryRows.map((row) => (
                  <div key={row.key} className="grid gap-1 py-3 sm:grid-cols-[minmax(10rem,14rem)_1fr] sm:gap-4">
                    <dt className="text-[13px] font-medium text-brand-navy">{row.label}</dt>
                    <dd className="text-[13px] text-brand-slate">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-dash-muted">No answers were recorded on this form yet.</p>
            )}
          </div>
        ) : null}

        {!showSummary && mode === "actions" ? (
          <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
            <Choice
              title="Enter manually"
              detail="Fill the questions for this visit here."
              disabled={manual.isPending || encounter.is_active === false}
              onClick={() => manual.mutate()}
            />
            <section className="mt-2 rounded-xl border border-dash-border bg-dash-canvas p-4" aria-label="Share employee form">
              <h3 className="text-sm font-semibold text-brand-navy">Share employee form</h3>
              <p className="mt-1 text-[13px] text-dash-muted">Let the employee complete the form on their own device.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <SecondaryButton type="button" disabled={shareDisabled || Boolean(publicLink)} onClick={() => share("show")}>
                  <ExternalLink className="size-4" aria-hidden="true" /> Create link
                </SecondaryButton>
                <SecondaryButton type="button" disabled={shareDisabled} onClick={() => share("copy")}>
                  <Copy className="size-4" aria-hidden="true" /> Copy link
                </SecondaryButton>
                <SecondaryButton type="button" disabled={shareDisabled} onClick={() => share("qr")}>
                  <QrCode className="size-4" aria-hidden="true" /> Show QR code
                </SecondaryButton>
              </div>
              {link.isPending ? <p className="mt-3 text-sm text-dash-muted" role="status">Creating link…</p> : null}
              {publicLink ? (
                <p className="mt-3 select-all break-all rounded-md border border-dash-border bg-white px-3 py-2 text-[13px] text-brand-primary" data-testid="oh-session-employee-link">
                  {publicLink}
                </p>
              ) : null}
            </section>
            <Dialog open={qrOpen && !submitted && encounter.is_active !== false && form?.template_available !== false} onOpenChange={setQrOpen}>
              <DialogContent className={appFont.className}>
                <DialogHeader>
                  <DialogTitle>Employee form QR code</DialogTitle>
                  <DialogDescription>Ask the employee to scan this code with their phone camera.</DialogDescription>
                </DialogHeader>
                {publicLink ? (
                  <div className="mx-auto rounded-xl border border-dash-border bg-white p-2">
                    <EmployeeInviteQr value={publicLink} size={224} marginSize={4} role="img" aria-label="Employee form QR code" />
                  </div>
                ) : null}
                <SecondaryButton type="button" onClick={() => share("copy")}>
                  <Copy className="size-4" aria-hidden="true" /> Copy link
                </SecondaryButton>
              </DialogContent>
            </Dialog>
            {incomplete ? (
              <p className="text-sm text-dash-muted">
                This form needs updated fields from Occupational Health settings before it can be completed.
              </p>
            ) : null}
          </div>
        ) : null}

        {mode === "manual" ? (
          <div className="space-y-4">
            {snapshot && !incomplete ? (
              <OhExamTemplateCaptureForm
                snapshot={snapshot}
                value={currentAnswers}
                disabled={save.isPending || encounter.is_active === false}
                onChange={setAnswers}
                billingCharges={form?.billing_charges ?? []}
              />
            ) : incomplete ? (
              <p className="text-sm text-dash-muted">
                Ask an administrator to publish the configured fields, then reopen this form.
              </p>
            ) : (
              <p className="text-sm text-dash-muted">This form has no questions to fill yet.</p>
            )}
          </div>
        ) : null}
      </div>

      {mode === "manual" ? (
        <div className="flex justify-end gap-2 border-t border-dash-border px-5 py-4">
          <SecondaryButton type="button" onClick={() => setEditing(false)}>
            Back
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => save.mutate(false)} disabled={save.isPending}>
            Save
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => save.mutate(true)} disabled={save.isPending}>
            Submit
          </PrimaryButton>
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
      className="flex w-full flex-col border-b border-dash-border px-1 py-3 text-left last:border-b-0 hover:bg-brand-tint/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="text-[13px] font-medium text-brand-navy">{title}</span>
      <span className="text-[12px] text-dash-muted">{detail}</span>
    </button>
  );
}
