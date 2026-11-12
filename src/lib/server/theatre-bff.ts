import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequest, hmisApiRequestWithMeta } from "@/lib/server/hmis-api";
import { requireAccessToken } from "@/lib/server/require-access-token";

export const THEATRE_QUERY_KEYS = [
  "page",
  "page_size",
  "clinic",
  "department",
  "room",
  "status",
  "stay",
  "visit",
  "encounter",
  "source",
  "date",
  "date_from",
  "date_to",
  "session_hours",
  "return_window_days",
  "customer",
  "include_inactive",
] as const;

export function buildTheatreQuery(request: Request): string {
  const incoming = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const key of THEATRE_QUERY_KEYS) {
    const value = incoming.get(key);
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function theatreGet(request: Request, upstreamPath: string) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const query = buildTheatreQuery(request);
    const { data } = await hmisApiRequestWithMeta(`${upstreamPath}${query}`, {
      token: auth.accessToken,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function theatreMutate(
  request: Request,
  upstreamPath: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE" = "POST",
) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const body =
      method === "DELETE" ? undefined : await request.json().catch(() => ({}));
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
