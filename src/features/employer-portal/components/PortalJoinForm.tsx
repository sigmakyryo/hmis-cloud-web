"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ROUTES } from "@/constants/routes";
import { pickPortalLogo } from "@/features/employer-portal/utils/portal-logo";
import { PortalEntryCard } from "@/features/employer-portal/components/PortalEntryCard";
import {
  PortalField,
  PortalFormSkeleton,
  PortalPasswordField,
  PortalSubmitButton,
} from "@/features/employer-portal/components/PortalFormControls";
import { acceptInvitation, fetchInvitation, fetchWorkspace } from "@/features/employer-portal/services/employer-portal-public.service";
import type { PortalInviteInfo } from "@/features/employer-portal/services/employer-portal.service";

export function PortalJoinForm({ token, workspace }: { token: string; workspace?: string }) {
  const router = useRouter();
  const [orgLogo, setOrgLogo] = useState("");
  const [info, setInfo] = useState<PortalInviteInfo | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    async function loadOrganisationLogo(key: string) {
      try {
        const clinic = await fetchWorkspace(key);
        if (!cancelled) {
          setOrgLogo(clinic.logo_url ?? "");
        }
      } catch (caught) {
        console.warn("Could not load the organisation logo for the invitation page.", caught);
      }
    }
    async function load() {
      try {
        const next = await fetchInvitation(token);
        if (cancelled) {
          return;
        }
        if (next.workspace && next.workspace !== workspace) {
          router.replace(`/portal/${next.workspace}/join?token=${encodeURIComponent(token)}`);
          return;
        }
        setInfo(next);
        setName(next.name ?? "");
        if (workspace) {
          await loadOrganisationLogo(workspace);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "This invitation link is not valid.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, token, workspace]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters for the password.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await acceptInvitation({ token, name: name.trim() || undefined, password });
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not accept the invitation.");
    } finally {
      setBusy(false);
    }
  }

  const signInHref = workspace ? `/portal/${workspace}` : ROUTES.employerPortalSignIn;
  const subtitle = info
    ? `Join ${info.employer_name}'s portal at ${info.organisation}`
    : "Checking your invitation…";

  const accent = info?.branding?.accent_color;
  let body = <PortalFormSkeleton fields={4} />;
  if (done) {
    body = (
      <div className="space-y-5 text-center">
        <p className="text-[15px] text-neutral-600">
          Your account is ready. Sign in with <span className="font-medium text-neutral-900">{info?.email}</span> and the
          password you chose.
        </p>
        <Link
          href={signInHref}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#4a78ff] to-[#2f55e8] text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(37,70,210,0.35)]"
          style={accent && /^#[0-9a-f]{6}$/i.test(accent) ? { backgroundColor: accent, backgroundImage: "none" } : undefined}
        >
          Go to sign in
        </Link>
      </div>
    );
  } else if (info) {
    body = (
      <form className="space-y-4" onSubmit={submit}>
        <PortalField id="portal-join-email" label="Email" value={info.email} readOnly />
        <PortalField
          id="portal-join-name"
          label="Name"
          value={name}
          placeholder="Your full name"
          autoComplete="name"
          onValueChange={setName}
        />
        <PortalPasswordField
          id="portal-join-password"
          label="Password"
          value={password}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          onValueChange={setPassword}
        />
        <PortalPasswordField
          id="portal-join-confirm"
          label="Repeat password"
          value={confirm}
          placeholder="Type it again"
          autoComplete="new-password"
          onValueChange={setConfirm}
        />
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <PortalSubmitButton accent={accent} loading={busy}>
          {busy ? "Creating your login…" : "Create my login"}
        </PortalSubmitButton>
      </form>
    );
  } else if (error || !token) {
    body = (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700" role="alert">
        {error || "This invitation link is not valid."}
      </p>
    );
  }

  return (
    <PortalEntryCard
      title="Create your login"
      subtitle={subtitle}
      logo={pickPortalLogo(info?.branding?.logo_data_uri, orgLogo)}
      footer={
        info?.branding?.support_email ? (
          <>
            Need help?{" "}
            <a className="font-medium text-neutral-900" href={`mailto:${info.branding.support_email}`}>
              {info.branding.support_email}
            </a>
          </>
        ) : undefined
      }
      testId="employer-portal-join"
    >
      {body}
    </PortalEntryCard>
  );
}
