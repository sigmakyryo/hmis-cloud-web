"use client";

import { useState } from "react";

import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";

const ALL = "all";

/**
 * Chooses one employer or all of them. It is the app's standard searchable select, so a long list can be
 * narrowed by typing. "All employers" stands for no filter.
 */
export function OhAnnualEmployerSelect({ employers, value, onChange }: { employers: Array<{ uuid: string; name: string }>; value: string; onChange: (uuid: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const visible = query ? employers.filter((employer) => employer.name.toLowerCase().includes(query)) : employers;
  const selected = employers.find((employer) => employer.uuid === value);

  return (
    <div>
      <label className="sr-only" htmlFor="oh-annual-employer">
        Employer
      </label>
      <SearchableSelect
        id="oh-annual-employer"
        value={value || ALL}
        onValueChange={(next) => {
          onChange(next === ALL ? "" : next);
          setSearch("");
        }}
        open={open}
        onOpenChange={setOpen}
        displayValue={selected?.name ?? "All employers"}
        searchValue={search}
        onSearchChange={setSearch}
        minSearchLength={0}
        searchPlaceholder="Search employers"
        noResultsMessage="No employers match."
        triggerClassName="h-9 w-56 text-[12.5px]"
      >
        {query === "" ? <SelectItem value={ALL}>All employers</SelectItem> : null}
        {visible.map((employer) => (
          <SelectItem key={employer.uuid} value={employer.uuid}>
            {employer.name}
          </SelectItem>
        ))}
      </SearchableSelect>
    </div>
  );
}
