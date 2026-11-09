import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { OH_SERVICE_URL } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";
import { bffError } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";

type Ctx = { params: Promise<{ uuid: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }
    if (!OH_SERVICE_URL) {
      throw new HmisApiError("OH_SERVICE_URL is not configured on the server.");
    }
    const { uuid } = await context.params;
    const response = await fetch(
      `${OH_SERVICE_URL}${OCCUPATIONAL_HEALTH_API_PATHS.ohImmCertificatePrint(uuid)}`,
      {
        method: "GET",
        headers: {
          accept: "text/html, application/json",
          "X-HMIS-Session": auth.accessToken,
        },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      throw new HmisApiError("Certificate print failed.", response.status);
    }
    const html = await response.text();
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    return bffError(error);
  }
}
