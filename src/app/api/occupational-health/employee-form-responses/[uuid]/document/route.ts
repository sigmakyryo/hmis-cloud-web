import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

type RouteContext = { params: Promise<{ uuid: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const { uuid } = await context.params;
    const data = await ohServiceRequest(OCCUPATIONAL_HEALTH_API_PATHS.ohEmployeeFormDocument(uuid), {
      method: "POST",
      token: auth.accessToken,
      body: await request.formData(),
    });
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
