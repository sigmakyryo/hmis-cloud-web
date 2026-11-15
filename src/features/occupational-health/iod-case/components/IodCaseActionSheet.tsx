"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type FieldPath } from "react-hook-form";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { IOD_ACTIONS, type IodActionDef, type IodActionId, type IodFieldSpec } from "@/features/occupational-health/iod-case/iod-case.actions";
import { schemaForFields, toChangedPayload, toFormValues, type IodCaseFormValues } from "@/features/occupational-health/iod-case/iod-case.schema";
import type { IodCaseDetail } from "@/features/occupational-health/iod-case/iod-case.types";
import { IOD_SAFETY_CLASSES, IOD_SEVERITIES } from "@/features/occupational-health/iod-case/iod-case.utils";
import { todayIsoDate } from "@/features/occupational-health/utils/oh-format";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type IodCaseActionSheetProps = {
  item: IodCaseDetail;
  /** The action being done, or null when the sheet is closed. */
  actionId: IodActionId | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (changes: Record<string, unknown>) => void;
};

/** One sheet for every case action: Edit case and each of the smaller ones are just different field lists. */
export function IodCaseActionSheet({ item, actionId, isSaving, onClose, onSave }: IodCaseActionSheetProps) {
  const action = actionId ? IOD_ACTIONS[actionId] : null;
  return (
    <Sheet open={action !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent className={cn(appFont.className, "flex w-full flex-col p-0", action?.wide ? "sm:max-w-xl" : "sm:max-w-md")}>
        {action ? <ActionForm key={action.id} item={item} action={action} isSaving={isSaving} onCancel={onClose} onSave={onSave} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function ActionForm({
  item,
  action,
  isSaving,
  onCancel,
  onSave,
}: {
  item: IodCaseDetail;
  action: IodActionDef;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (changes: Record<string, unknown>) => void;
}) {
  const original = toFormValues(item);
  const { register, control, handleSubmit, formState } = useForm<IodCaseFormValues>({
    resolver: zodResolver(schemaForFields(action.fields.map((field) => field.name))),
    defaultValues: original,
  });
  const inputId = (name: string) => `iod-${action.id}-${name}`;

  function control_(field: IodFieldSpec) {
    const name = field.name as FieldPath<IodCaseFormValues>;
    switch (field.kind) {
      case "area":
        return <Textarea id={inputId(name)} rows={field.rows ?? 3} {...register(name)} />;
      case "check":
        return null;
      case "severity":
      case "classification": {
        const options = field.kind === "severity" ? IOD_SEVERITIES : IOD_SAFETY_CLASSES;
        return (
          <Controller
            control={control}
            name={name as "severity" | "safety_classification"}
            render={({ field: bound }) => (
              <Select value={bound.value || undefined} onValueChange={bound.onChange}>
                <SelectTrigger id={inputId(name)} className="w-full">
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
        );
      }
      default:
        return <Input id={inputId(name)} type={field.kind} max={field.name === "onset_date" ? todayIsoDate() : undefined} min={field.kind === "number" ? 0 : undefined} {...register(name)} />;
    }
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={handleSubmit((values) => {
        const changes = toChangedPayload(original, { ...original, ...values });
        if (Object.keys(changes).length === 0) onCancel();
        else onSave(changes);
      })}
    >
      <SheetHeader className="border-b border-dash-border/80 px-6 py-4 pr-12">
        <SheetTitle>{action.title}</SheetTitle>
        <SheetDescription>{action.description}</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {action.fields.map((field) => {
            const message = formState.errors[field.name]?.message;
            return (
              <div key={field.name} className={cn("space-y-1.5", field.half ? "col-span-2 sm:col-span-1" : "col-span-2")}>
                {field.kind === "check" ? (
                  <label className="flex items-center gap-2 text-sm text-brand-navy">
                    <input type="checkbox" className="size-4 rounded border-dash-border" {...register(field.name as "work_related")} /> {field.label}
                  </label>
                ) : (
                  <>
                    <Label htmlFor={inputId(field.name)}>
                      {field.label} {field.required ? <RequiredFieldMarker /> : null}
                    </Label>
                    {control_(field)}
                  </>
                )}
                {message ? (
                  <p className="text-xs text-red-700" role="alert">
                    {String(message)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-dash-border/80 px-6 py-3">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : action.saveLabel}
        </PrimaryButton>
      </div>
    </form>
  );
}
