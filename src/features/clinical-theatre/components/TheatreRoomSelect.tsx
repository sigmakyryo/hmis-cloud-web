"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";
import { useTheatreRooms } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import type { TheatreRoom } from "@/features/clinical-theatre/types/clinical-theatre.types";

type TheatreRoomSelectProps = {
  clinicUuid?: string;
  value: TheatreRoom | null;
  onChange: (room: TheatreRoom | null) => void;
  disabled?: boolean;
  label?: string;
};

export function TheatreRoomSelect({
  clinicUuid,
  value,
  onChange,
  disabled = false,
  label = "Theatre room",
}: TheatreRoomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useTheatreRooms(
    clinicUuid ? { clinic: clinicUuid } : {},
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (room) =>
        room.name.toLowerCase().includes(q) ||
        room.code.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <SearchableSelect
        value={value?.uuid}
        onValueChange={(uuid) => {
          onChange(data.find((room) => room.uuid === uuid) ?? null);
        }}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
        placeholder="Select theatre room"
        displayValue={value ? `${value.name} (${value.code})` : undefined}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search rooms…"
        isLoading={isLoading}
        minSearchLength={0}
        emptySearchMessage="No theatre rooms yet. Add rooms in Settings → Modules → Theatre."
        noResultsMessage="No matching rooms."
      >
        {filtered.map((room) => (
          <SelectItem key={room.uuid} value={room.uuid}>
            {room.name} ({room.code}) · {room.kind}
          </SelectItem>
        ))}
      </SearchableSelect>
    </div>
  );
}
