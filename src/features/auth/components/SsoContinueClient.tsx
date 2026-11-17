"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { StatusBanner } from "@/components/ui/status-banner";
import { AuthSplitLayout } from "@/features/auth/components/AuthSplitLayout";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { exchangeSsoContinueCode } from "@/features/auth/services/auth.service";
import type { SsoContinueResponse } from "@/features/auth/types/auth.types";
import { ROUTES } from "@/constants/routes";

/** Share one exchange per continue code across Strict Mode remounts. */
const continueExchanges = new Map<string, Promise<SsoContinueResponse>>();

function exchangeContinueCodeOnce(code: string): Promise<SsoContinueResponse> {
  const existing = continueExchanges.get(code);
  if (existing) {
    return existing;
  }
  const pending = exchangeSsoContinueCode(code).catch((error) => {
    continueExchanges.delete(code);
    throw error;
  });
  continueExchanges.set(code, pending);
  return pending;
}

function readContinueCode(searchParams: URLSearchParams): string {
  const fromParams = searchParams.get("code")?.trim() ?? "";
  if (fromParams) {
    return fromParams;
  }
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get("code")?.trim() ?? "";
}

export function SsoContinueClient() {
  const searchParams = useSearchParams();
  const codeRef = useRef<string | null>(null);
  if (codeRef.current === null) {
    codeRef.current = readContinueCode(searchParams);
  }
  const code = codeRef.current;

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
        const payload = await exchangeContinueCodeOnce(code);
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
