import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

type RouteContext = { params: Promise<{ encounterUuid: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const { encounterUuid } = await context.params;
    const data = await ohServiceRequest<unknown>(
      OCCUPATIONAL_HEALTH_API_PATHS.opdIodByEncounter(encounterUuid),
      { token: auth.accessToken },
    );
    return bffSuccess(data ?? null);
  } catch (error) {
    return bffError(error);
  }
}
