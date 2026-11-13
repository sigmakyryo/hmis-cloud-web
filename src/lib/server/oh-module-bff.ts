import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";
import { OH_SERVICE_URL, ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

export type OhModuleMethod = "GET" | "POST" | "PATCH";

export type OhModuleBinary = { pattern: RegExp; type: string; filename: string };

export type OhModuleConfig = {
  /** OHS base path, e.g. "/oh-fit". */
  base: string;
  /** Allowed relative paths per method; "{id}" matches a uuid-like segment. */
  rules: Partial<Record<OhModuleMethod, string[]>>;
  binary?: Array<{ path: string; type: string; filename: string }>;
  queryKeys: readonly string[];
  /** POST paths (relative) that answer 201 Created. */
  created?: string[];
};

const ID = "[A-Za-z0-9-]{8,64}";
const SEGMENT = /^[A-Za-z0-9._-]{1,80}$/;
export const ohRule = (pattern: string) => new RegExp(`^${pattern.replaceAll("{id}", ID)}$`);

/**
 * Builds an allowlisted catch-all proxy for one OHS module: method + path allowlist,
 * query-key allowlist, JSON passthrough and optional binary (PDF / CSV) passthrough.
 */
export function createOhModuleProxy(config: OhModuleConfig) {
  const rules: Record<OhModuleMethod, RegExp[]> = {
    GET: (config.rules.GET ?? []).map(ohRule),
    POST: (config.rules.POST ?? []).map(ohRule),
    PATCH: (config.rules.PATCH ?? []).map(ohRule),
  };
  const binary: OhModuleBinary[] = (config.binary ?? []).map((b) => ({ ...b, pattern: ohRule(b.path) }));
  const created = (config.created ?? []).map(ohRule);

  function resolve(method: OhModuleMethod, segments: readonly string[]) {
    if (segments.length === 0 || segments.some((s) => !SEGMENT.test(s) || s === "." || s === "..")) {
      return null;
    }
    const rel = segments.join("/");
    if (!rules[method].some((rule) => rule.test(rel))) {
      return null;
    }
    const bin = method === "GET" ? (binary.find((b) => b.pattern.test(rel)) ?? null) : null;
    return { path: `${config.base}/${rel}`, rel, binary: bin };
  }

  function query(request: Request): string {
    const incoming = new URL(request.url).searchParams;
    const params = new URLSearchParams();
    for (const key of config.queryKeys) {
      const values: string[] = [];
      const seen = new Set<string>();
      for (const value of [...incoming.getAll(key), ...incoming.getAll(`${key}[]`)]) {
        if (!value || seen.has(value)) continue;
        seen.add(value);
        values.push(value);
      }
      for (const value of values) {
        params.append(key, value);
      }
    }
    const text = params.toString();
    return text ? `?${text}` : "";
  }

  async function proxy(method: OhModuleMethod, request: Request, segments: readonly string[]): Promise<Response> {
    try {
      const resolved = resolve(method, segments);
      if (!resolved) {
        return Response.json({ message: "Not found." }, { status: 404 });
      }
      const auth = await requireAccessToken();
      if ("error" in auth) {
        return auth.error ?? Response.json({ message: "Please sign in again." }, { status: 401 });
      }
      const qs = query(request);
      if (resolved.binary) {
        if (!OH_SERVICE_URL) {
          throw new HmisApiError("OH_SERVICE_URL is not configured on the server.");
        }
        const upstream = await fetch(`${OH_SERVICE_URL}${resolved.path}${qs}`, {
          method: "GET",
          headers: { accept: `${resolved.binary.type}, application/json`, "X-HMIS-Session": auth.accessToken },
          cache: "no-store",
        });
        if (!upstream.ok) {
          let message = "Download failed.";
          try {
            const payload = (await upstream.json()) as { message?: string };
            if (payload.message) message = payload.message;
          } catch {
            // keep default
          }
          throw new HmisApiError(message, upstream.status);
        }
        return new Response(await upstream.arrayBuffer(), {
          status: 200,
          headers: {
            "Content-Type": resolved.binary.type,
            "Content-Disposition":
              upstream.headers.get("Content-Disposition") ?? `attachment; filename="${resolved.binary.filename}"`,
            "Cache-Control": "no-store",
          },
        });
      }
      let body: Record<string, unknown> = {};
      if (method !== "GET") {
        const parsed: unknown = await request.json().catch(() => ({}));
        body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
      }
      const data = await ohServiceRequest<unknown>(`${resolved.path}${qs}`, {
        method,
        token: auth.accessToken,
        ...(method === "GET" ? {} : { body }),
      });
      const status = method === "POST" && created.some((rule) => rule.test(resolved.rel)) ? 201 : 200;
      return bffSuccess(data, status);
    } catch (error) {
      return bffError(error);
    }
  }

  return { resolve, query, proxy };
}

export type OhModuleProxy = ReturnType<typeof createOhModuleProxy>;

/** Next route handlers for a catch-all `[...path]` route. */
export function ohModuleRouteHandlers(proxy: OhModuleProxy) {
  type Ctx = { params: Promise<{ path: string[] }> };
  return {
    GET: async (request: Request, context: Ctx) => proxy.proxy("GET", request, (await context.params).path ?? []),
    POST: async (request: Request, context: Ctx) => proxy.proxy("POST", request, (await context.params).path ?? []),
    PATCH: async (request: Request, context: Ctx) => proxy.proxy("PATCH", request, (await context.params).path ?? []),
  };
}
