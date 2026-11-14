import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

type RouteContext = { params: Promise<{ uuid: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const { uuid } = await context.params;
    const data = await ohServiceRequest<unknown>(
      OCCUPATIONAL_HEALTH_API_PATHS.iodCaseEntries(uuid),
      { token: auth.accessToken },
    );
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const { uuid } = await context.params;
    const data = await ohServiceRequest<unknown>(
      OCCUPATIONAL_HEALTH_API_PATHS.iodCaseEntries(uuid),
      { method: "POST", token: auth.accessToken, body: await request.json() },
    );
    return bffSuccess(data, 201);
  } catch (error) {
    return bffError(error);
  }
}
