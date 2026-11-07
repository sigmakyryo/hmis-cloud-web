import { PRICELISTS_API_PATHS } from "@/constants/pricelists-api";
import type { CatalogPricelistMembership } from "@/features/catalog/types/catalog.types";
import { bffError, bffSuccess } from "@/lib/server/bff-response";
import { hmisApiRequestWithMeta } from "@/lib/server/hmis-api";
import {
  buildForwardedQuery,
  handleInventoryCreate,
} from "@/lib/server/inventory-bff-handlers";
import { absoluteMediaUrl } from "@/lib/server/media-url";
import { requireTenantAdmin } from "@/lib/server/require-tenant-admin";

type RouteContext = { params: Promise<{ pricelistUuid: string }> };

const QUERY_KEYS = ["page", "page_size", "q"] as const;

function withBrowserCreatorAvatar(
  item: CatalogPricelistMembership,
): CatalogPricelistMembership {
  const avatarUrl = item.created_by_avatar_url;
  if (!avatarUrl?.startsWith("/media/")) {
    return item;
  }
  return {
    ...item,
    created_by_avatar_url: absoluteMediaUrl(avatarUrl),
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireTenantAdmin();
    if ("error" in auth) {
      return auth.error;
    }

    const { pricelistUuid } = await context.params;
    const query = buildForwardedQuery(request, QUERY_KEYS);
    const { data, meta } = await hmisApiRequestWithMeta<CatalogPricelistMembership[]>(
      `${PRICELISTS_API_PATHS.products(pricelistUuid)}${query}`,
      { token: auth.accessToken },
    );

    return bffSuccess({
      results: data.map(withBrowserCreatorAvatar),
      pagination: meta.pagination ?? null,
    });
  } catch (error) {
    return bffError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { pricelistUuid } = await context.params;
  return handleInventoryCreate(
    request,
    PRICELISTS_API_PATHS.products(pricelistUuid),
    "admin",
  );
}
