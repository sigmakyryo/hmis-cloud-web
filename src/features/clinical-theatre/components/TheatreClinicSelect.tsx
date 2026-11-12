"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheatreRooms } from "@/features/clinical-theatre/hooks/use-clinical-theatre";
import { theatreClinicOptions } from "@/features/clinical-theatre/utils/theatre-record-display";

const ALL = "__all__";

/** Clinic filter built from the clinics that have theatre rooms; hidden for one clinic. */
export function TheatreClinicSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (clinic: string) => void;
}) {
  const { data: rooms = [] } = useTheatreRooms();
  const clinics = theatreClinicOptions(rooms);
  if (clinics.length < 2) return null;
  return (
    <div className="space-y-1">
      <Label>Clinic</Label>
      <Select
        value={value || ALL}
        onValueChange={(next) => onChange(next === ALL ? "" : next)}
      >
        <SelectTrigger aria-label="Clinic" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All clinics</SelectItem>
          {clinics.map((clinic) => (
            <SelectItem key={clinic.uuid} value={clinic.uuid}>
              {clinic.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
