"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { OH_IOD_APPLICABILITY_QUERY_KEY } from "@/features/occupational-health/hooks/use-oh-iod-applicability";
import {
  IOD_APPLICABILITY_NONE,
  type OhIodApplicability,
} from "@/features/occupational-health/lib/oh-iod-applicability";
import {
  fetchOhIodApplicability,
  fetchOhVisitServiceOptions,
  updateOhIodApplicability,
} from "@/features/occupational-health/services/oh-iod-applicability.service";

type OhIodSettingsTabProps = {
  isActive: boolean;
};

export function OhIodSettingsTab({ isActive }: OhIodSettingsTabProps) {
  const queryClient = useQueryClient();
  const setting = useQuery({
    queryKey: OH_IOD_APPLICABILITY_QUERY_KEY,
    queryFn: fetchOhIodApplicability,
    enabled: isActive,
  });
  const visitTypes = useQuery({
    queryKey: ["oh-visit-types"],
    queryFn: fetchOhVisitServiceOptions,
    enabled: isActive,
  });
  const [draft, setDraft] = useState<OhIodApplicability | null>(null);
  const save = useMutation({
    mutationFn: updateOhIodApplicability,
    onSuccess: async (data) => {
      setDraft(null);
      queryClient.setQueryData(OH_IOD_APPLICABILITY_QUERY_KEY, data);
    },
  });

  if (!isActive) {
    return null;
  }

  const saved = setting.data ?? IOD_APPLICABILITY_NONE;
  const current = draft ?? saved;
  const services = [...(visitTypes.data ?? [])].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const ready = Boolean(setting.data && visitTypes.data);

  function update(next: OhIodApplicability) {
    setDraft(next);
  }

  function toggleVisit(code: string) {
    const codes = current.visit_type_codes.includes(code)
      ? current.visit_type_codes.filter((item) => item !== code)
      : [...current.visit_type_codes, code];
    update({ ...current, visit_type_codes: codes });
  }

  return (
    <div className="max-w-xl space-y-4 py-6" data-testid="oh-iod-settings-tab">
      <p className="text-sm text-dash-muted">
        Choose where an injury on duty can be recorded. Certificate and exam apply on every
        fitness visit. A visit service applies only on that kind of visit.
      </p>
      <ul className="divide-y divide-dash-border rounded-md border border-dash-border">
        <li>
          <label className="flex items-center gap-3 px-4 py-3 text-sm text-brand-navy">
            <input
              type="checkbox"
              checked={current.cof}
              disabled={!ready || save.isPending}
              onChange={() => update({ ...current, cof: !current.cof })}
            />
            Certificate of fitness
          </label>
        </li>
        <li>
          <label className="flex items-center gap-3 px-4 py-3 text-sm text-brand-navy">
            <input
              type="checkbox"
              checked={current.exam}
              disabled={!ready || save.isPending}
              onChange={() => update({ ...current, exam: !current.exam })}
            />
            Medical exam
          </label>
        </li>
        {services.map((service) => (
          <li key={service.uuid}>
            <label className="flex items-center gap-3 px-4 py-3 text-sm text-brand-navy">
              <input
                type="checkbox"
                checked={current.visit_type_codes.includes(service.code)}
                disabled={!ready || save.isPending}
                onChange={() => toggleVisit(service.code)}
              />
              {service.name}
            </label>
          </li>
        ))}
      </ul>
      <PrimaryButton
        type="button"
        disabled={!ready || draft === null || save.isPending}
        onClick={() => save.mutate(current)}
      >
        Save
      </PrimaryButton>
      {setting.isError || visitTypes.isError || save.isError ? (
        <p role="alert" className="text-sm text-red-700">
          Could not load or save injury on duty settings.
        </p>
      ) : null}
    </div>
  );
}
