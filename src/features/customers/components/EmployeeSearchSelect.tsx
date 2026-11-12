"use client";

import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";
import { fetchCustomers } from "@/features/customers/services/customers.service";
import type { Customer } from "@/features/customers/types/customer.types";
import { formatCustomerName } from "@/features/customers/utils/format-customer";

type EmployeeSearchSelectProps = {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  category: "company" | "contractor";
  contractorUuid?: string | null;
  disabled?: boolean;
  error?: string | null;
};

function employeeNumber(customer: Customer) {
  return (
    customer.employment?.employee_number ||
    customer.internal_reference ||
    ""
  );
}

function formatEmployeeLabel(customer: Customer) {
  const number = employeeNumber(customer);
  const name = formatCustomerName(customer);
  return number ? `${name} · ${number}` : name;
}

export function EmployeeSearchSelect({
  value,
  onChange,
  category,
  contractorUuid = null,
  disabled = false,
  error = null,
}: EmployeeSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const trimmedSearch = search.trim();
  const contractorRequired = category === "contractor";
  const canSearch = !contractorRequired || Boolean(contractorUuid);

  useEffect(() => {
    if (!open || !canSearch || trimmedSearch.length < 2) {
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        try {
          const response = await fetchCustomers({
            search: trimmedSearch,
            pageSize: 8,
            isActive: true,
            employmentCategory: category,
            employmentRole: "employee",
            contractor: contractorUuid || undefined,
          });
          if (!cancelled) {
            setResults(response.results);
            setIsLoading(false);
          }
        } catch {
          if (!cancelled) {
            setResults([]);
            setIsLoading(false);
          }
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [canSearch, category, contractorUuid, open, trimmedSearch]);

  const options =
    trimmedSearch.length < 2 ? (value ? [value] : []) : results;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
      setResults([]);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="employment-related-employee-select">
        Related employee
        <RequiredFieldMarker />
      </Label>
      <SearchableSelect
        id="employment-related-employee-select"
        open={open}
        onOpenChange={handleOpenChange}
        value={value?.uuid ?? ""}
        onValueChange={(uuid) => {
          const match =
            options.find((item) => item.uuid === uuid) ??
            (value?.uuid === uuid ? value : null);
          onChange(match);
          handleOpenChange(false);
        }}
        searchValue={search}
        onSearchChange={setSearch}
        displayValue={value ? formatEmployeeLabel(value) : undefined}
        placeholder={
          canSearch
            ? "Search by name or employee number…"
            : "Select a contractor first"
        }
        searchPlaceholder="Search employees…"
        disabled={disabled || !canSearch}
        minSearchLength={2}
        isLoading={isLoading}
        emptySearchMessage="Type at least 2 characters to search."
        noResultsMessage="No employees match that search."
        data-testid="employment-related-employee-select"
      >
        {options.map((customer) => (
          <SelectItem key={customer.uuid} value={customer.uuid}>
            {formatEmployeeLabel(customer)}
          </SelectItem>
        ))}
      </SearchableSelect>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
