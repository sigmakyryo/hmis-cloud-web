import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import type { PortalBranding, PortalInviteInfo } from "@/features/employer-portal/services/employer-portal.service";

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.employerPortalPublic;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, { cache: "no-store", credentials: "include", ...init });
  const payload = (await res.json().catch(() => ({}))) as { data?: T; detail?: string };
  if (!res.ok) throw new Error(payload.detail || "Request failed.");
  return payload.data as T;
}

export type PortalSignInChoice = { tenant_uuid: string; organisation: string };
export type PortalSignInResult = { email?: string; name?: string; choices?: PortalSignInChoice[] };

export const fetchPublicBranding = (tenantUuid: string) => call<PortalBranding>(`branding/${encodeURIComponent(tenantUuid)}`);
export const fetchInvitation = (token: string) => call<PortalInviteInfo>(`invitation?token=${encodeURIComponent(token)}`);
export const acceptInvitation = (body: { token: string; name?: string; password: string }) =>
  call<{ email: string | null }>("invitation/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export const signInToPortal = (body: { email: string; password: string; tenant_uuid?: string }) =>
  call<PortalSignInResult>("session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
