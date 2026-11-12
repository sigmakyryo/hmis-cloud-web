import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { createOccupationalHealthDetailHandlers } from "@/lib/server/occupational-health-bff";

const handlers = createOccupationalHealthDetailHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.ohImmExposure,
);

export const GET = handlers.GET;
