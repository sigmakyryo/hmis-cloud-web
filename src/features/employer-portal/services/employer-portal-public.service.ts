import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import type { PortalBranding, PortalInviteInfo, PortalWorkspace } from "@/features/employer-portal/services/employer-portal.service";

const BASE = BFF_OCCUPATIONAL_HEALTH_ROUTES.employerPortalPublic;

export class PortalPublicError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "PortalPublicError";
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, { cache: "no-store", credentials: "include", ...init });
  const payload = (await res.json().catch(() => ({}))) as { data?: T; detail?: string };
  if (!res.ok) throw new PortalPublicError(payload.detail || "Request failed.", res.status);
  return payload.data as T;
}

/**
 * True when the occupational health service answered "no such route" rather than "no such organisation".
 * An OH service from before company addresses existed behaves this way, and a wrong address does not.
 */
export function isWorkspaceRouteMissing(error: unknown): boolean {
  return error instanceof PortalPublicError && error.status === 404 && /route .* could not be found/i.test(error.message);
}

/** "sigma-clinic-12" becomes "Sigma Clinic". Used only when the service cannot name the organisation. */
export function workspaceDisplayName(key: string): string {
  return key
    .replace(/-\d+$/, "")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export type PortalSignInChoice = { tenant_uuid: string; organisation: string };
export type PortalSignInResult = { email?: string; name?: string; workspace?: string; choices?: PortalSignInChoice[] };

export const fetchWorkspace = (key: string) => call<PortalWorkspace>(`workspaces/${encodeURIComponent(key)}`);
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
