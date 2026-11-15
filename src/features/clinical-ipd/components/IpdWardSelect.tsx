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
  placeholder?: string;
  /** Hide the visible label. The control stays named for assistive tech. */
  compact?: boolean;
  /** Draw the trigger as a page title instead of a form field. */
  appearance?: "field" | "title";
};

const ALL_WARDS = "__all_wards__";

const TITLE_TRIGGER_CLASS =
  "h-auto w-fit max-w-full gap-1.5 border-0 bg-transparent px-0 py-0 text-[26px] leading-8 font-semibold tracking-tight text-brand-navy shadow-none ring-0 hover:text-brand-primary focus:ring-0 data-[placeholder]:font-medium data-[placeholder]:text-dash-muted [&_svg]:size-4";

/** The closed title stays compact. The open list is wide enough for names and codes. */
const TITLE_MENU_CLASS =
  "w-96! min-w-96! max-w-[min(28rem,calc(100vw-2rem))]!";

export function IpdWardSelect({
  clinicUuid,
  value,
  onChange,
  disabled = false,
  label = "Ward",
  placeholder,
  compact = false,
  appearance = "field",
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

  const isTitle = appearance === "title";
  const resolvedPlaceholder = placeholder ?? (clinicUuid ? "Select ward" : "Select a clinic first");

  return (
    <div className={isTitle ? "min-w-0" : "space-y-1.5"}>
      <Label className={compact || isTitle ? "sr-only" : undefined}>{label}</Label>
      <SearchableSelect
        value={value?.uuid}
        onValueChange={(uuid) => {
          if (uuid === ALL_WARDS) {
            onChange(null);
            return;
          }
          onChange(data.find((ward) => ward.uuid === uuid) ?? null);
        }}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled || !clinicUuid}
        placeholder={resolvedPlaceholder}
        displayValue={value ? (isTitle ? value.name : `${value.name} (${value.code})`) : undefined}
        triggerClassName={isTitle ? TITLE_TRIGGER_CLASS : undefined}
        contentClassName={isTitle ? TITLE_MENU_CLASS : undefined}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search wards…"
        isLoading={isLoading}
        minSearchLength={0}
        emptySearchMessage="No wards for this clinic."
        noResultsMessage="No matching wards."
      >
        {isTitle && clinicUuid && "all wards".includes(search.trim().toLowerCase()) ? (
          <SelectItem value={ALL_WARDS}>All wards</SelectItem>
        ) : null}
        {filtered.map((ward) => (
          <SelectItem key={ward.uuid} value={ward.uuid}>
            {ward.name} ({ward.code}) · {ward.ward_class}
          </SelectItem>
        ))}
      </SearchableSelect>
    </div>
  );
}
