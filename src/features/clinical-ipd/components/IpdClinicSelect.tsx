"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";
import type { ClinicalClinic } from "@/features/clinical/types/clinical-catalog.types";

type IpdClinicSelectProps = {
  clinics: ClinicalClinic[];
  value: ClinicalClinic | null;
  onChange: (clinic: ClinicalClinic | null) => void;
  disabled?: boolean;
  isLoading?: boolean;
  label?: string;
};

export function IpdClinicSelect({
  clinics,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  label = "Clinic",
}: IpdClinicSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter(
      (clinic) =>
        clinic.name.toLowerCase().includes(q) ||
        clinic.code.toLowerCase().includes(q),
    );
  }, [clinics, search]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <SearchableSelect
        value={value?.uuid}
        onValueChange={(uuid) => {
          onChange(clinics.find((clinic) => clinic.uuid === uuid) ?? null);
        }}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
        placeholder="Select clinic"
        displayValue={value ? `${value.name} (${value.code})` : undefined}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clinics…"
        isLoading={isLoading}
        minSearchLength={0}
        emptySearchMessage="No clinics available."
        noResultsMessage="No matching clinics."
      >
        {filtered.map((clinic) => (
          <SelectItem key={clinic.uuid} value={clinic.uuid}>
            {clinic.name} ({clinic.code})
          </SelectItem>
        ))}
      </SearchableSelect>
    </div>
  );
}
