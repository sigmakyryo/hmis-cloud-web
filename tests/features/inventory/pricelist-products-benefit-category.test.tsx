import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PricelistProductsTable } from "@/features/inventory/components/detail/PricelistProductsTable";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

afterEach(() => {
  cleanup();
});

describe("PricelistProductsTable benefit category", () => {
  it("shows benefit category, payer tariff, and set-benefit action", () => {
    const onEditBenefitCategory = vi.fn();
    render(
      <PricelistProductsTable
        items={[
          {
            pricelist_uuid: "pl-1",
            product_uuid: "prod-1",
            product_name: "MRI Brain",
            type_label: "Radiology",
            benefit_category: "mri_scan",
            benefit_category_name: "MRI scan",
            payer_tariff: {
              external_benefit_id: "12",
              allowed_genders: ["female"],
              requires_preauthorization: true,
            },
            tariff_code: "04001",
            fixed_price: "1000",
            min_quantity: "1",
          },
        ]}
        isTenantAdmin
        onEditPrice={vi.fn()}
        onEditName={vi.fn()}
        onEditTariffCode={vi.fn()}
        onEditBenefitCategory={onEditBenefitCategory}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("MRI scan")).toBeInTheDocument();
    expect(screen.getByText(/Benefit 12/)).toBeInTheDocument();
    expect(screen.getByText(/Preauth/)).toBeInTheDocument();
  });
});
