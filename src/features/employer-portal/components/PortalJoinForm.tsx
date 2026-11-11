"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ROUTES } from "@/constants/routes";
import { PortalBrandBanner } from "@/features/employer-portal/components/PortalBrandBanner";
import { acceptInvitation, fetchInvitation } from "@/features/employer-portal/services/employer-portal-public.service";
import type { PortalInviteInfo } from "@/features/employer-portal/services/employer-portal.service";

const field = "h-10 w-full rounded-md border border-dash-border px-3 text-[14px]";

export function PortalJoinForm({ token }: { token: string }) {
  const [info, setInfo] = useState<PortalInviteInfo | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchInvitation(token)
      .then((i) => {
        setInfo(i);
        setName(i.name ?? "");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "This invitation link is not valid."));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters for the password.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    try {
      await acceptInvitation({ token, name: name.trim() || undefined, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept the invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16" data-testid="employer-portal-join">
      <PortalBrandBanner branding={info?.branding} fallback="Employer portal" />
      {done ? (
        <div className="space-y-3 text-[14px]">
          <p>Your account is ready. Sign in with {info?.email} and the password you chose.</p>
          <Link className="text-primary underline" href={ROUTES.auth}>
            Go to sign in
          </Link>
        </div>
      ) : info ? (
        <form className="space-y-4 text-[14px]" onSubmit={submit}>
          <p>
            You have been invited to see {info.employer_name}&apos;s occupational health results from {info.organisation}. Sign-in
            email: <strong>{info.email}</strong>
          </p>
          <label className="block space-y-1">
            <span className="text-dash-muted">Your name</span>
            <input aria-label="Your name" className={field} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-dash-muted">Choose a password</span>
            <input aria-label="Password" type="password" autoComplete="new-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-dash-muted">Repeat the password</span>
            <input aria-label="Repeat password" type="password" autoComplete="new-password" className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {error ? <p className="text-red-600" role="alert">{error}</p> : null}
          <button type="submit" disabled={busy} className="h-10 w-full rounded-md bg-brand-navy text-white disabled:opacity-60">
            Create my login
          </button>
        </form>
      ) : error || !token ? (
        <p className="text-red-600" role="alert">{error || "This invitation link is not valid."}</p>
      ) : (
        <p className="text-dash-muted">Checking your invitation…</p>
      )}
    </main>
  );
}
