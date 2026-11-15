"use client";

import { StartVisitChoiceRow } from "@/features/visits/components/StartVisitChoiceRow";

export type EmploymentRole = "employee" | "dependant";

const ROLE_OPTIONS: Array<{
  value: EmploymentRole;
  title: string;
  hint: string;
}> = [
  {
    value: "employee",
    title: "Employee",
    hint: "The person being registered is the worker.",
  },
  {
    value: "dependant",
    title: "Dependant",
    hint: "The person being registered is a dependant of an existing employee.",
  },
];

type EmploymentRoleChoiceProps = {
  value: EmploymentRole | null;
  onChange: (value: EmploymentRole) => void;
  disabled?: boolean;
};

export function EmploymentRoleChoice({
  value,
  onChange,
  disabled = false,
}: EmploymentRoleChoiceProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Employee or dependant"
      className="divide-y divide-brand-border overflow-hidden rounded-xl border border-brand-border px-4"
      data-testid="employment-role-choice"
    >
      {ROLE_OPTIONS.map((option) => (
        <StartVisitChoiceRow
          key={option.value}
          selected={value === option.value}
          title={option.title}
          hint={option.hint}
          disabled={disabled}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}
