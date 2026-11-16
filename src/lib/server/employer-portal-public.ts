import { NextResponse } from "next/server";

import { AUTH_COOKIE_MAX_AGE_SECONDS, PORTAL_SESSION_COOKIE } from "@/constants/session";
import { HmisApiError } from "@/lib/server/hmis-api";
import { ohServiceRequest } from "@/lib/server/oh-service";

/**
 * Unauthenticated employer portal endpoints (invitation accept, company sign-in).
 * Strict allowlist. A clinic session is never forwarded.
 */
const UUID = /^[0-9a-fA-F-]{32,36}$/;
const TOKEN = /^[A-Za-z0-9_-]{20,128}$/;
const WORKSPACE = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/;

type Resolved = { path: string; method: "GET" | "POST" | "DELETE" };

const portalCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
};

export function resolvePublicPortalPath(method: string, segments: string[], search: URLSearchParams): Resolved | null {
  const joined = segments.join("/");
  if (method === "GET" && segments.length === 2 && segments[0] === "workspaces" && WORKSPACE.test(segments[1] ?? "")) {
    return { path: `/oh-portal-public/workspaces/${segments[1]}`, method: "GET" };
  }
  if (method === "GET" && segments.length === 2 && segments[0] === "branding" && UUID.test(segments[1])) {
    return { path: `/oh-portal-public/branding/${segments[1]}`, method: "GET" };
  }
  if (method === "GET" && joined === "invitation") {
    const token = search.get("token") ?? "";
    if (!TOKEN.test(token)) return null;
    return { path: `/oh-portal-public/invitation?token=${encodeURIComponent(token)}`, method: "GET" };
  }
  if (method === "POST" && joined === "invitation/accept") {
    return { path: "/oh-portal-public/invitation/accept", method: "POST" };
  }
  if (method === "POST" && joined === "session") {
    return { path: "/oh-portal-public/session", method: "POST" };
  }
  if (method === "DELETE" && joined === "session") {
    return { path: "/oh-portal-public/session", method: "DELETE" };
  }
  return null;
}

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") ?? "";
  const part = header
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  if (!part) return "";
  try {
    return decodeURIComponent(part.slice(name.length + 1));
  } catch {
    return "";
  }
}

export async function handlePublicPortal(request: Request, segments: string[]): Promise<NextResponse> {
  const url = new URL(request.url);
  const resolved = resolvePublicPortalPath(request.method, segments, url.searchParams);
  if (!resolved) {
    return NextResponse.json({ detail: "Not found." }, { status: 404 });
  }
  if (resolved.method === "DELETE") {
    const token = readCookie(request, PORTAL_SESSION_COOKIE);
    if (token) {
      await ohServiceRequest(resolved.path, {
        method: "DELETE",
        headers: { "X-OH-Portal-Session": token },
      }).catch(() => undefined);
    }
    const response = NextResponse.json({ data: null });
    response.cookies.set(PORTAL_SESSION_COOKIE, "", { ...portalCookie, maxAge: 0 });
    return response;
  }
  let body: Record<string, unknown> | undefined;
  if (resolved.method === "POST") {
    try {
      const raw = (await request.json()) as Record<string, unknown>;
      body = resolved.path.endsWith("/session")
        ? { email: raw.email, password: raw.password, tenant_uuid: raw.tenant_uuid }
        : { token: raw.token, name: raw.name, password: raw.password };
    } catch {
      return NextResponse.json({ detail: "Invalid request." }, { status: 400 });
    }
  }
  try {
    const data = await ohServiceRequest<Record<string, unknown>>(resolved.path, { method: resolved.method, body });
    if (resolved.path.endsWith("/session") && typeof data.token === "string" && data.token !== "") {
      const token = data.token;
      const safe = { ...data };
      delete safe.token;
      const response = NextResponse.json({ data: safe });
      response.cookies.set(PORTAL_SESSION_COOKIE, token, portalCookie);
      return response;
    }
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof HmisApiError && error.status ? error.status : 502;
    const detail = error instanceof Error ? error.message : "Request failed.";
    return NextResponse.json({ detail }, { status });
  }
}
