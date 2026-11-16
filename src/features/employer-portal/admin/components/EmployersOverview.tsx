"use client";

import { useQueries } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { errorText, fmtDate, fmtDateTime } from "@/app/(app)/drug-alcohol/_components/shared/da-format";
import { ROUTES } from "@/constants/routes";
import { billingChoices } from "@/features/employer-portal/admin/components/EmployerPortalBilling";
import {
  useContactsQuery,
  useInvitationsQuery,
  usePaymentNoticesQuery,
  useRequestsQuery,
} from "@/features/employer-portal/admin/hooks/useEmployersQueries";
import { computeEmployersOverview, formatCents } from "@/features/employer-portal/admin/utils/employers-overview";
import { REQUEST_KIND_LABEL, fetchStaffEmployerInvoices } from "@/features/employer-portal/services/employer-portal.service";
import { cn } from "@/lib/utils";

type StatState = { loading: boolean; error: string | null };

function StatCard({
  label,
  value,
  hint,
  href,
  state,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
  state: StatState;
  tone?: "default" | "attention";
}) {
  return (
    <Link
      href={href}
      data-testid="employers-stat"
      className="group rounded-xl border border-dash-border bg-white p-4 transition-shadow hover:shadow-[0_4px_16px_-8px_rgba(15,23,42,0.18)]"
    >
      <p className="text-[13px] text-dash-muted">{label}</p>
      {state.loading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-dash-canvas" aria-label="Loading" />
      ) : state.error ? (
        <p className="mt-2 text-[13px] text-destructive">{state.error}</p>
      ) : (
        <>
          <p className={cn("mt-1 text-[28px] leading-9 font-semibold tabular-nums", tone === "attention" && value !== "0" ? "text-brand-primary" : "text-brand-navy")}>{value}</p>
          {hint ? <p className="mt-0.5 text-[12px] text-dash-muted">{hint}</p> : null}
        </>
      )}
    </Link>
  );
}

function Panel({ title, href, linkLabel, children }: { title: string; href: string; linkLabel: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-dash-border bg-white">
      <div className="flex items-center justify-between border-b border-dash-border/80 px-4 py-3">
        <h2 className="text-[14px] font-medium text-brand-navy">{title}</h2>
        <Link href={href} className="text-[13px] text-brand-primary hover:underline">
          {linkLabel}
        </Link>
      </div>
      <div className="divide-y divide-dash-border/60">{children}</div>
    </section>
  );
}

function Row({ title, detail, meta }: { title: string; detail?: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
      <div className="min-w-0">
        <p className="truncate text-brand-navy">{title}</p>
        {detail ? <p className="truncate text-dash-muted">{detail}</p> : null}
      </div>
      {meta ? <span className="shrink-0 text-dash-muted">{meta}</span> : null}
    </div>
  );
}

function stateOf(query: { isLoading: boolean; isError: boolean; error: unknown }, fallback: string): StatState {
  return { loading: query.isLoading, error: query.isError ? errorText(query.error, fallback) : null };
}

export function EmployersOverview() {
  const [now] = useState(() => new Date());
  const contacts = useContactsQuery();
  const invitations = useInvitationsQuery();
  const newRequests = useRequestsQuery("pending");
  const acceptedRequests = useRequestsQuery("accepted");
  const payments = usePaymentNoticesQuery();
  const employerChoices = billingChoices(contacts.data ?? []);
  const invoiceQueries = useQueries({
    queries: employerChoices.map((choice) => ({
      queryKey: ["oh-portal-admin", "invoices", choice.employerUuid],
      queryFn: () => fetchStaffEmployerInvoices(choice.employerUuid),
      retry: false,
    })),
  });

  const invoicesLoading = contacts.isLoading || invoiceQueries.some((query) => query.isLoading);
  const invoicesError = invoiceQueries.find((query) => query.isError);
  const stats = computeEmployersOverview({
    contacts: contacts.data ?? [],
    invitations: invitations.data ?? [],
    newRequests: newRequests.data ?? [],
    acceptedRequests: acceptedRequests.data ?? [],
    invoices: invoiceQueries.flatMap((query) => query.data ?? []),
    paymentNotices: payments.data ?? [],
    now,
  });

  const attention = [
    ...(newRequests.data ?? []).slice(0, 4).map((request) => ({
      key: `request-${request.uuid}`,
      title: `${request.employer_name ?? "Employer"} · ${REQUEST_KIND_LABEL[request.kind] ?? request.kind}`,
      detail: request.worker_name || undefined,
      meta: fmtDate(request.created_at),
    })),
    ...(payments.data ?? []).slice(0, 4).map((notice) => ({
      key: `payment-${notice.uuid}`,
      title: `${notice.employer_name || "Employer"} paid ${notice.invoice_number}`,
      detail: `Reference ${notice.payment_reference}`,
      meta: notice.amount_due,
    })),
  ];
  const recentSignIns = (contacts.data ?? [])
    .filter((contact) => contact.last_signed_in_at)
    .sort((a, b) => (b.last_signed_in_at ?? "").localeCompare(a.last_signed_in_at ?? ""))
    .slice(0, 5);
  const contactsState = stateOf(contacts, "Could not load logins.");

  return (
    <div className="space-y-5 px-4 py-5 md:px-6" data-testid="employers-overview">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Logins with access" value={String(stats.activeLogins)} href={ROUTES.employersAccess} state={contactsState} />
        <StatCard
          label="Signed in today"
          value={String(stats.signedInToday)}
          hint={stats.activeLogins ? `of ${stats.activeLogins} logins` : undefined}
          href={ROUTES.employersAccess}
          state={contactsState}
        />
        <StatCard
          label="Pending invitations"
          value={String(stats.pendingInvitations)}
          href={ROUTES.employersAccess}
          state={stateOf(invitations, "Could not load invitations.")}
          tone="attention"
        />
        <StatCard
          label="New requests"
          value={String(stats.newRequests)}
          hint={`${stats.acceptedRequests} accepted, in progress`}
          href={`${ROUTES.employersRequests}?status=pending`}
          state={stateOf(newRequests, "Could not load requests.")}
          tone="attention"
        />
        <StatCard
          label="Unpaid invoices"
          value={String(stats.unpaidInvoices)}
          hint={stats.unpaidInvoices ? `${formatCents(stats.outstandingCents)} still due` : undefined}
          href={`${ROUTES.employersInvoices}?view=invoices`}
          state={{ loading: invoicesLoading, error: invoicesError ? errorText(invoicesError.error, "Could not load invoices.") : null }}
        />
        <StatCard
          label="Payments to check"
          value={String(stats.paymentsToCheck)}
          href={`${ROUTES.employersInvoices}?view=payments`}
          state={stateOf(payments, "Could not load payments.")}
          tone="attention"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Needs your attention" href={ROUTES.employersRequests} linkLabel="All requests">
          {attention.length === 0 ? <p className="px-4 py-6 text-center text-[13px] text-dash-muted">Nothing waiting. New requests and payment references show here.</p> : null}
          {attention.map((item) => (
            <Row key={item.key} title={item.title} detail={item.detail} meta={item.meta} />
          ))}
        </Panel>
        <Panel title="Recent sign-ins" href={ROUTES.employersAccess} linkLabel="Manage access">
          {recentSignIns.length === 0 ? <p className="px-4 py-6 text-center text-[13px] text-dash-muted">No employer has signed in yet.</p> : null}
          {recentSignIns.map((contact) => (
            <Row key={contact.uuid} title={contact.name || contact.email} detail={contact.employer_name} meta={fmtDateTime(contact.last_signed_in_at)} />
          ))}
        </Panel>
      </div>
    </div>
  );
}
