"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import type { OutsideHospital } from "@/features/clinical-opd/types/external-care.types";

export type HospitalChoiceValue = {
  hospitalUuid: string;
  hospitalName: string;
  town: string;
  phone: string;
};

type HospitalChoiceFieldsProps = {
  hospitals: OutsideHospital[];
  value: HospitalChoiceValue;
  onChange: (value: HospitalChoiceValue) => void;
  disabled?: boolean;
  required?: boolean;
  idPrefix: string;
};

export const EMPTY_HOSPITAL_CHOICE: HospitalChoiceValue = {
  hospitalUuid: "",
  hospitalName: "",
  town: "",
  phone: "",
};

export function HospitalChoiceFields({
  hospitals,
  value,
  onChange,
  disabled = false,
  required = false,
  idPrefix,
}: HospitalChoiceFieldsProps) {
  const adding = value.hospitalUuid === "";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-hospital`}>
          Hospital {required ? <RequiredFieldMarker /> : null}
        </Label>
        <select
          id={`${idPrefix}-hospital`}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          data-testid={`${idPrefix}-hospital-select`}
          disabled={disabled}
          value={value.hospitalUuid}
          onChange={(event) =>
            onChange({
              ...value,
              hospitalUuid: event.target.value,
              hospitalName: "",
              town: "",
              phone: "",
            })
          }
        >
          <option value="">Add a hospital</option>
          {hospitals.map((hospital) => (
            <option key={hospital.uuid} value={hospital.uuid}>
              {hospital.name}
            </option>
          ))}
        </select>
      </div>
      {adding ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${idPrefix}-hospital-name`}>
              Hospital name {required ? <RequiredFieldMarker /> : null}
            </Label>
            <Input
              id={`${idPrefix}-hospital-name`}
              data-testid={`${idPrefix}-hospital-name`}
              disabled={disabled}
              value={value.hospitalName}
              onChange={(event) =>
                onChange({ ...value, hospitalName: event.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-town`}>Town</Label>
            <Input
              id={`${idPrefix}-town`}
              disabled={disabled}
              value={value.town}
              onChange={(event) => onChange({ ...value, town: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
            <Input
              id={`${idPrefix}-phone`}
              disabled={disabled}
              value={value.phone}
              onChange={(event) =>
                onChange({ ...value, phone: event.target.value })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
