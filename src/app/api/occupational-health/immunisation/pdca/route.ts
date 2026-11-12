import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { createOccupationalHealthQueryHandlers } from "@/lib/server/occupational-health-bff";

const handlers = createOccupationalHealthQueryHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.ohImmPdca,
);

export const GET = handlers.GET;
