import { OCCUPATIONAL_HEALTH_API_PATHS } from "@/constants/occupational-health-api";
import { createOccupationalHealthListHandlers } from "@/lib/server/occupational-health-bff";

const handlers = createOccupationalHealthListHandlers(
  OCCUPATIONAL_HEALTH_API_PATHS.ohCatalogItems,
  ["item_type", "section", "include_inactive", "search"],
);

export const GET = handlers.GET;
export const POST = handlers.POST;
