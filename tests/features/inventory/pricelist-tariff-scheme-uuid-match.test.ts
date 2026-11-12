import { describe, expect, it } from "vitest";

import { resolvePricelistLinkedScheme } from "@/features/inventory/components/detail/PricelistDetailProductsTab";

describe("resolvePricelistLinkedScheme", () => {
  it("matches a scheme linked by pricelist_uuid without needing a numeric pricelist id", () => {
    const pricelistUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const schemes = [
      {
        uuid: "scheme-other",
        pricelist_uuid: "11111111-1111-1111-1111-111111111111",
      },
      {
        uuid: "scheme-linked",
        pricelist_uuid: pricelistUuid,
      },
    ];

    expect(resolvePricelistLinkedScheme(schemes, pricelistUuid)).toEqual({
      uuid: "scheme-linked",
      pricelist_uuid: pricelistUuid,
    });
  });

  it("returns null when no scheme is linked by uuid", () => {
    expect(
      resolvePricelistLinkedScheme(
        [{ uuid: "scheme-1", pricelist_uuid: null }],
        "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      ),
    ).toBeNull();
  });
});
