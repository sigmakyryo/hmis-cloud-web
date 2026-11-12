import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { OH_SERVICE_URL } from "@/lib/server/oh-service";
import { requireAccessToken } from "@/lib/server/require-access-token";
import { bffError } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";

export async function GET() {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    if (!OH_SERVICE_URL) throw new HmisApiError("OH_SERVICE_URL is not configured on the server.");
    const response = await fetch(`${OH_SERVICE_URL}${OCCUPATIONAL_HEALTH_API_PATHS.ohImmFhirNdjson}`, {
      method: "GET",
      headers: { accept: "application/fhir+ndjson, application/json", "X-HMIS-Session": auth.accessToken },
      cache: "no-store",
    });
    if (!response.ok) throw new HmisApiError("FHIR export failed.", response.status);
    return new Response(await response.text(), {
      status: 200,
      headers: {
        "Content-Type": "application/fhir+ndjson",
        "Content-Disposition": 'attachment; filename="oh-imm-fhir.ndjson"',
      },
    });
  } catch (error) {
    return bffError(error);
  }
}
