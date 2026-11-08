import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { createOccupationalHealthDetailHandlers } from "@/lib/server/occupational-health-bff";

const handlers = createOccupationalHealthDetailHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.employmentEpisode,
);

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
