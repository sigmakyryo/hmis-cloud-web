import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { createOccupationalHealthListHandlers } from "@/lib/server/occupational-health-bff";

const handlers = createOccupationalHealthListHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.ohImmNrSeedHepb,
);

export const POST = handlers.POST;
