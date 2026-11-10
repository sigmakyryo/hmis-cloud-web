import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { OH_SERVICE_URL } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";
import { bffError } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";

export async function GET() {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }
    if (!OH_SERVICE_URL) {
      throw new HmisApiError("OH_SERVICE_URL is not configured on the server.");
    }
    const response = await fetch(
      `${OH_SERVICE_URL}${OCCUPATIONAL_HEALTH_API_PATHS.ohImmComplianceCsv}`,
      {
        method: "GET",
        headers: {
          accept: "text/csv, application/json",
          "X-HMIS-Session": auth.accessToken,
        },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      let message = "Immunisation compliance export failed.";
      try {
        const json = (await response.json()) as { message?: string };
        message = json.message ?? message;
      } catch {
        // ignore
      }
      throw new HmisApiError(message, response.status);
    }
    const csvText = await response.text();
    return new Response(csvText, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          response.headers.get("Content-Disposition") ??
          'attachment; filename="oh-imm-compliance.csv"',
      },
    });
  } catch (error) {
    return bffError(error);
  }
}
