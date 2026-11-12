import { HMIS_API_URL } from "@/constants/api";
import { CLINICAL_THEATRE_API_PATHS as PATHS } from "@/constants/clinical-theatre-api";
import { bffError } from "@/lib/server/bff-response";
import { HmisApiError } from "@/lib/server/hmis-api";
import { requireAccessToken } from "@/lib/server/require-access-token";
import { buildTheatreQuery } from "@/lib/server/theatre-bff";

/** Streams the implant recall CSV from Django (not JSON, so no envelope). */
export async function GET(request: Request) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) return auth.error;
    if (!HMIS_API_URL) {
      throw new HmisApiError("HMIS_API_URL is not configured on the server.");
    }
    const query = buildTheatreQuery(request);
    const response = await fetch(`${HMIS_API_URL}${PATHS.implantRecallExport}${query}`, {
      method: "GET",
      headers: {
        accept: "text/csv, application/json",
        Authorization: `Bearer ${auth.accessToken}`,
      },
      cache: "no-store",
    });
    if (!response.ok) {
      let message = "Implant recall export failed.";
      try {
        const json = (await response.json()) as { message?: string };
        message = json.message ?? message;
      } catch {
        // Non-JSON error body: keep the default message.
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
          'attachment; filename="implant-recall.csv"',
      },
    });
  } catch (error) {
    return bffError(error);
  }
}
