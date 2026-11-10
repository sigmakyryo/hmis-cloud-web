import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { ohProxyPostHandler } from "@/lib/server/occupational-health-bff";

const COPILOT_TIMEOUT_MS = 120_000;

type RouteContext = { params: Promise<{ visitUuid: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { visitUuid } = await context.params;
  return ohProxyPostHandler(
    OCCUPATIONAL_HEALTH_API_PATHS.ohVisitCopilotChat(visitUuid),
    request,
    200,
    COPILOT_TIMEOUT_MS,
  );
}
