import type {
  PortalContact,
  PortalInvitation,
  PortalInvoice,
  PortalPaymentNotice,
  PortalRequest,
} from "@/features/employer-portal/services/employer-portal.service";

export type EmployersOverviewInput = {
  contacts: PortalContact[];
  invitations: PortalInvitation[];
  newRequests: PortalRequest[];
  acceptedRequests: PortalRequest[];
  invoices: PortalInvoice[];
  paymentNotices: PortalPaymentNotice[];
  now: Date;
};

export type EmployersOverviewStats = {
  activeLogins: number;
  signedInToday: number;
  pendingInvitations: number;
  newRequests: number;
  acceptedRequests: number;
  unpaidInvoices: number;
  outstandingCents: number;
  paymentsToCheck: number;
};

function isSameLocalDay(iso: string, now: Date): boolean {
  const date = new Date(iso);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** Money arrives as decimal strings. Whole cents avoid float drift when adding. */
export function toCents(amount: string): number {
  const value = Number.parseFloat(amount);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function computeEmployersOverview(input: EmployersOverviewInput): EmployersOverviewStats {
  const unpaid = input.invoices.filter((invoice) => invoice.payment_status !== "paid");
  return {
    activeLogins: input.contacts.filter((contact) => contact.is_active).length,
    signedInToday: input.contacts.filter(
      (contact) => contact.is_active && contact.last_signed_in_at && isSameLocalDay(contact.last_signed_in_at, input.now),
    ).length,
    pendingInvitations: input.invitations.filter((invitation) => invitation.status === "pending").length,
    newRequests: input.newRequests.length,
    acceptedRequests: input.acceptedRequests.length,
    unpaidInvoices: unpaid.length,
    outstandingCents: unpaid.reduce((sum, invoice) => sum + toCents(invoice.amount_due), 0),
    paymentsToCheck: input.paymentNotices.length,
  };
}

export type AccessRow =
  | { kind: "login"; key: string; contact: PortalContact }
  | { kind: "invitation"; key: string; invitation: PortalInvitation };

/** Logins first, then invitations that are still open or lapsed. Accepted and revoked ones are history. */
export function buildAccessRows(contacts: PortalContact[], invitations: PortalInvitation[]): AccessRow[] {
  const logins: AccessRow[] = contacts.map((contact) => ({ kind: "login", key: `login-${contact.uuid}`, contact }));
  const invited: AccessRow[] = invitations
    .filter((invitation) => invitation.status === "pending" || invitation.status === "expired")
    .map((invitation) => ({ kind: "invitation", key: `invite-${invitation.uuid}`, invitation }));
  return [...logins, ...invited];
}
