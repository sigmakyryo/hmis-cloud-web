import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

export async function POST(
  request: Request,
  context: { params: Promise<{ uuid: string }> },
) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const { uuid } = await context.params;
    const body = await request.json().catch(() => ({}));
    const data = await ohServiceRequest(
      OCCUPATIONAL_HEALTH_API_PATHS.ohImmRecallLot(uuid),
      { method: "POST", token: auth.accessToken, body },
    );
    return bffSuccess(data);
  } catch (error) {
    return bffError(error);
  }
}
