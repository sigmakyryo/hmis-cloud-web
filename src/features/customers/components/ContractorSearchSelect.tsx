"use client";

import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";
import { fetchOrganizationContractorsPage } from "@/features/settings/services/settings.service";
import type { OrganizationContractor } from "@/features/settings/types/settings.types";

type ContractorSearchSelectProps = {
  value: OrganizationContractor | null;
  onChange: (contractor: OrganizationContractor | null) => void;
  disabled?: boolean;
  error?: string | null;
};

function formatContractorLabel(contractor: OrganizationContractor) {
  return contractor.code
    ? `${contractor.name} (${contractor.code})`
    : contractor.name;
}

export function ContractorSearchSelect({
  value,
  onChange,
  disabled = false,
  error = null,
}: ContractorSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<OrganizationContractor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const trimmedSearch = search.trim();

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        try {
          const response = await fetchOrganizationContractorsPage({
            search: trimmedSearch.length >= 1 ? trimmedSearch : undefined,
            pageSize: 8,
            isActive: true,
          });
          if (!cancelled) {
            setResults(response.results.filter((item) => item.is_active));
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
  }, [open, trimmedSearch]);

  const options = results.length > 0 ? results : value ? [value] : [];

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
      setResults([]);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="employment-contractor-select">
        Contractor
        <RequiredFieldMarker />
      </Label>
      <SearchableSelect
        id="employment-contractor-select"
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
        displayValue={value ? formatContractorLabel(value) : undefined}
        placeholder="Search contractors…"
        searchPlaceholder="Search by company name…"
        disabled={disabled}
        minSearchLength={0}
        isLoading={isLoading}
        emptySearchMessage="No active contractors found."
        noResultsMessage="No active contractors match that search."
        data-testid="employment-contractor-select"
      >
        {options.map((contractor) => (
          <SelectItem key={contractor.uuid} value={contractor.uuid}>
            {formatContractorLabel(contractor)}
          </SelectItem>
        ))}
      </SearchableSelect>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
