import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { createOccupationalHealthListHandlers } from "@/lib/server/occupational-health-bff";

/** @deprecated Prefer /library-sections?kind=exam */
const handlers = createOccupationalHealthListHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.ohLibrarySections,
  ["include_inactive", "kind"],
);

export const GET = handlers.GET;
export const POST = handlers.POST;
