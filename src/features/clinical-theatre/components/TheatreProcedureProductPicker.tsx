"use client";

import { useDeferredValue, useState } from "react";

import { Input } from "@/components/ui/input";
import { useTheatreProcedureProducts } from "@/features/clinical-theatre/hooks/use-theatre-catalog";
import type { TheatreProcedureProduct } from "@/features/clinical-theatre/types/theatre-catalog.types";
import {
  formatProcedureCodes,
  priceSourceLabel,
} from "@/features/clinical-theatre/utils/theatre-catalog-display";

const MIN_SEARCH = 2;

/** Search theatre procedures in the products catalogue (name, code or tariff). */
export function TheatreProcedureProductPicker({
  id,
  caseUuid,
  value,
  onChange,
  placeholder = "Search the procedure catalogue…",
  disabled,
}: {
  id: string;
  caseUuid?: string;
  value: TheatreProcedureProduct | null;
  onChange: (product: TheatreProcedureProduct | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search.trim());
  const results = useTheatreProcedureProducts(deferred, {
    caseUuid,
    enabled: !disabled && value === null && deferred.length >= MIN_SEARCH,
  });

  if (value) {
    return (
      <div
        className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
        data-testid="theatre-procedure-product-selected"
      >
        <div className="min-w-0 text-sm">
          <p className="font-medium text-brand-navy">{value.display_name}</p>
          <p className="text-xs text-muted-foreground">
            {[formatProcedureCodes(value.codes), `${value.price} · ${priceSourceLabel(value.price_source)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-brand-navy underline"
          onClick={() => {
            onChange(null);
            setSearch("");
          }}
          disabled={disabled}
        >
          Change
        </button>
      </div>
    );
  }

  const rows = results.data ?? [];
  return (
    <div className="relative">
      <Input
        id={id}
        value={search}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
        role="combobox"
        aria-expanded={rows.length > 0}
        aria-controls={`${id}-options`}
      />
      {deferred.length >= MIN_SEARCH ? (
        <ul
          id={`${id}-options`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow"
        >
          {results.isLoading ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>
          ) : rows.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              No theatre procedure matches. Procedures are service products marked
              &ldquo;procedure&rdquo; (IPD or clinic-wide) in the catalogue.
            </li>
          ) : (
            rows.map((product) => (
              <li key={product.uuid} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted"
                  onClick={() => onChange(product)}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{product.display_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatProcedureCodes(product.codes) || product.default_code || "No codes"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    <span className="block font-semibold">{product.price}</span>
                    <span className="block text-muted-foreground">
                      {priceSourceLabel(product.price_source)}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
