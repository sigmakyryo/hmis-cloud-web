"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createOhEmployeeFormInvite,
  fetchOhEmployeeFormInviteRecipient,
} from "@/features/occupational-health/services/oh.service";

const SOURCE_LABEL: Record<string, string> = {
  employee_record: "Email on the employee's record",
  employment_record: "Email captured on their employment",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolves (or opens) the employee form response to send. */
  resolveFormUuid: () => Promise<string>;
  onSent: (result: { token: string; sentTo: string | null }) => void;
};

/** Confirms who an employee form email will reach before it is sent. */
export function SendFormEmailDialog({ open, onOpenChange, resolveFormUuid, onSent }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-w-md" data-testid="oh-send-form-email-dialog">
        <DialogHeader>
          <DialogTitle>Email the employee form</DialogTitle>
          <DialogDescription>
            A secure link to complete the form is sent to the employee. It expires in 14 days and replaces any earlier link.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <SendFormEmailBody
            resolveFormUuid={resolveFormUuid}
            onBusyChange={setBusy}
            onCancel={() => onOpenChange(false)}
            onSent={(result) => {
              onSent(result);
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SendFormEmailBody({
  resolveFormUuid,
  onBusyChange,
  onCancel,
  onSent,
}: {
  resolveFormUuid: () => Promise<string>;
  onBusyChange: (busy: boolean) => void;
  onCancel: () => void;
  onSent: Props["onSent"];
}) {
  const [formUuid, setFormUuid] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveFormUuid()
      .then((uuid) => { if (!cancelled) setFormUuid(uuid); })
      .catch((error: unknown) => {
        if (!cancelled) setResolveError(error instanceof Error ? error.message : "Could not open the employee form.");
      });
    return () => { cancelled = true; };
    // Resolved once each time the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recipient = useQuery({
    queryKey: ["oh-employee-form-invite-recipient", formUuid],
    queryFn: () => fetchOhEmployeeFormInviteRecipient(formUuid as string),
    enabled: formUuid !== null,
  });
  const send = useMutation({
    mutationFn: () => createOhEmployeeFormInvite(formUuid as string, true),
    onMutate: () => onBusyChange(true),
    onSettled: () => onBusyChange(false),
    onSuccess: (invite) => onSent({ token: invite.token, sentTo: invite.sent_to ?? recipient.data?.email ?? null }),
  });

  const email = recipient.data?.email ?? null;
  const loading = !resolveError && (formUuid === null || recipient.isLoading);
  const problem = resolveError
    ?? (recipient.isError ? "Could not load the employee's contact details." : null)
    ?? (recipient.data && !email ? recipient.data.reason ?? "No email address on file." : null);

  return (
    <>
      <div className="rounded-lg border border-dash-border bg-dash-canvas px-3 py-3">
        {loading ? (
          <p className="text-sm text-dash-muted">Looking up the employee&apos;s email…</p>
        ) : problem ? (
          <p className="text-sm text-red-700" role="alert" data-testid="oh-send-form-email-problem">{problem}</p>
        ) : (
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
              <Mail className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-dash-muted">Send to</p>
              <p className="truncate text-sm font-medium text-brand-navy" data-testid="oh-send-form-email-recipient">
                {recipient.data?.name ? `${recipient.data.name} · ` : ""}{email}
              </p>
              {recipient.data?.source ? (
                <p className="text-xs text-dash-muted">{SOURCE_LABEL[recipient.data.source] ?? ""}</p>
              ) : null}
            </div>
          </div>
        )}
      </div>
      {send.isError ? (
        <p className="text-sm text-red-700" role="alert">
          {send.error instanceof Error ? send.error.message : "The email could not be sent."}
        </p>
      ) : null}
      <DialogFooter>
        <SecondaryButton type="button" disabled={send.isPending} onClick={onCancel}>Cancel</SecondaryButton>
        <PrimaryButton type="button" disabled={!email || send.isPending} onClick={() => send.mutate()} data-testid="oh-send-form-email-confirm">
          {send.isPending ? "Sending…" : "Send email"}
        </PrimaryButton>
      </DialogFooter>
    </>
  );
}
