import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

export async function nativeOhVisitPost(request: Request) {
  const start = Date.now();
  let status = 500;
  let errorClass: string | null = null;
  try {
    const auth = await requireAccessToken();
    if ("error" in auth && auth.error) { status = auth.error.status; return auth.error; }
    const data = await ohServiceRequest("/oh/visits", {
      method: "POST", token: auth.accessToken, body: await request.json(),
    });
    status = 200;
    return bffSuccess(data);
  } catch (error) {
    errorClass = error instanceof Error ? error.name : "UnknownError";
    const response = bffError(error);
    status = response.status;
    return response;
  } finally {
    console.info("OH visit BFF outcome", { status, duration_ms: Date.now() - start, error_class: errorClass });
  }
}
