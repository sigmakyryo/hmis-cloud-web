import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { createOccupationalHealthListHandlers } from "@/lib/server/occupational-health-bff";

// OHS: POST only (assign a task).
const handlers = createOccupationalHealthListHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.ohImmTaskAssignments,
);

export const POST = handlers.POST;
