import { bffError, bffNoContent, bffSuccess } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";
import {
  OH_SERVICE_URL,
  ohServiceRequest,
  ohServiceRequestWithMeta,
} from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

const LIST_QUERY_KEYS = ["page", "page_size"] as const;

function buildQuery(request: Request, extraKeys: readonly string[] = []): string {
  const incoming = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const key of [...LIST_QUERY_KEYS, ...extraKeys]) {
    const value = incoming.get(key);
    if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}


/** GET that returns a single JSON object/array as-is (not wrapped in { results }). */
export function createOccupationalHealthQueryHandlers(
  resourcePath: string,
  extraQueryKeys: readonly string[] = [],
) {
  return {
    async GET(request: Request) {
      try {
        const auth = await requireAccessToken();
        if ("error" in auth) {
          return auth.error;
        }

        const query = buildQuery(request, extraQueryKeys);
        const data = await ohServiceRequest<unknown>(
          `${resourcePath}${query}`,
          { token: auth.accessToken },
        );

        return bffSuccess(data);
      } catch (error) {
        return bffError(error);
      }
    },

    async POST(request: Request) {
      try {
        const auth = await requireAccessToken();
        if ("error" in auth) {
          return auth.error;
        }

        const body = await request.json().catch(() => ({}));
        const data = await ohServiceRequest<unknown>(resourcePath, {
          method: "POST",
          token: auth.accessToken,
          body,
        });

        return bffSuccess(data, 201);
      } catch (error) {
        return bffError(error);
      }
    },
  };
}

export function createOccupationalHealthListHandlers(
  collectionPath: string,
  extraQueryKeys: readonly string[] = [],
) {
  return {
    async GET(request: Request) {
      try {
        const auth = await requireAccessToken();
        if ("error" in auth) {
          return auth.error;
        }

        const query = buildQuery(request, extraQueryKeys);
        const { data, meta } = await ohServiceRequestWithMeta<unknown[]>(
          `${collectionPath}${query}`,
          { token: auth.accessToken },
        );

        return bffSuccess({
          results: data,
          pagination: meta.pagination ?? null,
        });
      } catch (error) {
        return bffError(error);
      }
    },

    async POST(request: Request) {
      try {
        const auth = await requireAccessToken();
        if ("error" in auth) {
          return auth.error;
        }

        const body = await request.json();
        const data = await ohServiceRequest<unknown>(collectionPath, {
          method: "POST",
          token: auth.accessToken,
          body,
        });

        return bffSuccess(data, 201);
      } catch (error) {
        return bffError(error);
      }
    },
  };
}

export function createOccupationalHealthDetailHandlers(
  detailPath: (uuid: string) => string,
) {
  return {
    async GET(_request: Request, context: { params: Promise<{ uuid: string }> }) {
      try {
        const auth = await requireAccessToken();
        if ("error" in auth) {
          return auth.error;
        }

        const { uuid } = await context.params;
        const data = await ohServiceRequest<unknown>(detailPath(uuid), {
          token: auth.accessToken,
        });

        return bffSuccess(data);
      } catch (error) {
        return bffError(error);
      }
    },

    async PATCH(request: Request, context: { params: Promise<{ uuid: string }> }) {
      try {
        const auth = await requireAccessToken();
        if ("error" in auth) {
          return auth.error;
        }

        const { uuid } = await context.params;
        const body = await request.json();
        const data = await ohServiceRequest<unknown>(detailPath(uuid), {
          method: "PATCH",
          token: auth.accessToken,
          body,
        });

        return bffSuccess(data);
      } catch (error) {
        return bffError(error);
      }
    },

    async DELETE(
      _request: Request,
      context: { params: Promise<{ uuid: string }> },
    ) {
      try {
        const auth = await requireAccessToken();
        if ("error" in auth) {
          return auth.error;
        }

        const { uuid } = await context.params;
        await ohServiceRequest<null>(detailPath(uuid), {
          method: "DELETE",
          token: auth.accessToken,
        });

        return bffNoContent();
      } catch (error) {
        return bffError(error);
      }
    },
  };
}

export async function ohComplianceExtractHandler(extractPath: string) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    if (!OH_SERVICE_URL) {
      throw new HmisApiError("OH_SERVICE_URL is not configured on the server.");
    }

    const response = await fetch(`${OH_SERVICE_URL}${extractPath.replace(/\/+$/, "")}`, {
      method: "POST",
      headers: {
        accept: "text/csv, application/json",
        "X-HMIS-Session": auth.accessToken,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      let message = "Compliance extract failed.";
      try {
        const json = (await response.json()) as { message?: string; detail?: string };
        message = json.message ?? json.detail ?? message;
      } catch {
        // The error body was not JSON.
      }
      throw new HmisApiError(message, response.status);
    }

    const csvText = await response.text();
    const disposition =
      response.headers.get("Content-Disposition") ??
      'attachment; filename="oh-compliance.csv"';

    return new Response(csvText, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": disposition,
      },
    });
  } catch (error) {
    return bffError(error);
  }
}

export async function ohComplianceDashboardHandler(dashboardPath: string) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const data = await ohServiceRequest<Record<string, number>>(dashboardPath, {
      token: auth.accessToken,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function ohCampaignQueueHandler(queuePath: string) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const data = await ohServiceRequest<unknown[]>(queuePath, {
      token: auth.accessToken,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function ohHrFitnessHandler(fitnessPath: string, request: Request) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const query = new URL(request.url).search;
    const data = await ohServiceRequest<unknown[]>(`${fitnessPath}${query}`, {
      token: auth.accessToken,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function ohStatutoryPackHandler(packPath: string) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const data = await ohServiceRequest<Record<string, unknown>>(packPath, {
      token: auth.accessToken,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function ohProxyGetHandler(
  apiPath: string,
  request?: Request,
  queryKeys: readonly string[] = [],
) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const query = request ? buildQuery(request, queryKeys) : "";
    const data = await ohServiceRequest<unknown>(`${apiPath}${query}`, {
      token: auth.accessToken,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function ohProxyPostHandler(
  apiPath: string,
  request: Request,
  successStatus = 200,
) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const data = await ohServiceRequest<unknown>(apiPath, {
      method: "POST",
      token: auth.accessToken,
      body,
    });
    return bffSuccess(data, successStatus);
  } catch (error) {
    return bffError(error);
  }
}

export async function ohSummaryGetHandler(apiPath: string) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const data = await ohServiceRequest<Record<string, number>>(apiPath, {
      token: auth.accessToken,
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
