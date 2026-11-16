"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { ROUTES } from "@/constants/routes";
import { PortalEntryCard } from "@/features/employer-portal/components/PortalEntryCard";
import {
  fetchPublicBranding,
  fetchWorkspace,
  signInToPortal,
  type PortalSignInChoice,
} from "@/features/employer-portal/services/employer-portal-public.service";
import type { PortalBranding, PortalWorkspace } from "@/features/employer-portal/services/employer-portal.service";
import { getErrorMessage } from "@/lib/fetch-error";

const fieldClass = "h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-900";

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
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
      </div>
    </div>
  );
}

export function PortalSignIn({
  org = "",
  workspace = "",
  tenantUuid = "",
  organisation = "",
}: {
  org?: string;
  workspace?: string;
  tenantUuid?: string;
  organisation?: string;
}) {
  const router = useRouter();
  const clinic = tenantUuid || org;
  const [branding, setBranding] = useState<PortalBranding | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [choices, setChoices] = useState<PortalSignInChoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        return;
      }
      const key = result.workspace || workspace;
      router.push(key ? `/portal/${key}/fitness` : ROUTES.employerPortal);
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

  const clinicName = branding?.display_name || organisation;
  const subtitle = clinicName ? `Sign in to ${clinicName}` : "Sign in to your company portal";
  let choiceList: ReactNode = null;
  if (choices.length > 0) {
    choiceList = (
      <div className="space-y-2">
        <p className="text-sm text-neutral-500">This email is used at more than one clinic. Choose one.</p>
        {choices.map((choice) => (
          <button
            key={choice.tenant_uuid}
            type="button"
            className="block w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm"
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
      logo={branding?.logo_data_uri}
      testId="employer-portal-sign-in"
    >
      <form className="space-y-4" onSubmit={handleCredentials}>
        <div className="space-y-1.5">
          <label htmlFor="portal-email" className="text-sm font-medium text-neutral-800">
            Email
          </label>
          <input
            id="portal-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />
        </div>
        <PasswordField
          id="portal-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        {choiceList}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting || email.trim() === "" || password === ""}
          className="h-11 w-full rounded-lg bg-[#2f6fed] text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? "Checking" : "Login"}
        </button>
      </form>
    </PortalEntryCard>
  );
}

export function PortalWorkspaceSignIn({ workspace }: { workspace: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<PortalWorkspace | null>(null);
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
        if (!cancelled) {
          setError(getErrorMessage(caught));
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, workspace]);

  if (error) {
    return (
      <PortalEntryCard title="Company portal" subtitle={error} testId="employer-portal-sign-in">
        {null}
      </PortalEntryCard>
    );
  }
  if (!record) {
    return (
      <PortalEntryCard title="Company portal" subtitle="Loading…" testId="employer-portal-sign-in">
        {null}
      </PortalEntryCard>
    );
  }
  return (
    <PortalSignIn workspace={record.key} tenantUuid={record.uuid} organisation={record.name} />
  );
}
