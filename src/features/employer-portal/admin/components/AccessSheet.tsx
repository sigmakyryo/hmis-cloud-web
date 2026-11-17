"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { ImmNotice } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { errorText } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  BillingAccountPicker,
  ScopeCheckboxes,
  accessFieldClass,
  type BillingAccount,
} from "@/features/employer-portal/admin/components/AccessFields";
import { invitePortalContact, type PortalInviteResult, type PortalScope } from "@/features/employer-portal/services/employer-portal.service";
import { fetchOhEmployers } from "@/features/occupational-health/services/oh.service";
import { useToast } from "@/providers/toast-provider";

type Mode = "invite" | "details";

export type AccessPrefill = { email: string; name?: string; employerUuid: string; scopes: PortalScope[] };

const DEFAULT_SCOPES: PortalScope[] = ["fitness", "random_compliance"];

const CHOICES: Array<{ mode: Mode; title: string; description: string }> = [
  { mode: "invite", title: "Invite by email", description: "Just their email and company. They get a link and set their own password." },
  { mode: "details", title: "Enter details", description: "Add their name, what they can see and the billing accounts for invoices. They still set their own password." },
];

/** Builds the invite payload. Both paths use it, details only adds the name and billing accounts. */
export function buildInviteBody(input: {
  mode: Mode;
  email: string;
  name: string;
  employerUuid: string;
  scopes: PortalScope[];
  accounts: BillingAccount[];
}) {
  const email = input.email.trim();
  if (!email || !input.employerUuid) {
    throw new Error("Enter the email and choose the employer.");
  }
  if (input.scopes.length === 0) {
    throw new Error("Choose at least one thing they can see.");
  }
  const base = { email, employer_uuid: input.employerUuid, scopes: input.scopes };
  if (input.mode === "invite") {
    return base;
  }
  return {
    ...base,
    name: input.name.trim() || undefined,
    billing_customer_uuids: input.scopes.includes("invoices") ? input.accounts.map((account) => account.uuid) : undefined,
  };
}

export function AccessSheet({ prefill, onClose }: { prefill?: AccessPrefill; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const [mode, setMode] = useState<Mode | null>(prefill ? "invite" : null);
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [name, setName] = useState(prefill?.name ?? "");
  const [employer, setEmployer] = useState(prefill?.employerUuid ?? "");
  const [scopes, setScopes] = useState<PortalScope[]>(prefill?.scopes ?? DEFAULT_SCOPES);
  const [accounts, setAccounts] = useState<BillingAccount[]>([]);
  const [result, setResult] = useState<PortalInviteResult | null>(null);
  const employers = useQuery({ queryKey: ["oh", "employers", "all"], queryFn: fetchOhEmployers, retry: false });

  const send = useMutation({
    mutationFn: () => {
      if (!mode) throw new Error("Choose how to add them first.");
      return invitePortalContact(buildInviteBody({ mode, email, name, employerUuid: employer, scopes, accounts }));
    },
    onSuccess: (next) => {
      void client.invalidateQueries({ queryKey: ["oh-portal-admin"] });
      setResult(next);
      toast({
        variant: "success",
        title: next.linked ? "Existing login linked" : next.invite?.email_sent ? "Invitation emailed" : "Invitation created",
        description: next.linked
          ? "They can sign in now."
          : next.invite?.email_sent
            ? "They set a password from the email, then sign in on the company portal."
            : "Email is not set up. Share the link in this sheet.",
      });
    },
    onError: (error) => toast({ variant: "error", title: "Not sent", description: errorText(error) }),
  });

  const description = result ? "Done" : mode ? CHOICES.find((choice) => choice.mode === mode)?.description : "How do you want to add them?";

  return (
    <Drawer title="Give access" description={description ?? ""} onClose={onClose}>
      <div className="space-y-4 text-[13px]" data-testid="oh-portal-access-sheet">
        {result ? (
          <>
            <p>{result.linked ? "They already had a login. It is linked to this employer." : `Invitation for ${email.trim()} is ready.`}</p>
            {!result.linked && result.accept_url ? (
              <ImmNotice>
                One-time link (shown once): <span className="break-all font-mono text-[12px]" data-testid="oh-portal-contact-invite-link">{result.accept_url}</span>
              </ImmNotice>
            ) : null}
            <DrawerActions>
              <PageActionButton onClick={onClose}>Done</PageActionButton>
            </DrawerActions>
          </>
        ) : !mode ? (
          <div className="grid gap-3">
            {CHOICES.map((choice) => (
              <button
                key={choice.mode}
                type="button"
                onClick={() => setMode(choice.mode)}
                className="rounded-xl border border-dash-border p-4 text-left transition-colors hover:border-brand-primary hover:bg-brand-primary/5"
              >
                <span className="block text-[14px] font-medium text-brand-navy">{choice.title}</span>
                <span className="mt-1 block text-dash-muted">{choice.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            {mode === "details" ? (
              <label className="block space-y-1">
                <span className="text-dash-muted">Name</span>
                <input aria-label="Name" className={accessFieldClass} value={name} onChange={(event) => setName(event.target.value)} />
              </label>
            ) : null}
            <label className="block space-y-1">
              <span className="text-dash-muted">Login email</span>
              <input aria-label="Login email" type="email" className={accessFieldClass} value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-dash-muted">Employer</span>
              <select aria-label="Employer" className={accessFieldClass} value={employer} onChange={(event) => setEmployer(event.target.value)}>
                <option value="">Choose…</option>
                {(employers.data ?? []).map((item) => (
                  <option key={item.uuid} value={item.uuid}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {employers.isError ? <p className="text-destructive">{errorText(employers.error, "Could not load employers.")}</p> : null}
            <ScopeCheckboxes chosen={scopes} onChange={setScopes} />
            {mode === "details" && scopes.includes("invoices") ? <BillingAccountPicker accounts={accounts} onChange={setAccounts} /> : null}
            <DrawerActions>
              {prefill ? null : (
                <SecondaryButton onClick={() => setMode(null)} disabled={send.isPending}>
                  Back
                </SecondaryButton>
              )}
              <PageActionButton disabled={send.isPending} onClick={() => send.mutate()}>
                {send.isPending ? "Sending…" : "Send invitation"}
              </PageActionButton>
            </DrawerActions>
          </>
        )}
      </div>
    </Drawer>
  );
}
