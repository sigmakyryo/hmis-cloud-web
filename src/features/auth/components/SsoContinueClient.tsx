"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { StatusBanner } from "@/components/ui/status-banner";
import { AuthSplitLayout } from "@/features/auth/components/AuthSplitLayout";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { exchangeSsoContinueCode } from "@/features/auth/services/auth.service";
import type { SsoContinueResponse } from "@/features/auth/types/auth.types";
import { ROUTES } from "@/constants/routes";
import Link from "next/link";

export function SsoContinueClient() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code")?.trim() ?? "";
  const [challenge, setChallenge] = useState<SsoContinueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(code));

  useEffect(() => {
    if (!code) {
      setError("Missing sign-in code. Start again from the sign-in page.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const payload = await exchangeSsoContinueCode(code);
        if (!cancelled) {
          setChallenge(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "This sign-in link has expired. Try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <AuthSplitLayout
        headline={"You've already earned it.\nNow collect it."}
        subhead="Finishing single sign-on…"
        imageSrc="/landing/hero-clinic-billing.jpg"
        imageAlt="A clinic finance officer reviewing claims and payments"
      >
        <p className="text-sm text-brand-muted">Completing SSO…</p>
      </AuthSplitLayout>
    );
  }

  if (error || !challenge) {
    return (
      <AuthSplitLayout
        headline={"You've already earned it.\nNow collect it."}
        subhead="Sign in to follow every claim, payment, and outstanding balance."
        imageSrc="/landing/hero-clinic-billing.jpg"
        imageAlt="A clinic finance officer reviewing claims and payments"
      >
        <StatusBanner
          variant="error"
          message={error ?? "Unable to continue SSO."}
        />
        <p className="mt-4 text-sm text-brand-muted">
          <Link
            href={ROUTES.auth}
            className="font-medium text-brand-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </AuthSplitLayout>
    );
  }

  return <LoginForm ssoChallenge={challenge} />;
}
