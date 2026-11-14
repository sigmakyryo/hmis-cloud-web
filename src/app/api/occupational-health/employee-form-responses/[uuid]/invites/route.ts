import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";
import { publicAppOrigin } from "@/lib/server/public-app-origin";

type RouteContext = { params: Promise<{ uuid: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const input: unknown = await request.json().catch(() => null);
    const sendEmail = typeof input === "object" && input !== null && "send_email" in input && input.send_email === true;
    const { uuid } = await context.params;
    const data = await ohServiceRequest(OCCUPATIONAL_HEALTH_API_PATHS.ohEmployeeFormInvites(uuid), {
      method: "POST",
      token: auth.accessToken,
      body: sendEmail ? { send_email: true, public_origin: publicAppOrigin(request) } : {},
    });
    return bffSuccess(data, 201);
  } catch (error) {
    return bffError(error);
  }
}
