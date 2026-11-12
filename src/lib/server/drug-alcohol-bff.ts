import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";
import { OH_SERVICE_URL, ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

export type DrugAlcoholMethod = "GET" | "POST" | "PATCH";

const ID = "[A-Za-z0-9-]{8,64}";
const rx = (pattern: string) => new RegExp(`^${pattern.replaceAll("{id}", ID)}$`);

/**
 * Explicit allowlist of OHS drug & alcohol endpoints reachable through the BFF.
 * The signed lab callback is server-to-server only and is never proxied.
 */
const RULES: Record<DrugAlcoholMethod, RegExp[]> = {
  GET: [
    "policies",
    "policies/{id}",
    "pools",
    "pools/{id}/preview",
    "draws",
    "random/compliance",
    "rtd",
    "rtd/{id}",
    "tests",
    "tests/{id}",
    "tests/{id}/ccf\\.pdf",
    "tests/{id}/letter\\.pdf",
    "visits/{id}/panel",
    "patients/{id}",
    "fitness-gate",
    "der/status",
    "due",
    "mro/queue",
    "mro/{id}",
    "reports",
    "reports\\.csv",
    "audits",
    "notifications",
    "risk/pools",
    "risk/proposals",
    "draws/{id}/verify",
    "anomalies",
  ].map(rx),
  POST: [
    "policies",
    "policies/seed-examples",
    "policies/{id}/publish",
    "pools",
    "pools/{id}/draw",
    "selections/{id}/(notify|no-show|excuse)",
    "rtd/{id}/(sap|plan)",
    "tests",
    "tests/{id}/(consent|custody|shy|alcohol|screen|refusal|cancel|lab-results)",
    "mro/{id}/(interview|verify|split-request|split-result)",
    "retention",
    "risk/pools/{id}/propose",
    "risk/proposals/{id}/(approve|reject)",
    "anomalies/scan",
    "anomalies/{id}/(review|dismiss)",
  ].map(rx),
  PATCH: ["pools/{id}", "risk/pools/{id}"].map(rx),
};

const BINARY: Array<{ pattern: RegExp; type: string; filename: string }> = [
  { pattern: rx("tests/{id}/ccf\\.pdf"), type: "application/pdf", filename: "custody-form.pdf" },
  { pattern: rx("tests/{id}/letter\\.pdf"), type: "application/pdf", filename: "result-letter.pdf" },
  { pattern: rx("reports\\.csv"), type: "text/csv; charset=utf-8", filename: "drug-alcohol-report.csv" },
];

export const DRUG_ALCOHOL_QUERY_KEYS = [
  "status",
  "reason",
  "customer_uuid",
  "customer_uuids",
  "visit_uuid",
  "fitness",
  "q",
  "limit",
  "within",
  "kind",
  "include_closed",
  "from",
  "to",
  "employer_uuid",
  "entity_type",
  "entity_uuid",
  "action",
  "pool_uuid",
  "year",
  "audience",
] as const;

const SEGMENT = /^[A-Za-z0-9._-]{1,80}$/;

/** Returns the OHS path (without query) for an allowed request, or null. */
export function resolveDrugAlcoholPath(
  method: DrugAlcoholMethod,
  segments: readonly string[],
): { path: string; binary: (typeof BINARY)[number] | null } | null {
  if (segments.length === 0 || segments.some((s) => !SEGMENT.test(s) || s === "." || s === "..")) {
    return null;
  }
  const rel = segments.join("/");
  if (!RULES[method].some((rule) => rule.test(rel))) {
    return null;
  }
  const binary = method === "GET" ? (BINARY.find((b) => b.pattern.test(rel)) ?? null) : null;
  return { path: `${OCCUPATIONAL_HEALTH_API_PATHS.ohDa}/${rel}`, binary };
}

export function drugAlcoholQuery(request: Request): string {
  const incoming = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const key of DRUG_ALCOHOL_QUERY_KEYS) {
    const value = incoming.get(key);
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Object-style passthrough (Laravel data returned as-is), binary passthrough for PDF / CSV. */
export async function drugAlcoholProxy(
  method: DrugAlcoholMethod,
  request: Request,
  segments: readonly string[],
): Promise<Response> {
  try {
    const resolved = resolveDrugAlcoholPath(method, segments);
    if (!resolved) {
      return Response.json({ message: "Not found." }, { status: 404 });
    }
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error ?? Response.json({ message: "Please sign in again." }, { status: 401 });
    }
    const query = drugAlcoholQuery(request);

    if (resolved.binary) {
      if (!OH_SERVICE_URL) {
        throw new HmisApiError("OH_SERVICE_URL is not configured on the server.");
      }
      const upstream = await fetch(`${OH_SERVICE_URL}${resolved.path}${query}`, {
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
    const data = await ohServiceRequest<unknown>(`${resolved.path}${query}`, {
      method,
      token: auth.accessToken,
      ...(method === "GET" ? {} : { body }),
    });
    return bffSuccess(data, method === "POST" && segments.length === 1 && segments[0] !== "retention" ? 201 : 200);
  } catch (error) {
    return bffError(error);
  }
}
