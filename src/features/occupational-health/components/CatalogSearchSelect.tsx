"use client";

import { useState, type ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";

type CatalogOption = {
  value: string;
  label: string;
};

type CatalogSearchSelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: CatalogOption[];
  placeholder?: string;
  testId: string;
  footerExtra?: ReactNode;
  onSearchChange?: (value: string) => void;
};

export function CatalogSearchSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Select",
  testId,
  footerExtra,
  onSearchChange,
}: CatalogSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.value === value);
  const query = search.trim().toLowerCase();
  const visible = query.length === 0
    ? options
    : options.filter((option) => option.label.toLowerCase().includes(query));

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <SearchableSelect
        value={value}
        onValueChange={(next) => {
          onValueChange(next);
          setSearch("");
        }}
        open={open}
        onOpenChange={setOpen}
        placeholder={placeholder}
        displayValue={selected?.label}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          onSearchChange?.(value);
        }}
        minSearchLength={0}
        searchPlaceholder="Search"
        data-testid={testId}
        footerExtra={footerExtra}
      >
        {visible.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SearchableSelect>
    </div>
  );
}
