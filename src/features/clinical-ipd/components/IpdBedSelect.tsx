"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Label } from "@/components/ui/label";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";
import { fetchIpdBeds } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdBed } from "@/features/clinical-ipd/types/clinical-ipd.types";

type IpdBedSelectProps = {
  wardUuid?: string;
  value: IpdBed | null;
  onChange: (bed: IpdBed | null) => void;
  disabled?: boolean;
  label?: string;
  /** When true, only list available beds (admit/transfer). */
  availableOnly?: boolean;
};

export function IpdBedSelect({
  wardUuid,
  value,
  onChange,
  disabled = false,
  label = "Bed",
  availableOnly = true,
}: IpdBedSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["ipd-beds", wardUuid, availableOnly ? "available" : "all"],
    queryFn: () =>
      fetchIpdBeds({
        ward: wardUuid,
        status: availableOnly ? "available" : undefined,
      }),
    enabled: Boolean(wardUuid),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (bed) =>
        bed.code.toLowerCase().includes(q) ||
        bed.label.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <SearchableSelect
        value={value?.uuid}
        onValueChange={(uuid) => {
          onChange(data.find((bed) => bed.uuid === uuid) ?? null);
        }}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled || !wardUuid}
        placeholder={wardUuid ? "Select bed" : "Select a ward first"}
        displayValue={
          value
            ? `${value.code}${value.label ? ` · ${value.label}` : ""} (${value.status})`
            : undefined
        }
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search beds…"
        isLoading={isLoading}
        minSearchLength={0}
        emptySearchMessage={
          availableOnly ? "No available beds." : "No beds on this ward."
        }
        noResultsMessage="No matching beds."
      >
        {filtered.map((bed) => (
          <SelectItem key={bed.uuid} value={bed.uuid}>
            {bed.code}
            {bed.label ? ` · ${bed.label}` : ""} · {bed.status}
          </SelectItem>
        ))}
      </SearchableSelect>
    </div>
  );
}
