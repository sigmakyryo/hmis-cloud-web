"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Copy, ExternalLink, Mail, PenLine, QrCode, type LucideIcon } from "lucide-react";
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
import { SendFormEmailDialog } from "@/features/occupational-health/components/SendFormEmailDialog";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

const EmployeeInviteQr = dynamic(() => import("qrcode.react").then((module) => module.QRCodeSVG), {
  loading: () => <p role="status">Loading QR code…</p>,
});

const SHARE_ACTIONS: ReadonlyArray<{ key: "email" | "link" | "copy" | "qr"; label: string; icon: LucideIcon }> = [
  { key: "email", label: "Send email", icon: Mail },
  { key: "link", label: "Create link", icon: ExternalLink },
  { key: "copy", label: "Copy link", icon: Copy },
  { key: "qr", label: "Show QR code", icon: QrCode },
];

type OhSessionEmployeeFormProps = {
  encounter: OhVisitEncounter;
  records: OhTemplateCapture[];
  continueRef?: { current: (() => Promise<boolean>) | null };
  onSaved: () => Promise<unknown>;
  /** Sheet layout: no second title, and the share actions are not boxed. */
  embedded?: boolean;
  /** Fired when the questions open or close, so a sheet can change width. */
  onEditingChange?: (editing: boolean) => void;
};

type Mode = "actions" | "manual";

export function OhSessionEmployeeForm({
  encounter,
  records,
  continueRef,
  onSaved,
  embedded = false,
  onEditingChange,
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
  function setManual(next: boolean) {
    setEditing(next);
    onEditingChange?.(next);
  }
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
      setManual(true);
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
      setManual(false);
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
      setManual(true);
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

  const [emailOpen, setEmailOpen] = useState(false);
  const link = useMutation({
    mutationFn: async (action: "copy" | "qr" | "show" | "email") => {
      const record = await ensureRecord();
      const invite = action === "email" ? await createOhEmployeeFormInvite(record.uuid, true) : await createOhEmployeeFormInvite(record.uuid);
      return `${window.location.origin}${ROUTES.workforceForm(invite.token)}`;
    },
    onSuccess: (url, action) => {
      setPublicLink(url);
      setMessage(null);
      if (action === "email") toast({ variant: "success", title: "Form sent to the employee’s email" });
      if (action === "qr") setQrOpen(true);
      if (action === "copy") void copyLink(url);
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Could not create the employee form link.");
    },
  });

  function share(action: "copy" | "qr" | "show" | "email") {
    if (!publicLink || action === "email") {
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

  const showExport = Boolean(submitted && form);
  const showEdit = showSummary && encounter.is_active !== false;

  return (
    <div className={cn("flex flex-col", !embedded && "min-h-0 flex-1")} data-testid="oh-session-employee-form">
      {embedded ? (
        showExport || showEdit ? (
          <div className="flex justify-end gap-2 px-5 pt-4">
            {showExport && form ? (
              <SecondaryButton asChild>
                <a href={employeeFormExportUrl(form.uuid)} target="_blank" rel="noreferrer">
                  {form.status === "uploaded" ? "Download document" : "Export PDF"}
                </a>
              </SecondaryButton>
            ) : null}
            {showEdit ? (
              <SecondaryButton type="button" disabled={reopen.isPending} onClick={() => reopen.mutate()}>
                {reopen.isPending ? "Opening…" : "Edit"}
              </SecondaryButton>
            ) : null}
          </div>
        ) : null
      ) : (
        <div className="flex items-center justify-between gap-3 border-b border-dash-border px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-primary">Employee form</p>
            <h2 className="text-sm font-semibold text-brand-navy">
              {submitted ? "Submitted details" : "Collect employee details"}
            </h2>
          </div>
          <div className="flex gap-2">
            {showExport && form ? (
              <SecondaryButton asChild>
                <a href={employeeFormExportUrl(form.uuid)} target="_blank" rel="noreferrer">
                  {form.status === "uploaded" ? "Download document" : "Export PDF"}
                </a>
              </SecondaryButton>
            ) : null}
            {showEdit ? (
              <SecondaryButton type="button" disabled={reopen.isPending} onClick={() => reopen.mutate()}>
                {reopen.isPending ? "Opening…" : "Edit"}
              </SecondaryButton>
            ) : null}
          </div>
        </div>
      )}

      <div className={cn("px-5 py-5", !embedded && "min-h-0 flex-1 overflow-y-auto")}>
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
          <div className={cn("flex w-full flex-col", embedded ? "gap-8" : "mx-auto max-w-xl gap-2")}>
            {embedded ? (
              <button
                type="button"
                disabled={manual.isPending || encounter.is_active === false}
                onClick={() => manual.mutate()}
                className="group flex w-full items-center gap-4 rounded-xl border border-dash-border bg-white px-4 py-4 text-left transition-colors hover:border-brand-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-dash-border bg-white text-brand-navy">
                  <PenLine className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-brand-navy">Enter manually</span>
                  <span className="mt-0.5 block text-sm text-dash-muted">Fill the questions for this visit here.</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-dash-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-primary" aria-hidden />
              </button>
            ) : (
              <Choice
                title="Enter manually"
                detail="Fill the questions for this visit here."
                disabled={manual.isPending || encounter.is_active === false}
                onClick={() => manual.mutate()}
              />
            )}
            <section
              aria-label="Share employee form"
              className={embedded ? undefined : "mt-2 rounded-xl border border-dash-border bg-dash-canvas p-4"}
            >
              <h3 className="text-sm font-semibold text-brand-navy">Share employee form</h3>
              <p className="mt-1 text-sm text-dash-muted">Let the employee complete the form on their own device.</p>
              <div className={cn("mt-4", embedded ? "grid grid-cols-2 gap-2" : "mt-3 flex flex-wrap gap-2")}>
                {SHARE_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const disabled =
                    shareDisabled || (action.key === "link" && Boolean(publicLink));
                  const onClick = () => {
                    if (action.key === "email") setEmailOpen(true);
                    else if (action.key === "link") share("show");
                    else share(action.key);
                  };
                  return embedded ? (
                    <button
                      key={action.key}
                      type="button"
                      disabled={disabled}
                      onClick={onClick}
                      className="flex flex-col items-start gap-3 rounded-xl border border-dash-border bg-white px-3.5 py-3.5 text-left transition-colors hover:border-brand-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg border border-dash-border bg-white text-brand-navy">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="text-sm font-medium text-brand-navy">{action.label}</span>
                    </button>
                  ) : (
                    <SecondaryButton key={action.key} type="button" disabled={disabled} onClick={onClick}>
                      <Icon className="size-4" aria-hidden /> {action.label}
                    </SecondaryButton>
                  );
                })}
              </div>
              {link.isPending ? <p className="mt-3 text-sm text-dash-muted" role="status">Creating link…</p> : null}
              {publicLink ? (
                <p className="mt-3 select-all break-all rounded-xl border border-dash-border bg-white px-3 py-2.5 text-sm text-brand-primary" data-testid="oh-session-employee-link">
                  {publicLink}
                </p>
              ) : null}
            </section>
            <SendFormEmailDialog
              open={emailOpen}
              onOpenChange={setEmailOpen}
              resolveFormUuid={async () => (await ensureRecord()).uuid}
              onSent={({ token, sentTo }) => {
                setPublicLink(`${window.location.origin}${ROUTES.workforceForm(token)}`);
                setMessage(null);
                toast({ variant: "success", title: sentTo ? `Form sent to ${sentTo}` : "Form sent to the employee’s email" });
              }}
            />
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
          <SecondaryButton type="button" onClick={() => setManual(false)}>
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
  plain = false,
}: {
  title: string;
  detail: string;
  disabled: boolean;
  onClick: () => void;
  plain?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full flex-col text-left disabled:cursor-not-allowed disabled:opacity-60",
        plain
          ? "rounded-md py-1 hover:text-brand-primary"
          : "border-b border-dash-border px-1 py-3 last:border-b-0 hover:bg-brand-tint/30",
      )}
    >
      <span className="text-sm font-medium text-brand-navy">{title}</span>
      <span className="mt-0.5 text-sm text-dash-muted">{detail}</span>
    </button>
  );
}
