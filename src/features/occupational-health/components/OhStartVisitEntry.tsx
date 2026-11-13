"use client";

import { useEffect, useState, type MouseEvent } from "react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CustomerVisitDialog } from "@/features/customers/components/detail/CustomerVisitDialog";
import { fetchCustomers } from "@/features/customers/services/customers.service";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { cn } from "@/lib/utils";

type OhStartVisitEntryProps = {
  /** When set, skip the client picker and open the visit dialog for this client. */
  customer?: Customer | null;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "inline";
  /** Called instead of row navigation when used inside a clickable row. */
  onClickCapture?: (event: MouseEvent) => void;
};

export function OhStartVisitEntry({
  customer = null,
  label = "Start visit",
  className,
  variant = "primary",
  onClickCapture,
}: OhStartVisitEntryProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(
      () => {
        setIsLoading(true);
        setError(null);
        void fetchCustomers({ search: query, page: 1, pageSize: 20 })
          .then((response) => {
            if (!cancelled) {
              setResults(response.results ?? []);
            }
          })
          .catch((reason: unknown) => {
            if (!cancelled) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "Could not load clients.",
              );
              setResults([]);
            }
          })
          .finally(() => {
            if (!cancelled) {
              setIsLoading(false);
            }
          });
      },
      query.trim() ? 250 : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [pickerOpen, query]);

  function openFlow(event?: MouseEvent) {
    event?.stopPropagation();
    onClickCapture?.(event as MouseEvent);
    if (customer) {
      setSelected(customer);
      setVisitOpen(true);
      return;
    }
    setPickerOpen(true);
  }

  function pickClient(next: Customer) {
    setSelected(next);
    setPickerOpen(false);
    setVisitOpen(true);
  }

  const buttonClass = cn(
    variant === "inline" &&
      "h-auto px-0 text-[13px] font-medium text-brand-primary hover:underline",
    className,
  );

  const trigger =
    variant === "secondary" ? (
      <SecondaryButton
        type="button"
        onClick={openFlow}
        className={cn("h-8 px-2.5 text-[12px]", className)}
        data-testid="oh-start-visit"
        aria-label="Start visit"
        title="Start an occupational health visit"
      >
        {label}
      </SecondaryButton>
    ) : variant === "inline" ? (
      <button
        type="button"
        onClick={openFlow}
        className={buttonClass}
        data-testid="oh-start-visit"
        aria-label="Start visit"
        title="Start an occupational health visit"
      >
        {label}
      </button>
    ) : (
      <PrimaryButton
        type="button"
        onClick={openFlow}
        className={cn("h-8 px-2.5 text-[12px]", className)}
        data-testid="oh-start-visit"
        aria-label="Start visit"
        title="Start an occupational health visit"
      >
        {label}
      </PrimaryButton>
    );

  return (
    <>
      {trigger}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md" data-testid="oh-start-visit-picker">
          <DialogHeader>
            <DialogTitle>Start visit</DialogTitle>
            <DialogDescription>
              Find the client, then choose the occupational health department
              and visit type.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or client ID"
            aria-label="Search clients"
            data-testid="oh-start-visit-search"
            autoFocus
          />
          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <p className="py-4 text-[13px] text-dash-muted">Searching…</p>
            ) : error ? (
              <p className="py-4 text-[13px] text-red-700">{error}</p>
            ) : results.length === 0 ? (
              <p className="py-4 text-[13px] text-dash-muted">
                No clients match. Register the person as a client, then add
                employment.
              </p>
            ) : (
              <ul>
                {results.map((item) => {
                  const name = formatCustomerName(item);
                  const detail = [
                    item.customer_identifier,
                    item.oh_employer_name,
                  ]
                    .filter((value): value is string => Boolean(value?.trim()))
                    .join(" · ");
                  return (
                    <li
                      key={item.uuid}
                      className="border-b border-dash-border/70 last:border-0"
                    >
                      <button
                        type="button"
                        onClick={() => pickClient(item)}
                        className="flex w-full flex-col items-start gap-0.5 px-1 py-2.5 text-left hover:bg-slate-50"
                        data-testid="oh-start-visit-result"
                      >
                        <span className="text-[13px] font-medium text-brand-navy">
                          {name}
                        </span>
                        {detail ? (
                          <span className="text-[12px] text-dash-muted">
                            {detail}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {selected ? (
        <CustomerVisitDialog
          customer={selected}
          open={visitOpen}
          onOpenChange={(open) => {
            setVisitOpen(open);
            if (!open) {
              setSelected(null);
            }
          }}
          onVisitChanged={() => {
            setVisitOpen(false);
            setSelected(null);
          }}
        />
      ) : null}
    </>
  );
}
