import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

type Ctx = { params: Promise<{ taskUuid: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const { taskUuid } = await context.params;
    
    const data = await ohServiceRequest(
      OCCUPATIONAL_HEALTH_API_PATHS.ohImmTaskHierarchy(taskUuid),
      { method: "GET", token: auth.accessToken },
    );
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
