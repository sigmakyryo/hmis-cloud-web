import { NextRequest } from "next/server";
import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { OH_SERVICE_URL } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";
import { bffError } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    if (!OH_SERVICE_URL) throw new HmisApiError("OH_SERVICE_URL is not configured on the server.");
    const qs = request.nextUrl.searchParams.toString();
    const response = await fetch(
      `${OH_SERVICE_URL}${OCCUPATIONAL_HEALTH_API_PATHS.ohImmDhisCsv}${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        headers: { accept: "text/csv, application/json", "X-HMIS-Session": auth.accessToken },
        cache: "no-store",
      },
    );
    if (!response.ok) throw new HmisApiError("DHIS2 export failed.", response.status);
    return new Response(await response.text(), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="oh-imm-dhis2.csv"',
      },
    });
  } catch (error) {
    return bffError(error);
  }
}
