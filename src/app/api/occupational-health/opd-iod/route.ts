import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { ohServiceRequest } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";

/** Records an injury on duty from an OPD encounter. Any clinician who can open the encounter may call it. */
export async function POST(request: Request) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    const data = await ohServiceRequest<unknown>(
      OCCUPATIONAL_HEALTH_API_PATHS.opdIodCases,
      { method: "POST", token: auth.accessToken, body: await request.json() },
    );
    return bffSuccess(data, 201);
  } catch (error) {
    return bffError(error);
  }
}
