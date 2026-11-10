import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { createOccupationalHealthDetailHandlers } from "@/lib/server/occupational-health-bff";

const handlers = createOccupationalHealthDetailHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.fitnessCertificate,
);

export const GET = handlers.GET;
// Certificates change only through issue / amend / withdraw (OHS answers 405 to PATCH).
