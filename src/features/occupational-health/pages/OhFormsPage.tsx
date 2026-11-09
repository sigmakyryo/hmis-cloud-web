"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { ListPageHeaderSection, ListPageLayout } from "@/features/app-shell/components/page-layout";
import { CatalogSearchSelect } from "@/features/occupational-health/components/CatalogSearchSelect";
import {
  DefinedOccupationalForms,
  useDefinedOccupationalForms,
} from "@/features/occupational-health/components/DefinedOccupationalForms";
import {
  OH_FORM_FAMILIES,
  OH_PREDEFINED_FORM_TYPES,
  OPD_FORM_STAGES,
  type ClinicalFormRecord,
} from "@/features/occupational-health/lib/oh-form-catalog";
import {
  createClinicalForm,
  createFormGroup,
  fetchClinicalForms,
  fetchFormGroups,
  fetchOhVisitTypes,
} from "@/features/occupational-health/services/oh.service";
import { ROUTES } from "@/constants/routes";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export function OhFormsPage() {
  const forms = useQuery({ queryKey: ["clinical-forms"], queryFn: fetchClinicalForms });
  const defined = useDefinedOccupationalForms();
  const [open, setOpen] = useState(false);
  const sections = useMemo(() => groupForms(forms.data ?? []), [forms.data]);

  return (
    <ListPageLayout data-testid="oh-forms-page">
      <ListPageHeaderSection>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">Forms</h1>
            <p className="text-[13px] text-dash-muted">Occupational health types, onboarding, and forms that apply at a clinical stage.</p>
          </div>
          <PrimaryButton type="button" onClick={() => setOpen(true)}>New form</PrimaryButton>
        </div>
      </ListPageHeaderSection>
      <div className="space-y-6">
        <DefinedOccupationalForms />
        {sections.map((section) => (
          <section key={section.name}>
            <h2 className="mb-2 text-[13px] font-medium text-dash-muted">{section.name}</h2>
            <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
              {section.forms.map((form) => (
                <li key={form.uuid} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-brand-navy">{form.name}</p>
                    <p className="text-[13px] text-dash-muted">{formLabel(form)}</p>
                  </div>
                  {form.template_kind && form.template_uuid ? (
                    <Link className="text-[13px] font-medium text-brand-primary" href={ROUTES.ohTemplateBuilder(form.template_kind, form.template_uuid)}>
                      Open builder
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {forms.data?.length === 0 && defined.sections.length === 0 ? <p className="text-[13px] text-dash-muted">No forms yet.</p> : null}
      </div>
      {open ? <CreateFormDialog onClose={() => setOpen(false)} /> : null}
    </ListPageLayout>
  );
}

function groupForms(forms: ClinicalFormRecord[]) {
  const named = new Map<string, ClinicalFormRecord[]>();
  const ungrouped: ClinicalFormRecord[] = [];
  for (const form of forms) {
    if (!form.group) {
      ungrouped.push(form);
      continue;
    }
    const bucket = named.get(form.group.name) ?? [];
    bucket.push(form);
    named.set(form.group.name, bucket);
  }
  const sections = [...named.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, grouped]) => ({ name, forms: grouped }));
  if (ungrouped.length > 0) {
    sections.push({ name: "Ungrouped", forms: ungrouped });
  }
  return sections;
}

function formLabel(form: ClinicalFormRecord) {
  if (form.family === "occupational_health") {
    return form.system_type?.replaceAll("_", " ") ?? "Occupational health";
  }
  const placement = form.placement;
  if (placement?.trigger === "onboarding") {
    return "Required when a client is added";
  }
  if (placement?.trigger === "transition") {
    return `Required when moving from ${placement.from ?? "OPD"} to ${placement.to ?? "IPD"}`;
  }
  return `At ${placement?.parent?.toUpperCase() ?? "OPD"} ${placement?.stage ?? ""}`.trim();
}

function CreateFormDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const visitTypes = useQuery({ queryKey: ["oh-visit-types"], queryFn: fetchOhVisitTypes });
  const groups = useQuery({ queryKey: ["form-groups"], queryFn: fetchFormGroups });
  const [family, setFamily] = useState<"occupational_health" | "custom">("occupational_health");
  const [name, setName] = useState("");
  const [systemType, setSystemType] = useState("");
  const [groupUuid, setGroupUuid] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [parent, setParent] = useState<"opd" | "ipd" | "registration">("opd");
  const [trigger, setTrigger] = useState<"stage" | "transition" | "onboarding">("stage");
  const [stage, setStage] = useState<string>(OPD_FORM_STAGES[0].value);
  const [required, setRequired] = useState(true);
  const createGroup = useMutation({
    mutationFn: createFormGroup,
    onSuccess: async (group) => {
      setGroupUuid(group.uuid);
      setGroupSearch("");
      await queryClient.invalidateQueries({ queryKey: ["form-groups"] });
    },
  });
  const create = useMutation({
    mutationFn: createClinicalForm,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clinical-forms"] });
      await queryClient.invalidateQueries({ queryKey: ["oh-employee-form-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["oh-exam-templates"] });
      await queryClient.invalidateQueries({ queryKey: ["oh-cof-templates"] });
      onClose();
    },
  });
  const typeOptions = [
    ...OH_PREDEFINED_FORM_TYPES.map((type) => ({ value: type.value, label: type.label })),
    ...(visitTypes.data ?? []).map((type) => ({ value: type.code, label: type.name })),
  ];
  const selectedType = systemType || typeOptions[0]?.value || "";

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4", appFont.className)}>
      <form
        className="w-full max-w-md space-y-4 rounded-md bg-white p-5 shadow-sm"
        data-testid="oh-create-form-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          const placement = parent === "registration"
            ? { parent, trigger: "onboarding" as const, required }
            : {
                parent,
                trigger,
                stage: trigger === "stage" && parent === "opd" ? stage : null,
                from: trigger === "transition" ? "opd" : null,
                to: trigger === "transition" ? "ipd" : null,
                required,
              };
          create.mutate({
            name,
            family,
            form_group_uuid: groupUuid || null,
            ...(family === "occupational_health"
              ? { system_type: selectedType }
              : { placement }),
          });
        }}
      >
        <h2 className="text-base font-semibold text-brand-navy">New form</h2>
        <div className="space-y-1.5">
          <Label>Name <RequiredFieldMarker /></Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <CatalogSearchSelect
          label="Family"
          value={family}
          testId="oh-form-family-select"
          options={OH_FORM_FAMILIES.map((item) => ({ value: item.value, label: item.label }))}
          onValueChange={(value) => setFamily(value as "occupational_health" | "custom")}
        />
        {family === "occupational_health" ? (
          <CatalogSearchSelect
            label="Type"
            value={selectedType}
            testId="oh-form-type-select"
            options={typeOptions}
            onValueChange={setSystemType}
          />
        ) : (
          <>
            <CatalogSearchSelect
              label="Parent"
              value={parent}
              testId="oh-form-parent-select"
              options={[
                { value: "opd", label: "OPD" },
                { value: "ipd", label: "IPD" },
                { value: "registration", label: "Registration" },
              ]}
              onValueChange={(value) => {
                const next = value as "opd" | "ipd" | "registration";
                setParent(next);
                setTrigger(next === "registration" ? "onboarding" : "stage");
              }}
            />
            {parent === "registration" ? null : (
              <CatalogSearchSelect
                label="When"
                value={trigger}
                testId="oh-form-trigger-select"
                options={[
                  { value: "stage", label: "At a stage" },
                  { value: "transition", label: "When admitting from OPD to IPD" },
                ]}
                onValueChange={(value) => setTrigger(value as "stage" | "transition")}
              />
            )}
            {trigger === "stage" && parent === "opd" ? (
              <CatalogSearchSelect
                label="Stage"
                value={stage}
                testId="oh-form-stage-select"
                options={OPD_FORM_STAGES.map((item) => ({ value: item.value, label: item.label }))}
                onValueChange={setStage}
              />
            ) : null}
            <label className="flex items-center gap-2 text-[13px] text-brand-navy">
              <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
              Required before continuing
            </label>
          </>
        )}
        <CatalogSearchSelect
          label="Group"
          value={groupUuid}
          testId="oh-form-group-select"
          placeholder="Ungrouped"
          options={(groups.data ?? []).map((group) => ({ value: group.uuid, label: group.name }))}
          onValueChange={setGroupUuid}
          onSearchChange={setGroupSearch}
          footerExtra={groupSearch.trim() ? (
            <button type="button" className="text-[13px] font-medium text-brand-primary" onClick={() => createGroup.mutate(groupSearch.trim())}>
              Use “{groupSearch.trim()}”
            </button>
          ) : null}
        />
        {create.isError ? <p className="text-sm text-red-700">Could not create the form.</p> : null}
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={create.isPending || (family === "occupational_health" && !selectedType)}>Create</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
