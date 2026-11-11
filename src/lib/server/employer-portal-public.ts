import { NextResponse } from "next/server";

import { HmisApiError } from "@/lib/server/hmis-api";
import { ohServiceRequest } from "@/lib/server/oh-service";

/**
 * Unauthenticated employer portal endpoints (invitation accept, sign-in branding).
 * Strict allowlist; no session token is ever forwarded.
 */
const UUID = /^[0-9a-fA-F-]{32,36}$/;
const TOKEN = /^[A-Za-z0-9_-]{20,128}$/;

type Resolved = { path: string; method: "GET" | "POST" };

export function resolvePublicPortalPath(method: string, segments: string[], search: URLSearchParams): Resolved | null {
  const joined = segments.join("/");
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
  return null;
}

export async function handlePublicPortal(request: Request, segments: string[]): Promise<NextResponse> {
  const url = new URL(request.url);
  const resolved = resolvePublicPortalPath(request.method, segments, url.searchParams);
  if (!resolved) {
    return NextResponse.json({ detail: "Not found." }, { status: 404 });
  }
  let body: Record<string, unknown> | undefined;
  if (resolved.method === "POST") {
    try {
      const raw = (await request.json()) as Record<string, unknown>;
      body = { token: raw.token, name: raw.name, password: raw.password };
    } catch {
      return NextResponse.json({ detail: "Invalid request." }, { status: 400 });
    }
  }
  try {
    const data = await ohServiceRequest<unknown>(resolved.path, { method: resolved.method, body });
    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof HmisApiError && error.status ? error.status : 502;
    const detail = error instanceof Error ? error.message : "Request failed.";
    return NextResponse.json({ detail }, { status });
  }
}
