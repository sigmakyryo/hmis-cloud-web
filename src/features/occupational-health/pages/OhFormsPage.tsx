"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { ListPageHeaderSection, ListPageLayout } from "@/features/app-shell/components/page-layout";
import {
  OH_FORM_FAMILIES,
  OH_FORM_SYSTEM_TYPES,
  OPD_FORM_STAGES,
  type ClinicalFormRecord,
} from "@/features/occupational-health/lib/oh-form-catalog";
import { createClinicalForm, fetchClinicalForms } from "@/features/occupational-health/services/oh.service";
import { ROUTES } from "@/constants/routes";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export function OhFormsPage() {
  const forms = useQuery({ queryKey: ["clinical-forms"], queryFn: fetchClinicalForms });
  const [open, setOpen] = useState(false);

  return (
    <ListPageLayout data-testid="oh-forms-page">
      <ListPageHeaderSection>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">Forms</h1>
            <p className="text-[13px] text-dash-muted">Occupational health types and custom forms that apply at a clinical stage.</p>
          </div>
          <PrimaryButton type="button" onClick={() => setOpen(true)}>New form</PrimaryButton>
        </div>
      </ListPageHeaderSection>
      <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
        {(forms.data ?? []).map((form) => (
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
        {forms.data?.length === 0 ? <li className="px-4 py-6 text-[13px] text-dash-muted">No forms yet.</li> : null}
      </ul>
      {open ? <CreateFormDialog onClose={() => setOpen(false)} /> : null}
    </ListPageLayout>
  );
}

function formLabel(form: ClinicalFormRecord) {
  if (form.family === "occupational_health") {
    return OH_FORM_SYSTEM_TYPES.find((type) => type.value === form.system_type)?.label ?? "Occupational health";
  }
  const placement = form.placement;
  if (placement?.trigger === "transition") {
    return `Required when moving from ${placement.from ?? "OPD"} to ${placement.to ?? "IPD"}`;
  }
  return `At ${placement?.parent?.toUpperCase() ?? "OPD"} ${placement?.stage ?? ""}`.trim();
}

function CreateFormDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [family, setFamily] = useState<"occupational_health" | "custom">("occupational_health");
  const [name, setName] = useState("");
  const [systemType, setSystemType] = useState<string>(OH_FORM_SYSTEM_TYPES[0].value);
  const [parent, setParent] = useState<"opd" | "ipd">("opd");
  const [trigger, setTrigger] = useState<"stage" | "transition">("stage");
  const [stage, setStage] = useState<string>(OPD_FORM_STAGES[0].value);
  const [required, setRequired] = useState(true);
  const create = useMutation({
    mutationFn: createClinicalForm,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clinical-forms"] });
      onClose();
    },
  });

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4", appFont.className)}>
      <form
        className="w-full max-w-md space-y-4 rounded-md bg-white p-5 shadow-sm"
        data-testid="oh-create-form-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(family === "occupational_health"
            ? { name, family, system_type: systemType }
            : {
                name,
                family,
                placement: {
                  parent,
                  trigger,
                  stage: trigger === "stage" ? stage : null,
                  from: trigger === "transition" ? "opd" : null,
                  to: trigger === "transition" ? "ipd" : null,
                  required,
                },
              });
        }}
      >
        <h2 className="text-base font-semibold text-brand-navy">New form</h2>
        <div className="space-y-1.5">
          <Label>Name <RequiredFieldMarker /></Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Family</Label>
          <select className="h-9 w-full rounded-md border px-3 text-sm" value={family} onChange={(event) => setFamily(event.target.value as "occupational_health" | "custom")}>
            {OH_FORM_FAMILIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        {family === "occupational_health" ? (
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select className="h-9 w-full rounded-md border px-3 text-sm" value={systemType} onChange={(event) => setSystemType(event.target.value)}>
              {OH_FORM_SYSTEM_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>Parent</Label>
              <select className="h-9 w-full rounded-md border px-3 text-sm" value={parent} onChange={(event) => setParent(event.target.value as "opd" | "ipd")}>
                <option value="opd">OPD</option>
                <option value="ipd">IPD</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>When</Label>
              <select className="h-9 w-full rounded-md border px-3 text-sm" value={trigger} onChange={(event) => setTrigger(event.target.value as "stage" | "transition")}>
                <option value="stage">At a stage</option>
                <option value="transition">When admitting from OPD to IPD</option>
              </select>
            </div>
            {trigger === "stage" && parent === "opd" ? (
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <select className="h-9 w-full rounded-md border px-3 text-sm" value={stage} onChange={(event) => setStage(event.target.value)}>
                  {OPD_FORM_STAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-[13px] text-brand-navy">
              <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
              Required before continuing
            </label>
          </>
        )}
        {create.isError ? <p className="text-sm text-red-700">Could not create the form.</p> : null}
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={create.isPending}>Create</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
