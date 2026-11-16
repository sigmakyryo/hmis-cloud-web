"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ROUTES } from "@/constants/routes";
import { PortalEntryCard } from "@/features/employer-portal/components/PortalEntryCard";
import { acceptInvitation, fetchInvitation } from "@/features/employer-portal/services/employer-portal-public.service";
import type { PortalInviteInfo } from "@/features/employer-portal/services/employer-portal.service";

const fieldClass = "h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-900";

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block space-y-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      <span className="relative block">
        <input
          id={id}
          aria-label={label}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} pr-10`}
        />
        <button
          type="button"
          className="absolute top-1/2 right-2 -translate-y-1/2 text-neutral-500"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

export function PortalJoinForm({ token, workspace }: { token: string; workspace?: string }) {
  const router = useRouter();
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
    ? `${info.employer_name} at ${info.organisation}`
    : "Checking your invitation…";

  let body = <p className="text-sm text-neutral-500">Checking your invitation…</p>;
  if (done) {
    body = (
      <div className="space-y-3 text-sm text-neutral-700">
        <p>Your account is ready. Sign in with {info?.email} and the password you chose.</p>
        <Link className="text-[#2f6fed] underline" href={signInHref}>
          Go to sign in
        </Link>
      </div>
    );
  } else if (info) {
    body = (
      <form className="space-y-4" onSubmit={submit}>
        <label className="block space-y-1.5" htmlFor="portal-join-email">
          <span className="text-sm font-medium text-neutral-800">Email</span>
          <input id="portal-join-email" aria-label="Email" value={info.email} readOnly className={`${fieldClass} bg-neutral-50 text-neutral-500`} />
        </label>
        <label className="block space-y-1.5" htmlFor="portal-join-name">
          <span className="text-sm font-medium text-neutral-800">Name</span>
          <input id="portal-join-name" aria-label="Name" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
        </label>
        <PasswordField id="portal-join-password" label="Password" value={password} onChange={setPassword} />
        <PasswordField id="portal-join-confirm" label="Repeat password" value={confirm} onChange={setConfirm} />
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy} className="h-11 w-full rounded-lg bg-[#2f6fed] text-sm font-medium text-white disabled:opacity-60">
          Create my login
        </button>
      </form>
    );
  } else if (error || !token) {
    body = (
      <p className="text-sm text-red-600" role="alert">
        {error || "This invitation link is not valid."}
      </p>
    );
  }

  return (
    <PortalEntryCard
      title="Create your login"
      subtitle={subtitle}
      logo={info?.branding?.logo_data_uri}
      testId="employer-portal-join"
    >
      {body}
    </PortalEntryCard>
  );
}
