import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { ohProxyPostHandler } from "@/lib/server/occupational-health-bff";
import { createOccupationalHealthListHandlers } from "@/lib/server/occupational-health-bff";

const handlers = createOccupationalHealthListHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.ohCofResponses,
);

export const GET = handlers.GET;

export async function POST(request: Request) {
  return ohProxyPostHandler(OCCUPATIONAL_HEALTH_API_PATHS.ohCofResponses, request, 201);
}
