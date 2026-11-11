"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { ImmPrimaryCell, ImmRecordTable, ImmRowAction, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmNotice } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { errorText, fmtDate } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import {
  PORTAL_SCOPES,
  PORTAL_SCOPE_LABEL,
  fetchPortalBranding,
  fetchPortalInvitations,
  invitePortalContact,
  revokePortalInvitation,
  savePortalBranding,
  type PortalBranding,
  type PortalScope,
} from "@/features/employer-portal/services/employer-portal.service";
import { fetchOhEmployers } from "@/features/occupational-health/services/oh.service";
import { useToast } from "@/providers/toast-provider";

const field = "h-9 w-full rounded-md border border-dash-border px-2.5 text-[13px]";

export function PortalInvitationsPanel() {
  const { toast } = useToast();
  const client = useQueryClient();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [employer, setEmployer] = useState("");
  const [scopes, setScopes] = useState<PortalScope[]>(["fitness", "random_compliance"]);
  const [link, setLink] = useState("");
  const employers = useQuery({ queryKey: ["oh", "employers", "all"], queryFn: fetchOhEmployers, retry: false });
  const list = useQuery({ queryKey: ["oh-portal-admin", "invitations"], queryFn: fetchPortalInvitations, retry: false });

  const send = useMutation({
    mutationFn: () => {
      if (!email.trim() || !employer) throw new Error("Enter the email and choose the employer.");
      return invitePortalContact({ email: email.trim(), name: name.trim() || undefined, employer_uuid: employer, scopes });
    },
    onSuccess: (res) => {
      if (res.linked) {
        toast({ variant: "success", title: "Existing login linked", description: "They can sign in now." });
        setLink("");
      } else {
        toast({
          variant: "success",
          title: res.invite?.email_sent ? "Invitation emailed" : "Invitation created",
          description: res.invite?.email_sent ? undefined : "Email is not set up: share the link below with them.",
        });
        setLink(res.accept_url ?? "");
      }
      setEmail("");
      setName("");
      void client.invalidateQueries({ queryKey: ["oh-portal-admin"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not sent", description: errorText(error) }),
  });
  const revoke = useMutation({
    mutationFn: (uuid: string) => revokePortalInvitation(uuid),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["oh-portal-admin", "invitations"] }),
    onError: (error) => toast({ variant: "error", title: "Not revoked", description: errorText(error) }),
  });
  const toggle = (s: PortalScope) => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div className="space-y-5 text-[13px]" data-testid="oh-portal-invitations">
      <div className="grid max-w-xl gap-3">
        <label className="space-y-1">
          <span className="text-dash-muted">Email</span>
          <input aria-label="Invite email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-dash-muted">Name</span>
          <input aria-label="Invite name" className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-dash-muted">Employer</span>
          <select aria-label="Invite employer" className={field} value={employer} onChange={(e) => setEmployer(e.target.value)}>
            <option value="">Choose…</option>
            {(employers.data ?? []).map((e) => (
              <option key={e.uuid} value={e.uuid}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-wrap gap-3">
          {PORTAL_SCOPES.map((s) => (
            <label key={s} className="flex items-center gap-1.5">
              <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)} />
              {PORTAL_SCOPE_LABEL[s]}
            </label>
          ))}
        </fieldset>
        <div>
          <SecondaryButton disabled={send.isPending} onClick={() => send.mutate()}>
            Send invitation
          </SecondaryButton>
        </div>
        {link ? (
          <ImmNotice>
            One-time link (shown once): <span className="break-all font-mono text-[12px]" data-testid="oh-portal-invite-link">{link}</span>
          </ImmNotice>
        ) : null}
      </div>
      {list.isLoading ? <QuietLoading /> : null}
      {list.isError ? <LoadError>{errorText(list.error, "Could not load invitations.")}</LoadError> : null}
      {list.isSuccess && list.data.length > 0 ? (
        <ImmRecordTable columns={["Person", "Employer", "Status", "Expires", "Actions"]}>
          {list.data.map((i) => (
            <DaRow key={i.uuid} testId="oh-portal-invite-row">
              <DaCell first>
                <ImmPrimaryCell title={i.name || i.email} detail={i.name ? i.email : undefined} />
              </DaCell>
              <DaCell>{i.employer_name || "—"}</DaCell>
              <DaCell>
                <ImmStatusBadge status={i.status === "accepted" ? "cleared" : i.status === "pending" ? "pending" : "planned"} label={i.status} />
              </DaCell>
              <DaCell>{fmtDate(i.expires_at)}</DaCell>
              <DaCell actions>
                {i.status === "pending" ? (
                  <ImmRowAction disabled={revoke.isPending} onClick={() => revoke.mutate(i.uuid)}>
                    Revoke
                  </ImmRowAction>
                ) : null}
              </DaCell>
            </DaRow>
          ))}
        </ImmRecordTable>
      ) : null}
    </div>
  );
}

function readDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function PortalBrandingPanel() {
  const { toast } = useToast();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["oh-portal-admin", "branding"], queryFn: fetchPortalBranding, retry: false });
  const [edits, setEdits] = useState<Partial<PortalBranding>>({});
  const form = useMemo(() => ({ ...(query.data ?? {}), ...edits }) as Partial<PortalBranding>, [query.data, edits]);
  const save = useMutation({
    mutationFn: () => savePortalBranding(edits),
    onSuccess: () => {
      toast({ variant: "success", title: "Branding saved" });
      setEdits({});
      void client.invalidateQueries({ queryKey: ["oh-portal-admin", "branding"] });
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });
  const set = (k: keyof PortalBranding, v: string | null) => setEdits((cur) => ({ ...cur, [k]: v }));

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > 200_000) {
      toast({ variant: "error", title: "Logo too large", description: "Use an image under 200 KB." });
      return;
    }
    set("logo_data_uri", await readDataUri(file));
  }

  if (query.isLoading) return <QuietLoading />;
  if (query.isError) return <LoadError>{errorText(query.error, "Could not load branding.")}</LoadError>;
  return (
    <div className="grid max-w-xl gap-3 text-[13px]" data-testid="oh-portal-branding">
      <label className="space-y-1">
        <span className="text-dash-muted">Name shown to employers</span>
        <input aria-label="Display name" className={field} value={form.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} />
      </label>
      <label className="space-y-1">
        <span className="text-dash-muted">Accent colour</span>
        <input aria-label="Accent colour" type="color" value={form.accent_color || "#1f6feb"} onChange={(e) => set("accent_color", e.target.value)} />
      </label>
      <label className="space-y-1">
        <span className="text-dash-muted">Logo (PNG, JPEG or SVG, under 200 KB)</span>
        <input aria-label="Logo" type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => void pickLogo(e.target.files?.[0])} />
      </label>
      {form.logo_data_uri ? (
        // eslint-disable-next-line @next/next/no-img-element -- preview of the inline logo
        <img src={form.logo_data_uri} alt="Logo preview" className="h-10 w-auto" />
      ) : null}
      <label className="space-y-1">
        <span className="text-dash-muted">Welcome text on the sign-in and invitation pages</span>
        <textarea aria-label="Welcome text" className="w-full rounded-md border border-dash-border p-2.5" rows={3} value={form.welcome_text ?? ""} onChange={(e) => set("welcome_text", e.target.value)} />
      </label>
      <label className="space-y-1">
        <span className="text-dash-muted">Support email</span>
        <input aria-label="Support email" className={field} value={form.support_email ?? ""} onChange={(e) => set("support_email", e.target.value)} />
      </label>
      <div>
        <SecondaryButton disabled={save.isPending || Object.keys(edits).length === 0} onClick={() => save.mutate()}>
          Save branding
        </SecondaryButton>
      </div>
    </div>
  );
}
