"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Label } from "@/components/ui/label";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";
import { fetchIpdWards } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdWard } from "@/features/clinical-ipd/types/clinical-ipd.types";

type IpdWardSelectProps = {
  clinicUuid?: string;
  value: IpdWard | null;
  onChange: (ward: IpdWard | null) => void;
  disabled?: boolean;
  label?: string;
};

export function IpdWardSelect({
  clinicUuid,
  value,
  onChange,
  disabled = false,
  label = "Ward",
}: IpdWardSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["ipd-wards", clinicUuid],
    queryFn: () => fetchIpdWards(clinicUuid ? { clinic: clinicUuid } : {}),
    enabled: Boolean(clinicUuid),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (ward) =>
        ward.name.toLowerCase().includes(q) ||
        ward.code.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <SearchableSelect
        value={value?.uuid}
        onValueChange={(uuid) => {
          onChange(data.find((ward) => ward.uuid === uuid) ?? null);
        }}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled || !clinicUuid}
        placeholder={clinicUuid ? "Select ward" : "Select a clinic first"}
        displayValue={value ? `${value.name} (${value.code})` : undefined}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search wards…"
        isLoading={isLoading}
        minSearchLength={0}
        emptySearchMessage="No wards for this clinic."
        noResultsMessage="No matching wards."
      >
        {filtered.map((ward) => (
          <SelectItem key={ward.uuid} value={ward.uuid}>
            {ward.name} ({ward.code}) · {ward.ward_class}
          </SelectItem>
        ))}
      </SearchableSelect>
    </div>
  );
}
