"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { fetchOhVisitPolicy, updateOhVisitPolicy } from "@/features/occupational-health/services/visit-eligibility.service";
import { Input } from "@/components/ui/input";
import { CatalogSearchSelect } from "@/features/occupational-health/components/CatalogSearchSelect";
import {
  archiveOhVisitType,
  attachOhVisitTypeForms,
  createOhVisitType,
  fetchClinicalForms,
  fetchOhVisitTypes,
} from "@/features/occupational-health/services/oh.service";

type OhVisitTypesSettingsTabProps = {
  isActive: boolean;
};

export function OhVisitTypesSettingsTab({ isActive }: OhVisitTypesSettingsTabProps) {
  const queryClient = useQueryClient();
  const policy = useQuery({ queryKey: ["oh-visit-policy"], queryFn: fetchOhVisitPolicy, enabled: isActive });
  const savePolicy = useMutation({
    mutationFn: updateOhVisitPolicy,
    onSuccess: async (data) => {
      queryClient.setQueryData(["oh-visit-policy"], data);
      await queryClient.invalidateQueries({ queryKey: ["oh-visit-eligibility"] });
    },
  });
  const types = useQuery({
    queryKey: ["oh-visit-types"],
    queryFn: fetchOhVisitTypes,
    enabled: isActive,
  });
  const forms = useQuery({
    queryKey: ["clinical-forms"],
    queryFn: () => fetchClinicalForms(),
    enabled: isActive,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const selected = types.data?.find((type) => type.uuid === selectedId) ?? types.data?.[0] ?? null;
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["oh-visit-types"] });
  };
  const addType = useMutation({
    mutationFn: createOhVisitType,
    onSuccess: async (created) => {
      setName("");
      setDescription("");
      setSelectedId(created.uuid);
      await refresh();
    },
  });
  const archive = useMutation({
    mutationFn: archiveOhVisitType,
    onSuccess: async () => {
      setSelectedId(null);
      await refresh();
    },
  });
  const attach = useMutation({
    mutationFn: (formUuids: string[]) => {
      if (!selected) {
        return Promise.reject(new Error("Choose a visit service first."));
      }
      return attachOhVisitTypeForms(selected.uuid, formUuids);
    },
    onSuccess: refresh,
  });

  if (!isActive) {
    return null;
  }

  const attached = new Set((selected?.forms ?? []).map((form) => form.uuid));
  const available = (forms.data ?? [])
    .filter((form) => !attached.has(form.uuid))
    .map((form) => ({ value: form.uuid, label: form.name }));

  return (
    <div className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" data-testid="oh-visit-types-tab">
      <div className="border-b border-dash-border pb-4 lg:col-span-2">
        <label className="flex items-center gap-2 text-sm text-brand-navy">
          <input type="checkbox" checked={policy.data?.block_repeat_pre_employment ?? false}
            disabled={!policy.data || savePolicy.isPending}
            onChange={(event) => savePolicy.mutate(event.target.checked)} />
          Block pre-employment visits when the employee form is already complete
        </label>
        {policy.isError || savePolicy.isError ? <p role="alert" className="mt-2 text-sm text-red-700">Could not load or save the visit policy.</p> : null}
      </div>
      <div>
        <ul className="divide-y divide-dash-border rounded-md border border-dash-border">
          {(types.data ?? []).map((type) => (
            <li key={type.uuid}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setSelectedId(type.uuid)}
              >
                <span>
                  <span className="block text-[13px] font-medium text-brand-navy">{type.name}</span>
                  <span className="block text-[13px] text-dash-muted">{type.description}</span>
                </span>
                <span className="text-[12px] text-dash-muted">{type.is_default ? "Default" : "This workspace"}</span>
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-4 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            addType.mutate({ name, description });
          }}
        >
          <Input value={name} placeholder="New visit service" onChange={(event) => setName(event.target.value)} required />
          <Input value={description} placeholder="Description" onChange={(event) => setDescription(event.target.value)} />
          <PrimaryButton type="submit" disabled={addType.isPending}>Add service</PrimaryButton>
        </form>
      </div>
      {selected ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-medium text-brand-navy">{selected.name}</h2>
            {selected.is_default ? null : (
              <SecondaryButton type="button" disabled={archive.isPending} onClick={() => archive.mutate(selected.uuid)}>
                Archive
              </SecondaryButton>
            )}
          </div>
          <ul className="space-y-2">
            {selected.forms.map((form) => (
              <li key={form.uuid} className="flex items-center justify-between gap-3 text-[13px]">
                <span>{form.name}</span>
                <button
                  type="button"
                  className="text-dash-muted"
                  onClick={() => attach.mutate(selected.forms.filter((item) => item.uuid !== form.uuid).map((item) => item.uuid))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <CatalogSearchSelect
            label="Attach a form"
            value=""
            placeholder="Search forms"
            testId="oh-visit-type-form-select"
            options={available}
            onValueChange={(formUuid) => attach.mutate([...selected.forms.map((form) => form.uuid), formUuid])}
          />
        </div>
      ) : null}
    </div>
  );
}
