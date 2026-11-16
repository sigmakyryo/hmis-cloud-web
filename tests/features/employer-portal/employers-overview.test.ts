import { describe, expect, it } from "vitest";

import { activeTabHref } from "@/features/employer-portal/admin/components/EmployersTabNav";
import { parseRequestFilter } from "@/features/employer-portal/admin/components/EmployersRequestsPage";
import { buildInviteBody } from "@/features/employer-portal/admin/components/AccessSheet";
import {
  buildAccessRows,
  computeEmployersOverview,
  formatCents,
  toCents,
} from "@/features/employer-portal/admin/utils/employers-overview";
import type { PortalContact, PortalInvitation } from "@/features/employer-portal/services/employer-portal.service";

const NOW = new Date(2026, 10, 17, 15, 0, 0);

function contact(overrides: Partial<PortalContact>): PortalContact {
  return {
    uuid: "c",
    email: "a@acme.test",
    name: "A",
    employer_uuid: "e",
    employer_name: "Acme",
    scopes: ["fitness"],
    billing_customers: [],
    is_active: true,
    last_signed_in_at: null,
    ...overrides,
  };
}

function invitation(overrides: Partial<PortalInvitation>): PortalInvitation {
  return {
    uuid: "i",
    email: "b@acme.test",
    name: "",
    employer_uuid: "e",
    employer_name: "Acme",
    scopes: ["fitness"],
    status: "pending",
    expires_at: "2026-11-24T00:00:00Z",
    accepted_at: null,
    email_sent: true,
    created_at: null,
    ...overrides,
  };
}

describe("employers overview stats", () => {
  it("counts active logins, today's sign-ins, invitations, requests, invoices and payments", () => {
    const stats = computeEmployersOverview({
      contacts: [
        contact({ uuid: "1", last_signed_in_at: new Date(2026, 10, 17, 8, 0).toISOString() }),
        contact({ uuid: "2", last_signed_in_at: new Date(2026, 10, 16, 8, 0).toISOString() }),
        contact({ uuid: "3", is_active: false, last_signed_in_at: new Date(2026, 10, 17, 9, 0).toISOString() }),
        contact({ uuid: "4" }),
      ],
      invitations: [invitation({ uuid: "p" }), invitation({ uuid: "x", status: "expired" })],
      newRequests: [{}, {}] as never[],
      acceptedRequests: [{}] as never[],
      invoices: [
        { payment_status: "not_paid", amount_due: "10.10" },
        { payment_status: "partially_paid", amount_due: "0.20" },
        { payment_status: "paid", amount_due: "0.00" },
      ] as never[],
      paymentNotices: [{}] as never[],
      now: NOW,
    });
    expect(stats).toEqual({
      activeLogins: 3,
      signedInToday: 1,
      pendingInvitations: 1,
      newRequests: 2,
      acceptedRequests: 1,
      unpaidInvoices: 2,
      outstandingCents: 1030,
      paymentsToCheck: 1,
    });
  });

  it("adds money in whole cents", () => {
    expect(toCents("0.10") + toCents("0.20")).toBe(30);
    expect(toCents("not a number")).toBe(0);
    expect(formatCents(1030)).toMatch(/10[.,]30$/);
  });
});

describe("access rows", () => {
  it("lists logins, then open or lapsed invitations, and hides accepted and revoked ones", () => {
    const rows = buildAccessRows(
      [contact({ uuid: "1" })],
      [
        invitation({ uuid: "a", status: "pending" }),
        invitation({ uuid: "b", status: "expired" }),
        invitation({ uuid: "c", status: "accepted" }),
        invitation({ uuid: "d", status: "revoked" }),
      ],
    );
    expect(rows.map((row) => row.key)).toEqual(["login-1", "invite-a", "invite-b"]);
  });
});

describe("employers navigation", () => {
  const hrefs = ["/employers", "/employers/requests", "/employers/invoices", "/employers/access", "/employers/branding"];

  it("marks the matching tab and keeps Overview exact", () => {
    expect(activeTabHref("/employers", hrefs)).toBe("/employers");
    expect(activeTabHref("/employers/requests", hrefs)).toBe("/employers/requests");
    expect(activeTabHref("/employers/access/anything", hrefs)).toBe("/employers/access");
    expect(activeTabHref("/customers", hrefs)).toBeUndefined();
  });

  it("falls back to new requests for an unknown status", () => {
    expect(parseRequestFilter("done")).toBe("done");
    expect(parseRequestFilter("bogus")).toBe("pending");
    expect(parseRequestFilter(null)).toBe("pending");
  });
});

describe("access invite body", () => {
  const base = { email: " casey@acme.test ", name: " Casey ", employerUuid: "emp", scopes: ["fitness", "invoices"] as never, accounts: [{ uuid: "cust", name: "Acme Ltd" }] };

  it("invite by email sends only the email, employer and what they can see", () => {
    expect(buildInviteBody({ ...base, mode: "invite" })).toEqual({ email: "casey@acme.test", employer_uuid: "emp", scopes: ["fitness", "invoices"] });
  });

  it("enter details adds the name and billing accounts, and never a password", () => {
    const body = buildInviteBody({ ...base, mode: "details" });
    expect(body).toEqual({
      email: "casey@acme.test",
      employer_uuid: "emp",
      scopes: ["fitness", "invoices"],
      name: "Casey",
      billing_customer_uuids: ["cust"],
    });
    expect(Object.keys(body)).not.toContain("password");
  });

  it("asks for the missing pieces", () => {
    expect(() => buildInviteBody({ ...base, mode: "invite", email: "" })).toThrow("Enter the email");
    expect(() => buildInviteBody({ ...base, mode: "invite", scopes: [] })).toThrow("at least one");
  });
});
