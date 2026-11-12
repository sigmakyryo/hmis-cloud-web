import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { createOccupationalHealthListHandlers } from "@/lib/server/occupational-health-bff";

const handlers = createOccupationalHealthListHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.surveillanceRequirements,
  [
    "status",
    "site",
    "job",
    "department",
    "hazard",
    "hazard_profile",
    "due_before",
    "due_after",
  ],
);

export const GET = handlers.GET;
