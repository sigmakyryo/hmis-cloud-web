import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { ohProxyGetHandler } from "@/lib/server/occupational-health-bff";

type RouteContext = {
  params: Promise<{ visitUuid: string; encounterUuid: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { visitUuid, encounterUuid } = await context.params;
  return ohProxyGetHandler(
    OCCUPATIONAL_HEALTH_API_PATHS.encounterHistory(visitUuid, encounterUuid),
    request,
    ["history_encounter_uuid"],
  );
}
