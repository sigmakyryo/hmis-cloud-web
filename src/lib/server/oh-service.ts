import { createRequestId } from "@/lib/request-id";
import { HmisApiError } from "@/lib/server/hmis-api";
import {
  isV1Envelope,
  type V1Envelope,
} from "@/types/api.types";

const API_TIMEOUT_MS = 30_000;

type OhRequestOptions = {
  method?: string;
  body?: unknown | FormData;
  token?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export type OhRequestMeta = V1Envelope<unknown>["meta"];

export type OhRequestResult<T> = {
  data: T;
  meta: OhRequestMeta;
};

/**
 * Server-only Laravel occupational health base URL.
 * A host-only value gets `/api` appended.
 */
export function resolveOhServiceUrl(
  raw = process.env.OH_SERVICE_URL,
): string | undefined {
  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname === "/" || parsed.pathname === "") {
      return `${trimmed}/api`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export const OH_SERVICE_URL = resolveOhServiceUrl();

function normalizePath(path: string): string {
  const queryIndex = path.indexOf("?");
  const pathname = queryIndex === -1 ? path : path.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : path.slice(queryIndex);
  const cleaned = (pathname.startsWith("/") ? pathname : `/${pathname}`).replace(
    /\/+$/,
    "",
  );

  return `${cleaned || "/"}${query}`;
}

/**
 * Upstream OH 401 must not look like a clinic session expiry to the browser.
 * Local JWTs against a remote OH host (or a user OH has not provisioned) are
 * authorization failures — map them to 403 so handleSessionExpired stays put.
 */
function remapOhUnauthorizedStatus(status: number): number {
  return status === 401 ? 403 : status;
}

export async function ohServiceRequest<T>(
  path: string,
  options: OhRequestOptions = {},
): Promise<T> {
  const result = await ohServiceRequestWithMeta<T>(path, options);
  return result.data;
}

export async function ohServiceRequestWithMeta<T>(
  path: string,
  options: OhRequestOptions = {},
): Promise<OhRequestResult<T>> {
  if (!OH_SERVICE_URL) {
    throw new HmisApiError("OH_SERVICE_URL is not configured on the server.");
  }

  const { method = "GET", body, token, headers = {}, timeoutMs = API_TIMEOUT_MS } =
    options;
  const isFormData = body instanceof FormData;
  const requestId = createRequestId();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${OH_SERVICE_URL}${normalizePath(path)}`, {
      method,
      headers: {
        accept: "application/json",
        "X-Request-ID": requestId,
        ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "X-HMIS-Session": token } : {}),
        ...headers,
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status === 204) {
      return {
        data: undefined as T,
        meta: { request_id: requestId },
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (!response.ok) {
        throw new HmisApiError(
          response.status === 404
            ? "The occupational health endpoint was not found."
            : response.status >= 500
              ? "Something went wrong. Try again later."
              : "Request failed.",
          remapOhUnauthorizedStatus(response.status),
        );
      }

      return {
        data: undefined as T,
        meta: { request_id: requestId },
      };
    }

    if (isV1Envelope<T>(payload)) {
      const envelope = payload as V1Envelope<T>;

      if (!response.ok || !envelope.success) {
        const message =
          envelope.errors.length > 0
            ? envelope.errors.map((error) => error.message).join(" ")
            : envelope.message || "Request failed.";
        throw new HmisApiError(
          message,
          remapOhUnauthorizedStatus(response.status),
          envelope.errors,
        );
      }

      return {
        data: envelope.data,
        meta: envelope.meta,
      };
    }

    if (!response.ok) {
      const record =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : null;
      const message =
        (typeof record?.detail === "string" && record.detail) ||
        (typeof record?.message === "string" && record.message) ||
        "Request failed.";
      throw new HmisApiError(message, remapOhUnauthorizedStatus(response.status));
    }

    return {
      data: payload as T,
      meta: { request_id: requestId },
    };
  } catch (error) {
    if (error instanceof HmisApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HmisApiError("Request timed out. Please try again.", 504);
    }

    throw new HmisApiError("Something went wrong. Try again later.");
  } finally {
    clearTimeout(timeout);
  }
}
