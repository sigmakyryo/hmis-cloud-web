import { CLAIMS_API_PATHS } from "@/constants/claims-api";
import type { ValidationDefinitionSummary } from "@/features/claims/types/claims.types";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { HmisApiError, hmisApiRequest } from "@/lib/server/hmis-api";
import { requireAccessToken } from "@/lib/server/require-access-token";

type RouteContext = {
  params: Promise<{ packCode: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAccessToken();
    if ("error" in auth) {
      return auth.error;
    }

    const { packCode } = await context.params;
    const definitions = await hmisApiRequest<ValidationDefinitionSummary[]>(
      CLAIMS_API_PATHS.validationPackDefinitions(packCode),
      {
        method: "GET",
        token: auth.accessToken,
      },
    );

    return bffSuccess({
      results: Array.isArray(definitions) ? definitions : [],
    });
  } catch (error) {
    if (error instanceof HmisApiError) {
      console.error("[claims/packs/definitions] HMIS API error", {
        status: error.status,
        message: error.message,
      });
    }
    return bffError(error);
  }
}
