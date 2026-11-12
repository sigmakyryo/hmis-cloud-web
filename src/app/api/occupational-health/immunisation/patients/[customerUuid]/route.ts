import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

export async function GET(
  _request: Request,
  context: { params: Promise<{ customerUuid: string }> },
) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const { customerUuid } = await context.params;
    const data = await ohServiceRequest(
      OCCUPATIONAL_HEALTH_API_PATHS.ohImmPatient(customerUuid),
      { token: auth.accessToken },
    );
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
