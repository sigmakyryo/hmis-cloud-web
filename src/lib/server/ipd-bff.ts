import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest, hmisApiRequestWithMeta } from "@/lib/server/hmis-api";
import { requireAccessToken } from "@/lib/server/require-access-token";

const QUERY_KEYS = [
  "page",
  "page_size",
  "clinic",
  "ward",
  "ward_class",
  "status",
  "stay",
  "admission_source",
  "visit",
  "clinician",
  "q",
] as const;

export function buildIpdQuery(request: Request): string {
  const incoming = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const key of QUERY_KEYS) {
    const value = incoming.get(key);
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function ipdGet(request: Request, upstreamPath: string) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const query = buildIpdQuery(request);
    const { data } = await hmisApiRequestWithMeta(
      `${upstreamPath}${query}`,
      { token: auth.accessToken },
    );
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function ipdMutate(
  request: Request,
  upstreamPath: string,
  method: "POST" | "PATCH" = "POST",
) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const body = await request.json().catch(() => ({}));
    const data = await hmisApiRequest(upstreamPath, {
      token: auth.accessToken,
      method,
      body,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
