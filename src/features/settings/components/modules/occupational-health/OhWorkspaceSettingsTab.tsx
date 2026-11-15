"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { OH_WORKSPACE_LAYOUT_QUERY_KEY } from "@/features/occupational-health/hooks/use-oh-workspace-layout";
import {
  OH_WORKSPACE_AREAS,
  OH_WORKSPACE_AREA_LABEL,
  orderedWorkspaceAreas,
  type OhWorkspaceArea,
} from "@/features/occupational-health/lib/oh-workspace-layout";
import {
  fetchOhWorkspaceLayout,
  updateOhWorkspaceLayout,
} from "@/features/occupational-health/services/oh-workspace-layout.service";

type OhWorkspaceSettingsTabProps = {
  isActive: boolean;
};

export function OhWorkspaceSettingsTab({ isActive }: OhWorkspaceSettingsTabProps) {
  const queryClient = useQueryClient();
  const layout = useQuery({
    queryKey: OH_WORKSPACE_LAYOUT_QUERY_KEY,
    queryFn: fetchOhWorkspaceLayout,
    enabled: isActive,
  });
  const [draft, setDraft] = useState<OhWorkspaceArea[] | null>(null);
  const save = useMutation({
    mutationFn: updateOhWorkspaceLayout,
    onSuccess: async (data) => {
      setDraft(null);
      queryClient.setQueryData(OH_WORKSPACE_LAYOUT_QUERY_KEY, data);
    },
  });

  if (!isActive) {
    return null;
  }

  const selected = draft ?? layout.data?.included ?? [...OH_WORKSPACE_AREAS];

  function toggle(area: OhWorkspaceArea) {
    const current = draft ?? layout.data?.included ?? [...OH_WORKSPACE_AREAS];
    const next = current.includes(area)
      ? current.filter((item) => item !== area)
      : [...current, area];
    setDraft(orderedWorkspaceAreas(next));
  }

  return (
    <div className="max-w-xl space-y-4 py-6" data-testid="oh-workspace-tab">
      <p className="text-sm text-dash-muted">
        Choose the clinical areas this clinic uses. Switching an area off removes it wherever
        it appears: the visit records, the downloaded report, and the occupational health header.
      </p>
      <ul className="divide-y divide-dash-border rounded-md border border-dash-border">
        {OH_WORKSPACE_AREAS.map((area) => (
          <li key={area}>
            <label className="flex items-center gap-3 px-4 py-3 text-sm text-brand-navy">
              <input
                type="checkbox"
                checked={selected.includes(area)}
                disabled={!layout.data || save.isPending}
                onChange={() => toggle(area)}
              />
              {OH_WORKSPACE_AREA_LABEL[area]}
            </label>
          </li>
        ))}
      </ul>
      <PrimaryButton
        type="button"
        disabled={!layout.data || draft === null || save.isPending}
        onClick={() => save.mutate(selected)}
      >
        Save
      </PrimaryButton>
      {layout.isError || save.isError ? (
        <p role="alert" className="text-sm text-red-700">
          Could not load or save the workspace layout.
        </p>
      ) : null}
    </div>
  );
}
