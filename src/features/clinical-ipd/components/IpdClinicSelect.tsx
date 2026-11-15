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
  placeholder?: string;
  /** Hide the visible label. The control stays named for assistive tech. */
  compact?: boolean;
  /** Draw the trigger as a page title instead of a form field. */
  appearance?: "field" | "title";
};

const TITLE_TRIGGER_CLASS =
  "h-auto w-fit max-w-full gap-1.5 border-0 bg-transparent px-0 py-0 text-[26px] leading-8 font-semibold tracking-tight text-brand-navy shadow-none ring-0 hover:text-brand-primary focus:ring-0 data-[placeholder]:font-medium data-[placeholder]:text-dash-muted [&_svg]:size-4";

/** The closed title stays compact. The open list is wide enough for names and codes. */
const TITLE_MENU_CLASS =
  "w-96! min-w-96! max-w-[min(28rem,calc(100vw-2rem))]!";

export function IpdClinicSelect({
  clinics,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  label = "Clinic",
  placeholder = "Select clinic",
  compact = false,
  appearance = "field",
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

  const isTitle = appearance === "title";

  return (
    <div className={isTitle ? "min-w-0" : "space-y-1.5"}>
      <Label className={compact || isTitle ? "sr-only" : undefined}>{label}</Label>
      <SearchableSelect
        value={value?.uuid}
        onValueChange={(uuid) => {
          onChange(clinics.find((clinic) => clinic.uuid === uuid) ?? null);
        }}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
        placeholder={placeholder}
        displayValue={value ? (isTitle ? value.name : `${value.name} (${value.code})`) : undefined}
        triggerClassName={isTitle ? TITLE_TRIGGER_CLASS : undefined}
        contentClassName={isTitle ? TITLE_MENU_CLASS : undefined}
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
