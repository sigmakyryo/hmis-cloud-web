"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { FormDescription, FormLabel } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";
import { InventoryProductPicker } from "@/features/inventory/components/InventoryProductPicker";
import { searchInventoryProducts } from "@/features/inventory/services/inventory.service";
import type { InventoryProduct } from "@/features/inventory/types/inventory.types";
import { formatProductLabel } from "@/features/inventory/utils/format-inventory";
import { InspectorToggleRow } from "@/features/oh-template-builder/components/InspectorShell";

type FormBillingValue = {
  billable: boolean;
  productUuid: string | null;
};

type ItemBillingValue = {
  billable: boolean;
  destination: "lab" | "billing_only" | null;
  productUuids: string[];
};

export function FormBillingFields({
  value,
  onChange,
  disabled,
}: {
  value: FormBillingValue;
  onChange: (next: FormBillingValue) => void;
  disabled?: boolean;
}) {
  const [picked, setPicked] = useState<InventoryProduct | null>(null);
  const product =
    picked && picked.uuid === value.productUuid
      ? picked
      : value.productUuid
        ? ({
            uuid: value.productUuid,
            name: "Selected billing product",
            display_name: "Selected billing product",
          } as InventoryProduct)
        : null;

  return (
    <div className="space-y-4">
      <InspectorToggleRow
        title="Charge for this form"
        description="When on, saving the form adds this product to the visit bill. Item charges are turned off."
        control={
          <Switch
            checked={value.billable}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onChange({
                billable: checked,
                productUuid: checked ? value.productUuid : null,
              })
            }
            aria-label="Charge for this form"
          />
        }
      />
      {value.billable ? (
        <div className="space-y-2">
          <InventoryProductPicker
            id="oh-form-billing-product"
            label="Billing product"
            required
            product={product}
            disabled={disabled}
            helperText="Price comes from this product in billing."
            onProductChange={(next) => {
              setPicked(next);
              onChange({ billable: true, productUuid: next?.uuid ?? null });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ItemBillingFields({
  value,
  onChange,
  disabled,
  formBillable,
}: {
  value: ItemBillingValue;
  onChange: (next: ItemBillingValue) => void;
  disabled?: boolean;
  formBillable?: boolean;
}) {
  const locked = Boolean(formBillable) || disabled;
  const destination = value.destination ?? "billing_only";

  return (
    <div className="space-y-4">
      {formBillable ? (
        <p className="text-[13px] leading-5 text-dash-muted">
          This form is already charged as a whole, so item charges are turned off.
        </p>
      ) : null}
      <InspectorToggleRow
        title="Charge when selected"
        description="When a clinician ticks this item, add the product(s) to the visit bill."
        control={
          <Switch
            checked={value.billable && !formBillable}
            disabled={locked}
            onCheckedChange={(checked) =>
              onChange({
                billable: checked,
                destination: checked ? value.destination ?? "billing_only" : null,
                productUuids: checked ? value.productUuids : [],
              })
            }
            aria-label="Charge when selected"
          />
        }
      />
      {value.billable && !formBillable ? (
        <>
          <div className="space-y-2">
            <FormLabel>Where should it go?</FormLabel>
            <div className="flex gap-2">
              {(
                [
                  ["lab", "Lab"],
                  ["billing_only", "Billing only"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  disabled={locked}
                  onClick={() =>
                    onChange({
                      ...value,
                      destination: id,
                      productUuids: id === value.destination ? value.productUuids : [],
                    })
                  }
                  className={
                    destination === id
                      ? "rounded-md bg-brand-primary px-3 py-1.5 text-[13px] font-medium text-white"
                      : "rounded-md border border-dash-border bg-white px-3 py-1.5 text-[13px] text-brand-navy"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <FormDescription>
              Lab creates a lab order and adds it to the bill. Billing only adds the charge.
            </FormDescription>
          </div>
          <MultiProductPicker
            labOnly={destination === "lab"}
            productUuids={value.productUuids}
            disabled={locked}
            onChange={(productUuids) => onChange({ ...value, destination, productUuids })}
          />
        </>
      ) : null}
    </div>
  );
}

function MultiProductPicker({
  labOnly,
  productUuids,
  onChange,
  disabled,
}: {
  labOnly: boolean;
  productUuids: string[];
  onChange: (uuids: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<InventoryProduct[]>([]);
  const [selected, setSelected] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const visibleSelected =
    productUuids.length === 0
      ? []
      : selected.filter((row) => productUuids.includes(row.uuid));

  const productKey = productUuids.join("|");

  useEffect(() => {
    if (productUuids.length === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const rows = await searchInventoryProducts({
        q: productUuids[0]?.slice(0, 8) || "a",
        active: true,
        is_lab_test: labOnly ? true : undefined,
      });
      if (cancelled) return;
      const matched = productUuids
        .map((uuid) => rows.find((row) => row.uuid === uuid))
        .filter(Boolean) as InventoryProduct[];
      setSelected((prev) => {
        const byUuid = new Map(prev.map((row) => [row.uuid, row]));
        for (const row of matched) byUuid.set(row.uuid, row);
        return productUuids
          .map((uuid) => byUuid.get(uuid))
          .filter(Boolean) as InventoryProduct[];
      });
    })();
    return () => {
      cancelled = true;
    };
    // productKey tracks productUuids membership without inline join in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- productKey encodes productUuids
  }, [productKey, labOnly]);

  useEffect(() => {
    if (!open || search.trim().length < 2) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const rows = await searchInventoryProducts({
            q: search.trim(),
            active: true,
            is_lab_test: labOnly ? true : undefined,
          });
          if (!cancelled) {
            setOptions(rows.filter((row) => !productUuids.includes(row.uuid)));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- productKey encodes productUuids
  }, [open, search, labOnly, productKey]);

  return (
    <div className="space-y-2">
      <Label>{labOnly ? "Lab products" : "Products"}</Label>
      <ul className="space-y-1">
        {visibleSelected.map((row) => (
          <li
            key={row.uuid}
            className="flex items-center justify-between gap-2 rounded-md border border-dash-border px-2 py-1.5 text-[13px] text-brand-navy"
          >
            <span className="min-w-0 truncate">{formatProductLabel(row)}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${formatProductLabel(row)}`}
              className="rounded p-1 text-dash-muted hover:text-brand-primary"
              onClick={() => onChange(productUuids.filter((uuid) => uuid !== row.uuid))}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <SearchableSelect
        open={open}
        onOpenChange={setOpen}
        value=""
        onValueChange={(uuid) => {
          if (!uuid || productUuids.includes(uuid)) return;
          const row = options.find((entry) => entry.uuid === uuid);
          if (row) setSelected((prev) => [...prev, row]);
          onChange([...productUuids, uuid]);
          setSearch("");
          setOpen(false);
        }}
        searchValue={search}
        onSearchChange={setSearch}
        placeholder={labOnly ? "Add a product" : "Add a product"}
        searchPlaceholder={labOnly ? "Search lab products" : "Search products"}
        disabled={disabled}
        isLoading={loading}
      >
        {options.map((row) => (
          <SelectItem key={row.uuid} value={row.uuid}>
            {formatProductLabel(row)}
          </SelectItem>
        ))}
      </SearchableSelect>
      <p className="text-[12px] text-dash-muted">
        {labOnly
          ? "Only products set up as lab tests appear here. You can pick more than one."
          : "You can pick more than one product for this item."}
      </p>
    </div>
  );
}
