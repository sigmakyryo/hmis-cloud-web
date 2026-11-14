"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  iodCaseFormSchema,
  toChangedPayload,
  toFormValues,
  type IodCaseFormValues,
} from "@/features/occupational-health/iod-case/iod-case.schema";
import type { IodCaseDetail } from "@/features/occupational-health/iod-case/iod-case.types";
import {
  IOD_SAFETY_CLASSES,
  IOD_SEVERITIES,
  IOD_STATUSES,
} from "@/features/occupational-health/iod-case/iod-case.utils";
import { todayIsoDate } from "@/features/occupational-health/utils/oh-format";
import { appFont } from "@/lib/fonts";

type IodCaseEditSheetProps = {
  item: IodCaseDetail;
  open: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (changes: Record<string, unknown>) => void;
};

export function IodCaseEditSheet({ item, open, isSaving, onOpenChange, onSave }: IodCaseEditSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={`${appFont.className} flex w-full flex-col p-0 sm:max-w-xl`}>
        {open ? <EditForm item={item} isSaving={isSaving} onCancel={() => onOpenChange(false)} onSave={onSave} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-4 border-t border-dash-border/80 pt-5 first:border-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-dash-muted">{title}</h3>
      {children}
    </section>
  );
}

function EditForm({
  item,
  isSaving,
  onCancel,
  onSave,
}: {
  item: IodCaseDetail;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (changes: Record<string, unknown>) => void;
}) {
  const original = toFormValues(item);
  const { register, control, handleSubmit, formState } = useForm<IodCaseFormValues>({
    resolver: zodResolver(iodCaseFormSchema),
    defaultValues: original,
  });
  const { errors } = formState;

  const error = (name: FieldPath<IodCaseFormValues>) =>
    errors[name]?.message ? (
      <p className="text-xs text-red-700" role="alert">
        {String(errors[name]?.message)}
      </p>
    ) : null;

  const text = (name: FieldPath<IodCaseFormValues>, label: string, props: { required?: boolean; type?: string; max?: string } = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`iod-edit-${name}`}>
        {label} {props.required ? <RequiredFieldMarker /> : null}
      </Label>
      <Input id={`iod-edit-${name}`} type={props.type ?? "text"} max={props.max} {...register(name)} />
      {error(name)}
    </div>
  );

  const area = (name: FieldPath<IodCaseFormValues>, label: string, required = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={`iod-edit-${name}`}>
        {label} {required ? <RequiredFieldMarker /> : null}
      </Label>
      <Textarea id={`iod-edit-${name}`} rows={3} {...register(name)} />
      {error(name)}
    </div>
  );

  const choice = (name: "severity" | "safety_classification" | "status", label: string, options: ReadonlyArray<{ value: string; label: string }>) => (
    <div className="space-y-1.5">
      <Label htmlFor={`iod-edit-${name}`}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value || undefined} onValueChange={field.onChange}>
            <SelectTrigger id={`iod-edit-${name}`} className="w-full">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent className={appFont.className}>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={handleSubmit((values) => {
        const changes = toChangedPayload(original, values);
        if (Object.keys(changes).length === 0) onCancel();
        else onSave(changes);
      })}
    >
      <SheetHeader className="border-b border-dash-border/80 px-6 py-4 pr-12">
        <SheetTitle>Edit case</SheetTitle>
        <SheetDescription>Update the incident record. Changes are added to the timeline.</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <FieldGroup title="Incident">
          <div className="grid grid-cols-2 gap-3">
            {text("onset_date", "Incident date", { required: true, type: "date", max: todayIsoDate() })}
            {text("incident_time", "Time", { type: "time" })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {choice("severity", "Severity", IOD_SEVERITIES)}
            {choice("safety_classification", "Classification", IOD_SAFETY_CLASSES)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {text("mechanism", "Mechanism")}
            {text("body_part", "Body part")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {text("incident_location", "Location")}
            {text("reported_by", "Reported by")}
          </div>
          {area("description", "Description", true)}
          <label className="flex items-center gap-2 text-sm text-brand-navy">
            <input type="checkbox" className="size-4 rounded border-dash-border" {...register("work_related")} /> Work related
          </label>
        </FieldGroup>

        <FieldGroup title="Response and treatment">
          {area("immediate_action", "Immediate action")}
          {area("treatment_given", "Treatment given")}
          {area("witnesses", "Witnesses")}
        </FieldGroup>

        <FieldGroup title="Cause">{area("root_cause", "Root cause")}</FieldGroup>

        <FieldGroup title="Case">
          <div className="grid grid-cols-2 gap-3">
            {choice("status", "Status", IOD_STATUSES)}
            {text("she_reference", "SHE reference")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {text("lost_days", "Lost days", { type: "number" })}
            {text("return_to_work_on", "Returned to work", { type: "date" })}
          </div>
        </FieldGroup>
      </div>

      <div className="flex justify-end gap-2 border-t border-dash-border/80 px-6 py-3">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save changes"}
        </PrimaryButton>
      </div>
    </form>
  );
}
