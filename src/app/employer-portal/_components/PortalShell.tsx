"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  CheckListIcon,
  File02Icon,
  InboxIcon,
  Invoice03Icon,
  Logout01Icon,
  Menu01Icon,
  SecurityCheckIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { createContext, useContext, useState, type ReactNode } from "react";

import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { ROUTES } from "@/constants/routes";
import { fetchPortalMe, PORTAL_SCOPE_LABEL, type PortalMe, type PortalScope } from "@/features/employer-portal/services/employer-portal.service";
import { usePortalWorkspace } from "@/features/employer-portal/hooks/usePortalWorkspace";
import { pickPortalLogo } from "@/features/employer-portal/utils/portal-logo";
import { PortalIcon, type PortalIconSvg } from "@/features/employer-portal/components/PortalIcon";
import { PortalEmpty, PortalTableSkeleton } from "@/features/employer-portal/components/PortalPrimitives";
import { cn } from "@/lib/utils";

const NAV_ICON: Record<string, PortalIconSvg> = {
  fitness: SecurityCheckIcon,
  "annual-summary": File02Icon,
  "random-compliance": CheckListIcon,
  invoices: Invoice03Icon,
  requests: InboxIcon,
  users: UserGroupIcon,
};

function iconFor(href: string): PortalIconSvg {
  const last = href.split("/").filter(Boolean).pop() ?? "";
  return NAV_ICON[last] ?? SecurityCheckIcon;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const PAGE_DEFS: Array<{ scope: PortalScope; page: string; label?: string }> = [
  { scope: "fitness", page: "fitness" },
  { scope: "fitness", page: "annual-summary", label: "Annual summary" },
  { scope: "random_compliance", page: "random-compliance" },
  { scope: "invoices", page: "invoices" },
  { scope: "requests", page: "requests" },
  { scope: "users", page: "users" },
];

function portalPages(workspace?: string): Array<{ scope: PortalScope; href: string; label?: string }> {
  if (!workspace) {
    return [
      { scope: "fitness", href: ROUTES.employerPortalFitness },
      { scope: "fitness", href: ROUTES.employerPortalAnnual, label: "Annual summary" },
      { scope: "random_compliance", href: ROUTES.employerPortalCompliance },
      { scope: "invoices", href: ROUTES.employerPortalInvoices },
      { scope: "requests", href: ROUTES.employerPortalRequests },
      { scope: "users", href: ROUTES.employerPortalUsers },
    ];
  }
  return PAGE_DEFS.map((page) => ({
    scope: page.scope,
    href: `/portal/${workspace}/${page.page}`,
    label: page.label,
  }));
}

const PortalContext = createContext<PortalMe | null>(null);
export const usePortalMe = () => useContext(PortalContext);

async function signOut(destination: string) {
  try {
    await fetch(`${BFF_OCCUPATIONAL_HEALTH_ROUTES.employerPortalPublic}/session`, {
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    });
  } finally {
    window.location.replace(destination);
  }
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex min-h-svh bg-white" role="status" aria-label="Loading your portal">
      <div className="hidden w-[272px] shrink-0 flex-col gap-4 border-r border-neutral-200/80 p-6 lg:flex">
        <div className="flex items-center gap-3">
          <span className="size-11 animate-pulse rounded-full bg-neutral-100" />
          <span className="h-4 w-28 animate-pulse rounded bg-neutral-100" />
        </div>
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className="h-9 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
      <div className="flex-1 space-y-4 p-8">
        <span className="block h-11 w-64 animate-pulse rounded-lg bg-neutral-100" />
        <span className="block h-24 animate-pulse rounded-lg bg-neutral-100" />
        <PortalTableSkeleton />
      </div>
    </div>
  );
}

export function PortalShell({ children, workspace }: { children: ReactNode; workspace?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const home = workspace ? `/portal/${workspace}` : ROUTES.employerPortalSignIn;
  const me = useQuery({ queryKey: ["employer-portal", "me"], queryFn: fetchPortalMe, retry: false });
  const clinic = usePortalWorkspace(workspace);

  if (me.isLoading) {
    return <SidebarSkeleton />;
  }
  if (me.isError || !me.data) {
    return (
      <div className="px-5 py-10 text-[13px]" data-testid="employer-portal-no-access">
        <p className="font-medium text-brand-navy">This portal is for employer contacts.</p>
        <p className="mt-1 text-dash-muted">Ask the clinic to give your login access to your company&apos;s page.</p>
        <button type="button" className="mt-4 text-primary underline" onClick={() => void signOut(home)}>
          Sign out
        </button>
      </div>
    );
  }
  const branding = me.data.branding;
  const accent = branding?.accent_color && HEX_COLOR.test(branding.accent_color) ? branding.accent_color : "#2f55e8";
  const pages = portalPages(workspace).filter((page) => me.data.scopes.includes(page.scope));
  const clinicName = branding?.display_name || clinic.data?.name || "Company portal";
  const logo = pickPortalLogo(branding?.logo_data_uri, clinic.data?.logo_url);

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Employer portal pages">
      {pages.map((p) => {
        const active = pathname === p.href || pathname.startsWith(`${p.href}/`);
        const icon = iconFor(p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
              active ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800",
            )}
          >
            {active ? <span className="absolute top-2 -left-6 bottom-2 w-1 rounded-r-full" style={{ backgroundColor: "var(--portal-accent)" }} aria-hidden="true" /> : null}
            <span className="shrink-0" style={active ? { color: "var(--portal-accent)" } : undefined}>
              <PortalIcon icon={icon} size={20} />
            </span>
            <span className="flex-1 truncate">{p.label ?? PORTAL_SCOPE_LABEL[p.scope]}</span>
            {active ? <PortalIcon icon={ArrowRight01Icon} size={16} className="text-neutral-500" /> : null}
          </Link>
        );
      })}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col px-6 py-6">
      <div className="flex items-center gap-3 border-b border-neutral-200/80 pb-5">
        {logo ? (
          <Image src={logo} alt="" width={44} height={44} unoptimized className="size-11 rounded-full object-cover" data-testid="employer-portal-logo" />
        ) : (
          <span className="flex size-11 items-center justify-center rounded-full bg-[#2b2f3a] text-[15px] font-medium text-white" aria-hidden="true">
            {initialsOf(clinicName)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-neutral-900">{clinicName}</p>
          <p className="truncate text-[13px] text-neutral-500">{me.data.employer.name}</p>
        </div>
      </div>
      <p className="mt-6 mb-2 text-[12px] tracking-wide text-neutral-400">MAIN</p>
      {nav}
      <div className="mt-auto flex items-center gap-3 border-t border-neutral-200/80 pt-5">
        <span className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-[13px] font-medium text-neutral-600" aria-hidden="true">
          {initialsOf(me.data.name)}
        </span>
        <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-neutral-900">{me.data.name}</p>
        <button type="button" aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800" onClick={() => void signOut(home)}>
          <PortalIcon icon={Logout01Icon} size={19} />
        </button>
      </div>
    </div>
  );

  return (
    <PortalContext.Provider value={me.data}>
      <div
        className="flex min-h-svh bg-white"
        data-testid="employer-portal-shell"
        style={{ "--portal-accent": accent } as React.CSSProperties}
      >
        <aside className="sticky top-0 hidden h-svh w-[272px] shrink-0 border-r border-neutral-200/80 bg-white lg:block">{sidebar}</aside>
        {menuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/30" onClick={() => setMenuOpen(false)} />
            <aside className="relative h-full w-[290px] bg-white shadow-xl">{sidebar}</aside>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 border-b border-neutral-200/80 px-4 py-3 lg:hidden">
            <button type="button" aria-label="Open menu" className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100" onClick={() => setMenuOpen(true)}>
              <PortalIcon icon={menuOpen ? Cancel01Icon : Menu01Icon} size={22} />
            </button>
            <p className="truncate text-[15px] font-medium text-neutral-900">{clinicName}</p>
          </div>
          <main>{children}</main>
        </div>
      </div>
    </PortalContext.Provider>
  );
}

export function PortalState({
  error,
  empty,
  loading,
  children,
  emptyIcon = InboxIcon,
  emptyTitle = "Nothing here yet",
}: {
  error?: unknown;
  empty?: string | null;
  loading?: boolean;
  children?: ReactNode;
  emptyIcon?: PortalIconSvg;
  emptyTitle?: string;
}) {
  if (loading) return <PortalTableSkeleton />;
  if (error) {
    const status = (error as { status?: number }).status;
    return (
      <p className="py-10 text-center text-[13px] text-red-700" role="alert">
        {status === 403 ? "This page is not part of your access." : "Could not load this page. Try again."}
      </p>
    );
  }
  if (empty) return <PortalEmpty icon={emptyIcon} title={emptyTitle} description={empty} />;
  return <>{children}</>;
}
