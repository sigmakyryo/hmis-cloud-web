"use client";

import { useQuery } from "@tanstack/react-query";
import { Fragment, useDeferredValue, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCatalogProducts } from "@/features/catalog/services/catalog.service";
import { TheatreConsumableReturnForm } from "@/features/clinical-theatre/components/TheatreConsumableReturnForm";
import {
  useAddTheatreConsumable,
  useCancelTheatreConsumable,
  useIssueTheatreConsumable,
  useTheatreConsumables,
} from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type {
  TheatreCase,
  TheatreConsumable,
  TheatreConsumableKind,
} from "@/features/clinical-theatre/types/clinical-theatre.types";
import {
  CONSUMABLE_KIND_LABELS,
  areConsumablesEditable,
  areReturnsAllowed,
  errorMessage,
  returnableQuantity,
} from "@/features/clinical-theatre/utils/theatre-record-display";
import type { InventoryProduct } from "@/features/inventory/types/inventory.types";

const KINDS: TheatreConsumableKind[] = ["consumable", "implant", "procedure"];
const IMPLANT_FIELDS = [
  { key: "manufacturer", label: "Manufacturer" },
  { key: "lot_number", label: "Lot" },
  { key: "serial_number", label: "Serial" },
  { key: "implant_site", label: "Site" },
] as const;
const MIN_SEARCH = 2;

type ImplantDraft = Partial<Record<(typeof IMPLANT_FIELDS)[number]["key"], string>> & {
  expiry_date?: string;
};

function ConsumableRow({
  item,
  editable,
  returnsAllowed,
  busy,
  onIssue,
  onCancel,
  onReturn,
}: {
  item: TheatreConsumable;
  editable: boolean;
  returnsAllowed: boolean;
  busy: boolean;
  onIssue: () => void;
  onCancel: () => void;
  onReturn: () => void;
}) {
  const returned = Number(item.returned_quantity ?? 0);
  const canReturn = returnsAllowed && returnableQuantity(item) > 0;
  const details = [item.lot_number && `Lot ${item.lot_number}`, item.serial_number && `SN ${item.serial_number}`, item.implant_site]
    .filter(Boolean)
    .join(" · ");
  return (
    <tr className="border-t" data-testid="theatre-consumable-row">
      <td className="py-1 pr-3">
        {item.product_name}
        {details ? <p className="text-xs text-muted-foreground">{details}</p> : null}
      </td>
      <td className="py-1 pr-3">{item.kind_label}</td>
      <td className="py-1 pr-3">
        {Number(item.quantity)}
        {returned > 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="theatre-consumable-returned">
            {returned} returned
          </p>
        ) : null}
      </td>
      <td className="py-1 pr-3">
        {item.status_label}
        {item.issued_by_name ? (
          <p className="text-xs text-muted-foreground">by {item.issued_by_name}</p>
        ) : null}
      </td>
      <td className="py-1 text-right">
        {editable && item.status === "recorded" ? (
          <div className="flex justify-end gap-1">
            {item.kind !== "procedure" ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={onIssue}>
                Issue from stock
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        ) : canReturn ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={onReturn}>
            Return to stock
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

/** Consumables, implants and procedure charges billed on the case. */
export function TheatreConsumablesPanel({ theatreCase }: { theatreCase: TheatreCase }) {
  const { data: items = [], isLoading } = useTheatreConsumables(theatreCase.uuid);
  const add = useAddTheatreConsumable();
  const issue = useIssueTheatreConsumable();
  const cancel = useCancelTheatreConsumable();
  const [kind, setKind] = useState<TheatreConsumableKind>("consumable");
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<InventoryProduct | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [implant, setImplant] = useState<ImplantDraft>({});
  const editable = areConsumablesEditable(theatreCase.status);
  const returnsAllowed = areReturnsAllowed(theatreCase.status);
  const [returning, setReturning] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim());

  const products = useQuery({
    queryKey: ["theatre", "consumable-products", kind, deferredSearch],
    queryFn: () =>
      fetchCatalogProducts({
        search: deferredSearch,
        product_type: kind === "procedure" ? "service" : undefined,
        sale_ok: true,
        active: true,
        pageSize: 10,
      }),
    enabled: editable && deferredSearch.length >= MIN_SEARCH && product === null,
  });
  const candidates = (products.data?.results ?? []).filter((row) =>
    kind === "procedure" ? true : row.product_type !== "service",
  );

  const reset = () => {
    setProduct(null);
    setSearch("");
    setQuantity("1");
    setImplant({});
  };

  const submit = () => {
    if (!product) return;
    add.mutate(
      {
        caseUuid: theatreCase.uuid,
        payload: {
          product_uuid: product.uuid,
          kind,
          quantity,
          ...(kind === "implant"
            ? { ...implant, expiry_date: implant.expiry_date || null }
            : {}),
        },
      },
      { onSuccess: reset },
    );
  };

  const busy = issue.isPending || cancel.isPending;
  const error = add.error ?? issue.error ?? cancel.error;

  return (
    <section className="space-y-4" data-testid="theatre-consumables-panel">
      <div>
        <h3 className="text-base font-semibold text-brand-navy">
          Consumables & implants
        </h3>
        <p className="text-xs text-muted-foreground">
          Items are billed on the visit. Stock items are issued from the theatre
          room&apos;s store through dispensation.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">Item</th>
                <th className="py-1 pr-3">Kind</th>
                <th className="py-1 pr-3">Qty</th>
                <th className="py-1 pr-3">Status</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <Fragment key={item.uuid}>
                  <ConsumableRow
                    item={item}
                    editable={editable}
                    returnsAllowed={returnsAllowed}
                    busy={busy}
                    onIssue={() =>
                      issue.mutate({ caseUuid: theatreCase.uuid, itemUuid: item.uuid })
                    }
                    onCancel={() =>
                      cancel.mutate({ caseUuid: theatreCase.uuid, itemUuid: item.uuid })
                    }
                    onReturn={() => setReturning(item.uuid)}
                  />
                  {returning === item.uuid ? (
                    <tr>
                      <td colSpan={5} className="pb-2">
                        <TheatreConsumableReturnForm
                          caseUuid={theatreCase.uuid}
                          item={item}
                          onDone={() => setReturning(null)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editable ? (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label>Kind</Label>
              <Select
                value={kind}
                onValueChange={(next) => {
                  setKind(next as TheatreConsumableKind);
                  setProduct(null);
                }}
              >
                <SelectTrigger aria-label="Kind" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {CONSUMABLE_KIND_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[240px] flex-1 space-y-1">
              <Label htmlFor="theatre-consumable-search">Product</Label>
              {product ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {product.display_name || product.name}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setProduct(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <Input
                  id="theatre-consumable-search"
                  placeholder="Search the catalogue"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="theatre-consumable-qty">Quantity</Label>
              <Input
                id="theatre-consumable-qty"
                type="number"
                min={0}
                step="1"
                className="w-24"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <Button
              disabled={!product || add.isPending || !(Number(quantity) > 0)}
              onClick={submit}
            >
              Add to case
            </Button>
          </div>
          {!product && deferredSearch.length >= MIN_SEARCH ? (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {products.isLoading ? (
                <li className="text-muted-foreground">Searching…</li>
              ) : candidates.length === 0 ? (
                <li className="text-muted-foreground">No matching products.</li>
              ) : (
                candidates.map((row) => (
                  <li key={row.uuid}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left hover:bg-muted"
                      onClick={() => setProduct(row)}
                    >
                      {row.display_name || row.name}
                      {row.default_code ? (
                        <span className="text-muted-foreground"> · {row.default_code}</span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
          {kind === "implant" ? (
            <div className="flex flex-wrap gap-2">
              {IMPLANT_FIELDS.map((field) => (
                <Input
                  key={field.key}
                  aria-label={`Implant ${field.label}`}
                  placeholder={field.label}
                  className="max-w-[180px]"
                  value={implant[field.key] ?? ""}
                  onChange={(event) =>
                    setImplant((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
              ))}
              <Input
                aria-label="Implant expiry"
                type="date"
                className="max-w-[180px]"
                value={implant.expiry_date ?? ""}
                onChange={(event) =>
                  setImplant((current) => ({ ...current, expiry_date: event.target.value }))
                }
              />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Items can be added while the patient is in theatre or recovery.
        </p>
      )}
      {error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not save.")}</p>
      ) : null}
    </section>
  );
}
