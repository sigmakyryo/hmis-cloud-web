import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { bffError, bffNoContent, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

type RouteContext = { params: Promise<{ uuid: string; entryUuid: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const { uuid, entryUuid } = await context.params;
    const data = await ohServiceRequest<unknown>(
      OCCUPATIONAL_HEALTH_API_PATHS.iodCaseEntry(uuid, entryUuid),
      { method: "PATCH", token: auth.accessToken, body: await request.json() },
    );
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const { uuid, entryUuid } = await context.params;
    await ohServiceRequest<unknown>(
      OCCUPATIONAL_HEALTH_API_PATHS.iodCaseEntry(uuid, entryUuid),
      { method: "DELETE", token: auth.accessToken },
    );
    return bffNoContent();
  } catch (error) {
    return bffError(error);
  }
}
