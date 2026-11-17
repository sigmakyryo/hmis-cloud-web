import { OH_WORKSPACE_AREAS } from "@/features/occupational-health/lib/oh-workspace-layout";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

async function proxy(request: Request) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const updating = request.method === "PUT";
    const result = await ohServiceRequest("/oh/workspace-layout", {
      method: updating ? "PUT" : "GET",
      token: auth.accessToken,
      body: updating ? await request.json() : undefined,
    });
    return bffSuccess(result);
  } catch (error) {
    // GET: keep the shell usable when OH is unreachable or rejects a local token.
    // Do not surface upstream auth noise as a clinic session expiry.
    if (
      request.method === "GET" &&
      error instanceof HmisApiError &&
      (error.status === 403 ||
        error.status === 404 ||
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504)
    ) {
      return bffSuccess({ included: [...OH_WORKSPACE_AREAS] });
    }
    return bffError(error);
  }
}

export { proxy as GET, proxy as PUT };
