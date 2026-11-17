"use client";

import { usePathname } from "next/navigation";

import { DetailPageTabNavItem } from "@/features/app-shell/components/page-layout";
import { useInvitationsQuery, usePaymentNoticesQuery, useRequestsQuery } from "@/features/employer-portal/admin/hooks/useEmployersQueries";
import { ROUTES } from "@/constants/routes";
import { PortalLinkChip } from "@/features/employer-portal/admin/components/PortalLinkChip";

type TabDef = { href: string; label: string; count?: number };

/** Matches the tab for a pathname. Overview is the exact `/employers`, the rest also own their children. */
export function activeTabHref(pathname: string, hrefs: string[]): string | undefined {
  const exact = hrefs.find((href) => href === pathname);
  if (exact) return exact;
  return hrefs
    .filter((href) => href !== ROUTES.employers && pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function EmployersTabNav() {
  const pathname = usePathname();
  const newRequests = useRequestsQuery("pending");
  const payments = usePaymentNoticesQuery();
  const invitations = useInvitationsQuery();

  const pendingInvitations = (invitations.data ?? []).filter((invitation) => invitation.status === "pending").length;
  const tabs: TabDef[] = [
    { href: ROUTES.employers, label: "Overview" },
    { href: ROUTES.employersRequests, label: "Requests", count: newRequests.data?.length },
    { href: ROUTES.employersInvoices, label: "Invoices", count: payments.data?.length },
    { href: ROUTES.employersAccess, label: "Access", count: invitations.data ? pendingInvitations : undefined },
    { href: ROUTES.employersBranding, label: "Branding" },
  ];
  const active = activeTabHref(
    pathname,
    tabs.map((tab) => tab.href),
  );

  return (
    <div data-list-band className="flex min-h-11 items-center justify-between gap-2 border-b border-dash-border/80 bg-white">
      <nav className="scrollbar-hide flex min-w-0 gap-0.5 overflow-x-auto px-3 sm:px-5" aria-label="Employers sections">
        {tabs.map((tab) => (
          <DetailPageTabNavItem key={tab.href} href={tab.href} isActive={tab.href === active}>
            {tab.label}
            {tab.count ? <span className="ml-1.5 text-[12px] tabular-nums text-dash-muted">{tab.count}</span> : null}
          </DetailPageTabNavItem>
        ))}
      </nav>
      <PortalLinkChip />
    </div>
  );
}
