"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { ROUTES } from "@/constants/routes";
import { PortalEntryCard } from "@/features/employer-portal/components/PortalEntryCard";
import {
  PortalField,
  PortalFormSkeleton,
  PortalPasswordField,
  PortalSubmitButton,
} from "@/features/employer-portal/components/PortalFormControls";
import {
  fetchPublicBranding,
  fetchWorkspace,
  isWorkspaceRouteMissing,
  signInToPortal,
  workspaceDisplayName,
  type PortalSignInChoice,
} from "@/features/employer-portal/services/employer-portal-public.service";
import type { PortalBranding, PortalWorkspace } from "@/features/employer-portal/services/employer-portal.service";
import { pickPortalLogo } from "@/features/employer-portal/utils/portal-logo";
import { getErrorMessage } from "@/lib/fetch-error";

export function PortalSignIn({
  org = "",
  workspace = "",
  tenantUuid = "",
  organisation = "",
  logoUrl = "",
}: {
  org?: string;
  workspace?: string;
  tenantUuid?: string;
  organisation?: string;
  /** Organisation logo, used when the portal has no logo of its own. */
  logoUrl?: string;
}) {
  const router = useRouter();
  const clinic = tenantUuid || org;
  const [branding, setBranding] = useState<PortalBranding | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [choices, setChoices] = useState<PortalSignInChoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (!clinic) {
      return;
    }
    let cancelled = false;
    async function loadBranding() {
      try {
        const next = await fetchPublicBranding(clinic);
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
  }, [clinic]);

  async function signIn(chosenTenant?: string) {
    setError(null);
    setIsSubmitting(true);
    const tenant = chosenTenant || tenantUuid;
    try {
      const result = await signInToPortal({
        email: email.trim(),
        password,
        ...(tenant ? { tenant_uuid: tenant } : {}),
      });
      if (result.choices && result.choices.length > 0 && !tenant) {
        setChoices(result.choices);
        setIsSubmitting(false);
        return;
      }
      const key = result.workspace || workspace;
      // Keep the form locked until the portal page replaces this one.
      setIsOpening(true);
      router.push(key ? `/portal/${key}/fitness` : ROUTES.employerPortal);
    } catch (caught) {
      setError(getErrorMessage(caught));
      setIsSubmitting(false);
    }
  }

  function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn();
  }

  const clinicName = branding?.display_name || organisation;
  const subtitle = clinicName ? `Sign in to ${clinicName}` : "Please enter your details to login.";
  let choiceList: ReactNode = null;
  if (choices.length > 0) {
    choiceList = (
      <div className="space-y-2">
        <p className="text-sm text-neutral-500">This email is used at more than one clinic. Choose one.</p>
        {choices.map((choice) => (
          <button
            key={choice.tenant_uuid}
            type="button"
            className="block w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-left text-[15px] text-neutral-900 transition hover:bg-neutral-50"
            disabled={isSubmitting}
            onClick={() => void signIn(choice.tenant_uuid)}
          >
            {choice.organisation}
          </button>
        ))}
      </div>
    );
  }

  return (
    <PortalEntryCard
      title="Welcome back"
      subtitle={subtitle}
      logo={pickPortalLogo(branding?.logo_data_uri, logoUrl)}
      footer={
        <>
          No login yet? Ask your clinic for an invitation.
          {branding?.support_email ? (
            <>
              {" "}
              <a className="font-medium text-neutral-900" href={`mailto:${branding.support_email}`}>
                {branding.support_email}
              </a>
            </>
          ) : null}
        </>
      }
      testId="employer-portal-sign-in"
    >
      <form className="space-y-4" onSubmit={handleCredentials} aria-busy={isSubmitting}>
        <fieldset disabled={isSubmitting} className="min-w-0 space-y-4 border-0 p-0">
        <PortalField
          id="portal-email"
          label="Email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          value={email}
          onValueChange={setEmail}
        />
        <PortalPasswordField
          id="portal-password"
          label="Password"
          value={password}
          placeholder="Your password"
          autoComplete="current-password"
          onValueChange={setPassword}
        />
        {choiceList}
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <PortalSubmitButton accent={branding?.accent_color} loading={isSubmitting} disabled={email.trim() === "" || password === ""}>
          {isOpening ? "Opening your portal…" : isSubmitting ? "Signing in…" : "Login"}
        </PortalSubmitButton>
        </fieldset>
      </form>
    </PortalEntryCard>
  );
}

export function PortalWorkspaceSignIn({ workspace }: { workspace: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<PortalWorkspace | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const next = await fetchWorkspace(workspace);
        if (cancelled) {
          return;
        }
        if (next.key !== workspace) {
          router.replace(`/portal/${next.key}`);
          return;
        }
        setRecord(next);
      } catch (caught) {
        if (cancelled) {
          return;
        }
        if (isWorkspaceRouteMissing(caught)) {
          // An older OH service cannot look the address up. Sign in without the clinic filter instead of failing.
          console.warn("The OH service has no company address lookup yet. Signing in without a clinic filter.");
          setLegacy(true);
          return;
        }
        setError(getErrorMessage(caught));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, workspace]);

  if (legacy) {
    return <PortalSignIn organisation={workspaceDisplayName(workspace)} />;
  }
  if (error) {
    return (
      <PortalEntryCard title="Company portal" subtitle={error} testId="employer-portal-sign-in">
        {null}
      </PortalEntryCard>
    );
  }
  if (!record) {
    return (
      <PortalEntryCard title="Company portal" subtitle="Finding your company portal…" testId="employer-portal-sign-in">
        <PortalFormSkeleton />
      </PortalEntryCard>
    );
  }
  return (
    <PortalSignIn workspace={record.key} tenantUuid={record.uuid} organisation={record.name} logoUrl={record.logo_url} />
  );
}
