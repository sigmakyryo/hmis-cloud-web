"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";

import { BFF_AUTH_ROUTES } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { fetchPortalMe, PORTAL_SCOPE_LABEL, type PortalMe, type PortalScope } from "@/features/employer-portal/services/employer-portal.service";
import { cn } from "@/lib/utils";

const PAGES: Array<{ scope: PortalScope; href: string }> = [
  { scope: "fitness", href: ROUTES.employerPortalFitness },
  { scope: "random_compliance", href: ROUTES.employerPortalCompliance },
  { scope: "invoices", href: ROUTES.employerPortalInvoices },
  { scope: "requests", href: ROUTES.employerPortalRequests },
  { scope: "users", href: ROUTES.employerPortalUsers },
];

const PortalContext = createContext<PortalMe | null>(null);
export const usePortalMe = () => useContext(PortalContext);

async function signOut() {
  try {
    await fetch(BFF_AUTH_ROUTES.session, { method: "DELETE", credentials: "include", cache: "no-store" });
  } finally {
    window.location.replace(ROUTES.auth);
  }
}

export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const me = useQuery({ queryKey: ["employer-portal", "me"], queryFn: fetchPortalMe, retry: false });

  if (me.isLoading) {
    return <p className="px-5 py-6 text-[13px] text-dash-muted">Loading…</p>;
  }
  if (me.isError || !me.data) {
    return (
      <div className="px-5 py-10 text-[13px]" data-testid="employer-portal-no-access">
        <p className="font-medium text-brand-navy">This portal is for employer contacts.</p>
        <p className="mt-1 text-dash-muted">Ask the clinic to give your login access to your company&apos;s page.</p>
        <button type="button" className="mt-4 text-primary underline" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    );
  }
  const pages = PAGES.filter((p) => me.data.scopes.includes(p.scope));

  return (
    <PortalContext.Provider value={me.data}>
      <header
        className="border-b border-dash-border/80"
        data-testid="employer-portal-shell"
        style={me.data.branding?.accent_color ? { borderTop: `4px solid ${me.data.branding.accent_color}` } : undefined}
      >
        <div className="flex min-h-12 items-center justify-between gap-3 px-5">
          <div className="flex items-center gap-2">
            {me.data.branding?.logo_data_uri ? (
              // eslint-disable-next-line @next/next/no-img-element -- inline data URI logo set by the clinic
              <img src={me.data.branding.logo_data_uri} alt="" className="h-7 w-auto" data-testid="employer-portal-logo" />
            ) : null}
            <p className="text-[14px] font-semibold text-brand-navy">
              {me.data.branding?.display_name ? `${me.data.branding.display_name} · ` : ""}
              {me.data.employer.name}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-dash-muted">
            <span>{me.data.name}</span>
            <button type="button" className="text-primary hover:underline" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </div>
        <nav className="flex gap-0.5 overflow-x-auto px-3" aria-label="Employer portal pages">
          {pages.map((p) => {
            const active = pathname === p.href || pathname.startsWith(`${p.href}/`);
            return (
              <Link
                key={p.href}
                href={p.href}
                className={cn(
                  "border-b-2 px-3 py-2.5 text-[13px] font-medium",
                  active ? "border-primary text-primary" : "border-transparent text-dash-muted hover:text-brand-navy",
                )}
              >
                {PORTAL_SCOPE_LABEL[p.scope]}
              </Link>
            );
          })}
        </nav>
      </header>
      <main>{children}</main>
    </PortalContext.Provider>
  );
}

export function PortalState({ error, empty, loading, children }: { error?: unknown; empty?: string | null; loading?: boolean; children?: ReactNode }) {
  if (loading) return <p className="px-5 py-6 text-[13px] text-dash-muted">Loading…</p>;
  if (error) {
    const status = (error as { status?: number }).status;
    return (
      <p className="px-5 py-6 text-[13px] text-red-700" role="alert">
        {status === 403 ? "This page is not part of your access." : "Could not load this page. Try again."}
      </p>
    );
  }
  if (empty) return <p className="px-5 py-6 text-[13px] text-dash-muted">{empty}</p>;
  return <>{children}</>;
}
