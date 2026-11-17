import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { bffRequest } from "@/lib/bff-client";

const PORTAL = BFF_OCCUPATIONAL_HEALTH_ROUTES.employerPortal;
const ADMIN = BFF_OCCUPATIONAL_HEALTH_ROUTES.ohEmployerPortalAdmin;

export const PORTAL_GROUP = "OHEmployerPortal";
const STAFF_GROUPS = ["OccupationalHealth", "Occupational health"];

export type PortalScope = "fitness" | "random_compliance" | "invoices" | "requests" | "users";
export const PORTAL_SCOPES: PortalScope[] = ["fitness", "random_compliance", "invoices", "requests", "users"];
export const PORTAL_SCOPE_LABEL: Record<PortalScope, string> = {
  fitness: "Fit for work",
  random_compliance: "Random testing",
  invoices: "Invoices",
  requests: "Requests",
  users: "Employees",
};

/** Employer contacts only: in the portal group, not OH staff, not an administrator. */
export function isPortalOnlyUser(user: { groups?: string[] | null; is_admin?: boolean } | null | undefined): boolean {
  if (!user || user.is_admin) return false;
  const groups = user.groups ?? [];
  return groups.includes(PORTAL_GROUP) && !groups.some((g) => STAFF_GROUPS.includes(g));
}

export type PortalBranding = {
  display_name: string;
  accent_color: string;
  logo_data_uri: string | null;
  welcome_text: string;
  support_email: string;
};
export type PortalMe = {
  name: string;
  employer: { uuid: string; name: string };
  scopes: PortalScope[];
  branding?: PortalBranding;
};
export type PortalInvitation = {
  uuid: string;
  email: string;
  name: string;
  employer_uuid: string;
  employer_name: string;
  scopes: PortalScope[];
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_at: string | null;
  email_sent: boolean;
  created_at: string | null;
};
export type PortalInviteResult = { linked: boolean; invite?: PortalInvitation; accept_url?: string };
export type PortalWorkspace = {
  id: number;
  uuid: string;
  name: string;
  key: string;
  /** Organisation logo from Settings > Organization. Empty when none is set. */
  logo_url?: string;
};

export type PortalInviteInfo = {
  email: string;
  name: string;
  employer_name: string;
  organisation: string;
  workspace?: string;
  expires_at: string;
  branding: PortalBranding | null;
};

export type PortalFitStatus = "fit" | "fit_with_restrictions" | "not_fit" | "awaiting";
export type PortalWorker = {
  customer_uuid: string;
  worker: string;
  employee_number: string;
  site: string;
  department: string;
  status: PortalFitStatus;
  valid_until: string | null;
  due_soon: boolean;
};
export type PortalFitness = {
  employer_name: string;
  counts: Record<PortalFitStatus | "due_soon", number>;
  results: PortalWorker[];
};
export type PortalCompliance = {
  pool: string;
  year: number;
  average_population: number;
  draws: number;
  drug_tests_done: number;
  drug_tests_required: number;
  alcohol_tests_done: number;
  alcohol_tests_required: number;
  on_track: boolean;
};
export type PortalInvoice = {
  uuid: string;
  number: string;
  date: string | null;
  account: string;
  amount_total: string;
  amount_paid: string;
  amount_due: string;
  payment_status: "not_paid" | "partially_paid" | "paid";
  services?: string[];
  payment_notice?: {
    status: "submitted" | "confirmed" | "rejected";
    payment_reference: string;
    staff_note?: string;
  } | null;
};
export type PortalPaymentNotice = {
  uuid: string;
  employer_uuid: string;
  employer_name?: string;
  invoice_uuid: string;
  invoice_number: string;
  amount_due: string;
  payment_reference: string;
  note: string;
  status: "submitted" | "confirmed" | "rejected";
  staff_note: string;
  submitted_by: string;
};
export type PortalColleague = { name: string; email: string; scopes: PortalScope[] };
export type PortalRequestKind = "medical" | "drug_alcohol_test" | "health_check" | "fit_test" | "training" | "other";
export type PortalRequest = {
  uuid: string;
  kind: PortalRequestKind;
  customer_uuid: string | null;
  worker_name: string;
  preferred_date: string | null;
  note: string;
  status: "pending" | "accepted" | "done" | "declined" | "cancelled";
  staff_note: string | null;
  requested_by_name: string;
  created_at: string | null;
  handled_at: string | null;
  handled_by_initials?: string | null;
  employer_name?: string | null;
};
export type PortalContact = {
  uuid: string;
  email: string;
  name: string;
  employer_uuid: string;
  employer_name: string;
  scopes: PortalScope[];
  billing_customers: Array<{ uuid: string; name: string }>;
  is_active: boolean;
  /** Latest portal sign-in (ISO). Absent until the OH service reports it. */
  last_signed_in_at?: string | null;
};

type Results<T> = { results: T[] };
const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const fetchPortalMe = () => bffRequest<PortalMe>(`${PORTAL}/me`);
export const fetchPortalFitness = (status?: string, q?: string) => bffRequest<PortalFitness>(`${PORTAL}/fitness${qs({ status, q })}`);
export const fetchPortalCompliance = (year?: number) =>
  bffRequest<Results<PortalCompliance>>(`${PORTAL}/random-compliance${qs({ year: year ? String(year) : undefined })}`).then((r) => r.results);
export const portalInvoicePdfUrl = (uuid: string) => `${PORTAL}/invoices/${uuid}/pdf`;
export const fetchPortalInvitations = () => bffRequest<Results<PortalInvitation>>(`${ADMIN}/invitations`).then((r) => r.results);
export const invitePortalContact = (body: {
  email: string;
  name?: string;
  employer_uuid: string;
  scopes: PortalScope[];
  billing_customer_uuids?: string[];
}) => bffRequest<PortalInviteResult>(`${ADMIN}/invitations`, { method: "POST", body });
export const revokePortalInvitation = (uuid: string) =>
  bffRequest<PortalInvitation>(`${ADMIN}/invitations/${uuid}/revoke`, { method: "POST", body: {} });
export const fetchPortalBranding = () => bffRequest<PortalBranding>(`${ADMIN}/branding`);
/** Copies the Settings > Organization logo into the portal branding. */
export const syncOrganizationLogo = () => bffRequest<PortalBranding>(`${ADMIN}/branding/organization-logo`, { method: "POST" });
export const savePortalBranding = (body: Partial<PortalBranding>) =>
  bffRequest<PortalBranding>(`${ADMIN}/branding`, { method: "PATCH", body });
export const fetchPortalInvoices = () => bffRequest<Results<PortalInvoice>>(`${PORTAL}/invoices`).then((r) => r.results);
export const submitPortalPaymentNotice = (uuid: string, paymentReference: string, note?: string) =>
  bffRequest<PortalPaymentNotice>(`${PORTAL}/invoices/${uuid}/payment-notice`, {
    method: "POST",
    body: { payment_reference: paymentReference, note },
  });
export const fetchStaffEmployerInvoices = (employerUuid: string) =>
  bffRequest<Results<PortalInvoice>>(`${ADMIN}/employers/${employerUuid}/invoices`).then((r) => r.results);
export const sendPortalInvoice = (body: {
  employer_uuid: string;
  customer_uuid: string;
  lines: Array<{ product_uuid: string; quantity: number; price_unit?: number }>;
}) => bffRequest<PortalInvoice>(`${ADMIN}/invoices`, { method: "POST", body });
export const fetchStaffPaymentNotices = (status = "submitted") =>
  bffRequest<Results<PortalPaymentNotice>>(`${ADMIN}/payment-notices${qs({ status })}`).then((r) => r.results);
export const markPortalPaymentPaid = (uuid: string) =>
  bffRequest<PortalPaymentNotice>(`${ADMIN}/payment-notices/${uuid}/mark-paid`, { method: "POST", body: {} });
export const rejectPortalPaymentNotice = (uuid: string, note?: string) =>
  bffRequest<PortalPaymentNotice>(`${ADMIN}/payment-notices/${uuid}/reject`, { method: "POST", body: { note } });
export const fetchPortalUsers = () => bffRequest<Results<PortalColleague>>(`${PORTAL}/users`).then((r) => r.results);
export const fetchPortalRequests = () => bffRequest<Results<PortalRequest>>(`${PORTAL}/requests`).then((r) => r.results);
export const createPortalRequest = (body: {
  kind: PortalRequestKind;
  customer_uuid?: string;
  worker_name?: string;
  preferred_date?: string;
  note?: string;
}) => bffRequest<PortalRequest>(`${PORTAL}/requests`, { method: "POST", body });

export const fetchStaffPortalRequests = (status?: string) =>
  bffRequest<Results<PortalRequest>>(`${ADMIN}/requests${qs({ status })}`).then((r) => r.results);
export const handlePortalRequest = (uuid: string, status: "accepted" | "done" | "declined", note?: string) =>
  bffRequest<PortalRequest>(`${ADMIN}/requests/${uuid}`, { method: "POST", body: { status, note } });
export const fetchPortalContacts = () => bffRequest<Results<PortalContact>>(`${ADMIN}/contacts`).then((r) => r.results);
export const linkPortalContact = (body: { email: string; employer_uuid: string; scopes: PortalScope[]; billing_customer_uuids?: string[] }) =>
  bffRequest<PortalContact>(`${ADMIN}/contacts`, { method: "POST", body });
export const updatePortalContact = (uuid: string, body: { scopes?: PortalScope[]; billing_customer_uuids?: string[]; is_active?: boolean }) =>
  bffRequest<PortalContact>(`${ADMIN}/contacts/${uuid}`, { method: "PATCH", body });

export const FIT_STATUS_LABEL: Record<PortalFitStatus, string> = {
  fit: "Fit",
  fit_with_restrictions: "Fit with limits",
  not_fit: "Not fit",
  awaiting: "Not yet assessed",
};
export const REQUEST_KIND_LABEL: Record<PortalRequestKind, string> = {
  medical: "Medical",
  drug_alcohol_test: "Drug & alcohol test",
  health_check: "Health check",
  fit_test: "Mask fit test",
  training: "Training",
  other: "Other",
};
export const REQUEST_STATUS_LABEL: Record<PortalRequest["status"], string> = {
  pending: "Waiting",
  accepted: "Accepted",
  done: "Done",
  declined: "Declined",
  cancelled: "Cancelled",
};
export const INVOICE_STATUS_LABEL: Record<PortalInvoice["payment_status"], string> = {
  not_paid: "Not paid",
  partially_paid: "Part paid",
  paid: "Paid",
};
