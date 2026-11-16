"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import { PortalBrandBanner } from "@/features/employer-portal/components/PortalBrandBanner";
import {
  fetchPublicBranding,
  signInToPortal,
  type PortalSignInChoice,
} from "@/features/employer-portal/services/employer-portal-public.service";
import type { PortalBranding } from "@/features/employer-portal/services/employer-portal.service";
import { getErrorMessage } from "@/lib/fetch-error";

export function PortalSignIn({ org }: { org: string }) {
  const router = useRouter();
  const [branding, setBranding] = useState<PortalBranding | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [choices, setChoices] = useState<PortalSignInChoice[]>([]);
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

  async function signIn(tenantUuid?: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signInToPortal({
        email: email.trim(),
        password,
        ...(tenantUuid ? { tenant_uuid: tenantUuid } : {}),
      });
      if (result.choices && result.choices.length > 0) {
        setChoices(result.choices);
        return;
      }
      router.push(ROUTES.employerPortal);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn();
  }

  return (
    <div data-testid="employer-portal-sign-in">
      <div className="mx-auto max-w-md px-6 pt-10">
        <PortalBrandBanner branding={branding} fallback="Employer portal" />
        <form className="mt-8 space-y-4" onSubmit={handleCredentials}>
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
          {choices.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-dash-muted">This email is used at more than one clinic. Choose one.</p>
              {choices.map((choice) => (
                <button
                  key={choice.tenant_uuid}
                  type="button"
                  className="block w-full rounded-md border border-dash-border px-3 py-2 text-left text-sm"
                  disabled={isSubmitting}
                  onClick={() => void signIn(choice.tenant_uuid)}
                >
                  {choice.organisation}
                </button>
              ))}
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <PrimaryButton type="submit" disabled={isSubmitting || email.trim() === "" || password === ""}>
            {isSubmitting ? "Checking" : "Sign in"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
