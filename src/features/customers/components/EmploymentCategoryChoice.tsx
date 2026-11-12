"use client";

import { StartVisitChoiceRow } from "@/features/visits/components/StartVisitChoiceRow";

export type EmploymentCategory = "company" | "contractor";

const CATEGORY_OPTIONS: Array<{
  value: EmploymentCategory;
  title: string;
  hint: string;
}> = [
  {
    value: "company",
    title: "Company Employee",
    hint: "An employee directly employed by this organization, or one of their dependants.",
  },
  {
    value: "contractor",
    title: "Contractor Employee",
    hint: "An employee working for this organization through a registered contractor, or one of their dependants.",
  },
];

type EmploymentCategoryChoiceProps = {
  value: EmploymentCategory | null;
  onChange: (value: EmploymentCategory) => void;
  disabled?: boolean;
};

export function EmploymentCategoryChoice({
  value,
  onChange,
  disabled = false,
}: EmploymentCategoryChoiceProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Employment category"
      className="overflow-hidden rounded-xl border border-brand-border divide-y divide-brand-border"
      data-testid="employment-category-choice"
    >
      {CATEGORY_OPTIONS.map((option) => (
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
