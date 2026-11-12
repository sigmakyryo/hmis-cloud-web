import { PRICELISTS_API_PATHS } from "@/constants/pricelists-api";
import { handleInventoryDetailGet } from "@/lib/server/inventory-bff-handlers";

type RouteContext = { params: Promise<{ pricelistUuid: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { pricelistUuid } = await context.params;
  return handleInventoryDetailGet(
    PRICELISTS_API_PATHS.productsSummaryStats(pricelistUuid),
    "admin",
  );
}
