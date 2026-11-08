"use client";

import { OH_VISIT_TYPES } from "@/features/occupational-health/lib/oh-form-catalog";

type OhVisitTypesSettingsTabProps = {
  isActive: boolean;
};

export function OhVisitTypesSettingsTab({ isActive }: OhVisitTypesSettingsTabProps) {
  if (!isActive) {
    return null;
  }

  return (
    <div className="py-6" data-testid="oh-visit-types-tab">
      <p className="max-w-xl text-[13px] text-dash-muted">
        These are the occupational health visit types the system already knows. Creating a form uses this same list.
      </p>
      <ul className="mt-4 divide-y divide-dash-border rounded-md border border-dash-border">
        {OH_VISIT_TYPES.map((type) => (
          <li key={type.value} className="px-4 py-3">
            <p className="text-[13px] font-medium text-brand-navy">{type.label}</p>
            <p className="text-[13px] text-dash-muted">{type.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
