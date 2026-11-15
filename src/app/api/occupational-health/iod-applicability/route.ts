import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

async function proxy(request: Request) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const updating = request.method === "PUT";
    const result = await ohServiceRequest("/oh/iod-applicability", {
      method: updating ? "PUT" : "GET",
      token: auth.accessToken,
      body: updating ? await request.json() : undefined,
    });
    return bffSuccess(result);
  } catch (error) {
    return bffError(error);
  }
}

export { proxy as GET, proxy as PUT };
