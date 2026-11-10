import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { ohProxyPostHandler } from "@/lib/server/occupational-health-bff";

const COPILOT_TIMEOUT_MS = 120_000;

type RouteContext = { params: Promise<{ customerUuid: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { customerUuid } = await context.params;
  return ohProxyPostHandler(
    OCCUPATIONAL_HEALTH_API_PATHS.ohImmCatchUp(customerUuid),
    request,
    200,
    COPILOT_TIMEOUT_MS,
  );
}
