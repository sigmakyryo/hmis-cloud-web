"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/constants/routes";
import type { CatalogPricelistMembership } from "@/features/catalog/types/catalog.types";
import {
  ListPageDataTable,
  ListPageDataTableBody,
  ListPageDataTableCell,
  ListPageDataTableHeader,
  ListPageDataTableHeaderCell,
  ListPageDataTableHeaderRow,
  ListPageDataTableRow,
} from "@/features/app-shell/components/page-layout";
import { InventoryCreatedByCell } from "@/features/inventory/components/InventoryCreatedByCell";
import {
  formatInventoryAmount,
  formatInventoryQuantity,
} from "@/features/inventory/utils/format-inventory";
import { cn } from "@/lib/utils";

type PricelistProductsTableProps = {
  items: CatalogPricelistMembership[];
  isTenantAdmin: boolean;
  onEditPrice: (item: CatalogPricelistMembership) => void;
  onEditName: (item: CatalogPricelistMembership) => void;
  onEditTariffCode: (item: CatalogPricelistMembership) => void;
  onEditBenefitCategory?: (item: CatalogPricelistMembership) => void;
  onRemove: (item: CatalogPricelistMembership) => void;
  className?: string;
};

function formatBenefitCategory(item: CatalogPricelistMembership): string {
  if (item.benefit_category_name?.trim()) {
    return item.benefit_category_name.trim();
  }
  if (item.benefit_category?.trim()) {
    return item.benefit_category.trim();
  }
  return "—";
}

function formatPayerTariff(item: CatalogPricelistMembership): string {
  const tariff = item.payer_tariff;
  if (!tariff) {
    return "—";
  }
  const parts: string[] = [];
  if (tariff.external_benefit_id) {
    parts.push(`Benefit ${tariff.external_benefit_id}`);
  }
  const genders = (tariff.allowed_genders || []).filter(Boolean);
  if (genders.length) {
    parts.push(genders.join("/"));
  }
  if (tariff.min_age_years != null || tariff.max_age_years != null) {
    parts.push(
      `Age ${tariff.min_age_years ?? 0}-${tariff.max_age_years ?? "∞"}`,
    );
  }
  if (tariff.requires_preauthorization) {
    parts.push("Preauth");
  }
  return parts.length ? parts.join(" · ") : "—";
}

function hasTariffCode(item: CatalogPricelistMembership): boolean {
  return Boolean(item.tariff_code?.trim());
}

function formatMembershipType(item: CatalogPricelistMembership): string {
  if (item.type_label?.trim()) {
    return item.type_label.trim();
  }
  if (item.is_procedure) {
    return "Procedure";
  }
  if (item.is_lab_test) {
    return "Lab";
  }
  if (item.is_radiology) {
    return "Radiology";
  }
  if (item.is_sundry) {
    return "Sundry";
  }
  if (item.is_drug || item.product_type === "product") {
    return "Medicine";
  }
  if (item.product_type === "consu") {
    return "Consumable";
  }
  if (item.product_type === "service") {
    return "Service";
  }
  if (item.product_type_label?.trim()) {
    const label = item.product_type_label.trim();
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return "—";
}

export function PricelistProductsTable({
  items,
  isTenantAdmin,
  onEditPrice,
  onEditName,
  onEditTariffCode,
  onEditBenefitCategory,
  onRemove,
  className,
}: PricelistProductsTableProps) {
  return (
    <ListPageDataTable className={cn("[&_table]:table-fixed", className)}>
      <ListPageDataTableHeader>
        <ListPageDataTableHeaderRow>
          <ListPageDataTableHeaderCell className="w-[15rem]">
            Product
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="w-[6.5rem]">
            Tariff code
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="w-[5.5rem]">
            Type
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell>Benefit category</ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell>Payer rule(s)</ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="w-[4.5rem] text-right">
            Min qty
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="w-[6rem] text-right">
            Fixed price
          </ListPageDataTableHeaderCell>
          <ListPageDataTableHeaderCell className="w-[8rem]">
            Added by
          </ListPageDataTableHeaderCell>
          {isTenantAdmin ? (
            <ListPageDataTableHeaderCell className="w-[7.5rem] text-right pr-4">
              Actions
            </ListPageDataTableHeaderCell>
          ) : null}
        </ListPageDataTableHeaderRow>
      </ListPageDataTableHeader>
      <ListPageDataTableBody>
        {items.map((item) => {
          const productName = item.product_name ?? item.product_uuid;
          const benefitCategory = formatBenefitCategory(item);
          const payerTariff = formatPayerTariff(item);
          return (
          <ListPageDataTableRow key={item.product_uuid} className="group">
            <ListPageDataTableCell className="max-w-0 py-2">
              <Link
                href={ROUTES.inventoryProductDetail(item.product_uuid)}
                title={productName}
                className="block truncate text-brand-navy transition-colors group-hover:text-brand-primary"
              >
                {productName}
              </Link>
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2 font-mono tabular-nums text-dash-muted">
              <span className="block truncate" title={item.tariff_code?.trim() || undefined}>
                {item.tariff_code?.trim() || "—"}
              </span>
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2 text-dash-muted">
              <span className="block truncate">{formatMembershipType(item)}</span>
            </ListPageDataTableCell>
            <ListPageDataTableCell className="max-w-0 py-2 text-dash-muted">
              <span className="block truncate" title={benefitCategory === "—" ? undefined : benefitCategory}>
                {benefitCategory}
              </span>
            </ListPageDataTableCell>
            <ListPageDataTableCell className="max-w-0 py-2 text-xs text-dash-muted">
              <span className="block truncate" title={payerTariff === "—" ? undefined : payerTariff}>
                {payerTariff}
              </span>
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2 text-right tabular-nums text-dash-muted">
              {formatInventoryQuantity(item.min_quantity, {
                wholeNumbers: Boolean(item.is_drug),
              })}
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2 text-right tabular-nums text-dash-muted">
              {formatInventoryAmount(item.fixed_price, "", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </ListPageDataTableCell>
            <ListPageDataTableCell className="py-2">
              <InventoryCreatedByCell
                name={item.created_by_name}
                imageUrl={item.created_by_avatar_url}
                size="sm"
                tone="muted"
              />
            </ListPageDataTableCell>
            {isTenantAdmin ? (
              <ListPageDataTableCell className="py-2 pr-4 text-right">
                <div
                  className="flex items-center justify-end gap-1.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md border-dash-border bg-white px-2.5 text-xs font-medium text-dash-muted hover:bg-dash-canvas hover:text-brand-navy"
                    onClick={() => onEditPrice(item)}
                  >
                    Edit price
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-lg text-dash-muted hover:bg-slate-100 hover:text-brand-navy"
                        aria-label={`More actions for ${item.product_name ?? "product"}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => onEditPrice(item)}>
                        Edit price
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditName(item)}>
                        Edit name
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditTariffCode(item)}>
                        {hasTariffCode(item) ? "Edit tariff code" : "Add tariff code"}
                      </DropdownMenuItem>
                      {onEditBenefitCategory ? (
                        <DropdownMenuItem onClick={() => onEditBenefitCategory(item)}>
                          Set benefit category
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-700 focus:text-red-700"
                        onClick={() => onRemove(item)}
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </ListPageDataTableCell>
            ) : null}
          </ListPageDataTableRow>
          );
        })}
      </ListPageDataTableBody>
    </ListPageDataTable>
  );
}
