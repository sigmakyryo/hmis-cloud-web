import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ClaimDetailClaimedItemsTab } from "@/features/claims/components/detail/ClaimDetailClaimedItemsTab";
import type { ClaimDetail } from "@/features/claims/types/claims.types";

afterEach(() => {
  cleanup();
});

const claim = {
  id: 1,
  uuid: "claim-1",
  claim_invoices: [
    {
      id: 10,
      uuid: "ci-1",
      invoice_number: "INV-1",
      invoice_date: "2026-01-01",
      line_items: [
        {
          id: 99,
          uuid: "line-99",
          tariff_code: "RAD-US",
          description: "Ultrasound",
          unit_price: "100.00",
          quantity: "1",
          date_created: "2026-01-01",
          sales_order_line: 1,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          payer_advisories: [
            {
              code: "requires_preauthorization",
              message: "Pre-authorisation required",
            },
          ],
        },
      ],
    },
  ],
} as unknown as ClaimDetail;

describe("ClaimDetailClaimedItemsTab payer advisories", () => {
  it("renders subtle red advisory text under the product name", () => {
    render(<ClaimDetailClaimedItemsTab claim={claim} isActive />);

    expect(screen.getByTestId("claim-line-advisories-99")).toHaveTextContent(
      "Pre-authorisation required",
    );
  });

  it("omits advisory text when payer_advisories are empty", () => {
    const empty = {
      ...claim,
      claim_invoices: [
        {
          ...claim.claim_invoices![0],
          line_items: [
            {
              ...claim.claim_invoices![0].line_items[0],
              payer_advisories: [],
            },
          ],
        },
      ],
    } as ClaimDetail;

    render(<ClaimDetailClaimedItemsTab claim={empty} isActive />);

    expect(screen.queryByTestId("claim-line-advisories-99")).not.toBeInTheDocument();
  });
});
