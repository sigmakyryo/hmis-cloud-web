import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { ohProxyPostHandler } from "@/lib/server/occupational-health-bff";

export function POST(request: Request) {
  return ohProxyPostHandler(OCCUPATIONAL_HEALTH_API_PATHS.ohImmRecallDraft, request, 200, 120_000);
}
