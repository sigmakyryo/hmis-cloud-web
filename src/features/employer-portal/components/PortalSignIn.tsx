"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import {
  logout,
  markAuthenticatedSession,
  requestSigninOtp,
  verifySignin,
  verifySigninTotp,
} from "@/features/auth/services/auth.service";
import type { User } from "@/features/auth/types/auth.types";
import { PortalBrandBanner } from "@/features/employer-portal/components/PortalBrandBanner";
import { fetchPublicBranding } from "@/features/employer-portal/services/employer-portal-public.service";
import {
  isPortalOnlyUser,
  type PortalBranding,
} from "@/features/employer-portal/services/employer-portal.service";
import { getErrorMessage } from "@/lib/fetch-error";
import { useSessionStore } from "@/state/session.store";

const CLINIC_ACCOUNT_MESSAGE = "This sign-in is for company contacts.";

export function PortalSignIn({ org }: { org: string }) {
  const router = useRouter();
  const [branding, setBranding] = useState<PortalBranding | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [method, setMethod] = useState<"email" | "totp" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!org) {
      return;
    }
    let cancelled = false;
    async function loadBranding() {
      try {
        const next = await fetchPublicBranding(org);
        if (!cancelled) {
          setBranding(next);
        }
      } catch {
        if (!cancelled) {
          setBranding(null);
        }
      }
    }
    void loadBranding();
    return () => {
      cancelled = true;
    };
  }, [org]);

  async function acceptContact(user: User) {
    if (!isPortalOnlyUser(user)) {
      await logout();
      setPendingToken("");
      setMethod(null);
      setCode("");
      setError(CLINIC_ACCOUNT_MESSAGE);
      return;
    }
    useSessionStore.getState().hydrate(user);
    markAuthenticatedSession();
    router.push(ROUTES.employerPortal);
  }

  async function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const challenge = await requestSigninOtp({ email, password });
      const nextMethod = challenge.methods.includes("email")
        ? "email"
        : challenge.methods.includes("totp")
          ? "totp"
          : null;
      if (!nextMethod) {
        setError(CLINIC_ACCOUNT_MESSAGE);
        return;
      }
      setPendingToken(challenge.pending_mfa_token);
      setMethod(nextMethod);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result =
        method === "totp"
          ? await verifySigninTotp({ pending_mfa_token: pendingToken, code })
          : await verifySignin({
              email,
              code,
              pending_mfa_token: pendingToken,
            });
      await acceptContact(result.user);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div data-testid="employer-portal-sign-in">
      <div className="mx-auto max-w-md px-6 pt-10">
        <PortalBrandBanner branding={branding} fallback="Employer portal" />
        {method ? (
          <form className="mt-8 space-y-4" onSubmit={(event) => void handleCode(event)}>
            <div className="space-y-1.5">
              <Label htmlFor="portal-code">
                {method === "totp" ? "Authenticator code" : "Email code"}
              </Label>
              <Input
                id="portal-code"
                value={code}
                autoComplete="one-time-code"
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <PrimaryButton type="submit" disabled={isSubmitting || code.trim() === ""}>
              {isSubmitting ? "Checking" : "Continue"}
            </PrimaryButton>
          </form>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={(event) => void handleCredentials(event)}>
            <div className="space-y-1.5">
              <Label htmlFor="portal-email">Email</Label>
              <Input
                id="portal-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-password">Password</Label>
              <Input
                id="portal-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <PrimaryButton type="submit" disabled={isSubmitting || email.trim() === "" || password === ""}>
              {isSubmitting ? "Checking" : "Sign in"}
            </PrimaryButton>
          </form>
        )}
      </div>
    </div>
  );
}
