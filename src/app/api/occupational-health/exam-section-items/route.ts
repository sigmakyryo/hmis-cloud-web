import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { createOccupationalHealthListHandlers } from "@/lib/server/occupational-health-bff";

/** @deprecated Prefer /library-section-items */
const handlers = createOccupationalHealthListHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.ohLibrarySectionItems,
  ["section", "include_inactive", "search", "page", "page_size"],
);

export const GET = handlers.GET;
export const POST = handlers.POST;
