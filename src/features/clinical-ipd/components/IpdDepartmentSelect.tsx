"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Label } from "@/components/ui/label";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";
import { fetchClinicalDepartments } from "@/features/clinical/services/clinical-catalog.service";
import type { ClinicalDepartment } from "@/features/clinical/types/clinical-catalog.types";

type IpdDepartmentSelectProps = {
  clinicId?: number;
  value: ClinicalDepartment | null;
  onChange: (department: ClinicalDepartment | null) => void;
  disabled?: boolean;
  label?: string;
};

export function IpdDepartmentSelect({
  clinicId,
  value,
  onChange,
  disabled = false,
  label = "IPD department",
}: IpdDepartmentSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["ipd-departments", clinicId],
    queryFn: async () => {
      const departments = await fetchClinicalDepartments(clinicId);
      return departments.filter((item) => item.department_type === "ipd");
    },
    enabled: Boolean(clinicId),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (dept) =>
        dept.name.toLowerCase().includes(q) ||
        dept.code.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <SearchableSelect
        value={value?.uuid}
        onValueChange={(uuid) => {
          onChange(data.find((dept) => dept.uuid === uuid) ?? null);
        }}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled || !clinicId}
        placeholder={clinicId ? "Select IPD department" : "Select a clinic first"}
        displayValue={value ? `${value.name} (${value.code})` : undefined}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search departments…"
        isLoading={isLoading}
        minSearchLength={0}
        emptySearchMessage="No IPD departments for this clinic."
        noResultsMessage="No matching departments."
      >
        {filtered.map((dept) => (
          <SelectItem key={dept.uuid} value={dept.uuid}>
            {dept.name} ({dept.code})
          </SelectItem>
        ))}
      </SearchableSelect>
    </div>
  );
}
