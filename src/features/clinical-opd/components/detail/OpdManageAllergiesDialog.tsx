"use client";

import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { UserIdenticon } from "@/components/UserIdenticon";
import {
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import {
  useCreateEncounterAllergy,
  useEncounterAllergies,
  useUpdateEncounterAllergy,
} from "@/features/clinical-opd/hooks/use-clinical-opd";
import { allergySchema } from "@/features/clinical-opd/schemas/clinical-opd.schema";
import type { ClinicalAllergy } from "@/features/clinical-opd/types/clinical-opd.types";
import { formatCustomerName } from "@/features/customers/utils/format-customer";
import { StartVisitChoiceRow } from "@/features/visits/components/StartVisitChoiceRow";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

const ALLERGY_TYPES = [
  { value: "medication", label: "Medication", hint: "Drugs and therapeutics" },
  { value: "food", label: "Food", hint: "Foods and ingredients" },
  { value: "latex", label: "Latex", hint: "Gloves and medical supplies" },
  { value: "anesthetic", label: "Anesthetic", hint: "Local or general agents" },
  { value: "metal", label: "Metal", hint: "Implants and instruments" },
  {
    value: "environmental",
    label: "Environmental",
    hint: "Pollen, dust, animals",
  },
  { value: "other", label: "Other", hint: "Anything not listed above" },
] as const;

const SEVERITIES = [
  { value: "mild", label: "Mild", hint: "Limited symptoms" },
  { value: "moderate", label: "Moderate", hint: "Needs clinical attention" },
  { value: "severe", label: "Severe", hint: "High clinical risk" },
  {
    value: "life_threatening",
    label: "Life threatening",
    hint: "Anaphylaxis or equivalent",
  },
] as const;

const HIGH_RISK = new Set(["severe", "life_threatening"]);

type OpdManageAllergiesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitUuid: string;
  encounterUuid: string;
};

export function OpdManageAllergiesDialog({
  open,
  onOpenChange,
  visitUuid,
  encounterUuid,
}: OpdManageAllergiesDialogProps) {
  const { isChartLocked, capabilities, customer, encounter } =
    useOpdEncounterWorkspace();
  const canWrite = capabilities.includes("record_allergy") && !isChartLocked;
  const allergies = useEncounterAllergies(visitUuid, encounterUuid, open);
  const createAllergy = useCreateEncounterAllergy(visitUuid, encounterUuid);
  const updateAllergy = useUpdateEncounterAllergy(visitUuid, encounterUuid);

  const customerName = customer
    ? formatCustomerName(customer)
    : (encounter?.customer_name ?? "Client");
  const identifier =
    customer?.customer_identifier?.trim() ||
    encounter?.customer_identifier?.trim() ||
    null;

  const form = useForm({
    resolver: zodResolver(allergySchema),
    defaultValues: {
      allergy_name: "",
      allergy_type: "medication" as const,
      severity: "moderate" as const,
      reaction: "",
      notes: "",
      date_identified: "",
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [form, open]);

  const allergyType = form.watch("allergy_type");
  const severity = form.watch("severity");
  const items = (allergies.data ?? []).filter(
    (allergy) => allergy.is_active !== false,
  );
  const isSaving = createAllergy.isPending;

  async function handleCreate(values: {
    allergy_name: string;
    allergy_type: string;
    severity: string;
    reaction?: string;
    notes?: string;
    date_identified?: string;
  }) {
    await createAllergy.mutateAsync(values);
    form.reset({
      allergy_name: "",
      allergy_type: "medication",
      severity: "moderate",
      reaction: "",
      notes: "",
      date_identified: "",
    });
  }

  async function handleDeactivate(allergy: ClinicalAllergy) {
    await updateAllergy.mutateAsync({
      allergyUuid: allergy.uuid,
      payload: { is_active: false },
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          appFont.className,
          "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl",
        )}
        data-testid="opd-manage-allergies-dialog"
      >
        <SheetHeader className="space-y-0 border-b border-dash-border/70 px-6 py-5 pr-14 text-left">
          <div className="flex items-center gap-3.5">
            <UserIdenticon
              seed={
                customer?.uuid ||
                encounter?.customer_uuid ||
                identifier ||
                customerName
              }
              name={customerName}
              className="size-11 shrink-0 rounded-xl"
              fallbackClassName="text-sm font-semibold"
            />
            <div className="min-w-0">
              <SheetTitle className="text-sm font-medium text-dash-muted">
                Manage allergies
              </SheetTitle>
              <p className="truncate text-base font-semibold tracking-tight text-brand-navy">
                {customerName}
              </p>
              {identifier ? (
                <p className="mt-0.5 truncate text-sm text-dash-muted">
                  {identifier}
                </p>
              ) : null}
            </div>
          </div>
          <SheetDescription className="sr-only">
            {canWrite
              ? `Add or remove allergies for ${customerName}`
              : `Allergies on file for ${customerName}`}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {canWrite ? (
            <form
              id="opd-manage-allergies-form"
              className="space-y-5"
              onSubmit={form.handleSubmit((values) => {
                void handleCreate(values);
              })}
            >
              <div className="space-y-1.5">
                <Label htmlFor="opd-allergy-name">
                  Allergy name
                  <RequiredFieldMarker />
                </Label>
                <Input
                  id="opd-allergy-name"
                  placeholder="e.g. Penicillin"
                  autoComplete="off"
                  {...form.register("allergy_name")}
                />
                {form.formState.errors.allergy_name ? (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.allergy_name.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>
                  Type
                  <RequiredFieldMarker />
                </Label>
                <div
                  role="radiogroup"
                  aria-label="Allergy type"
                  className="divide-y divide-dash-border/70 border-y border-dash-border/70"
                >
                  {ALLERGY_TYPES.map((type) => (
                    <StartVisitChoiceRow
                      key={type.value}
                      selected={allergyType === type.value}
                      title={type.label}
                      hint={type.hint}
                      onSelect={() => form.setValue("allergy_type", type.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Severity
                  <RequiredFieldMarker />
                </Label>
                <div
                  role="radiogroup"
                  aria-label="Allergy severity"
                  className="divide-y divide-dash-border/70 border-y border-dash-border/70"
                >
                  {SEVERITIES.map((option) => (
                    <StartVisitChoiceRow
                      key={option.value}
                      selected={severity === option.value}
                      title={option.label}
                      hint={option.hint}
                      onSelect={() => form.setValue("severity", option.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="opd-allergy-reaction">Reaction</Label>
                <Input
                  id="opd-allergy-reaction"
                  placeholder="Optional — what happens on exposure"
                  autoComplete="off"
                  {...form.register("reaction")}
                />
              </div>
            </form>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-brand-navy">On file</p>
              <span className="text-xs text-dash-muted">
                {allergies.isLoading ? "Loading…" : `${items.length} active`}
              </span>
            </div>

            {allergies.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-xl border border-dash-border bg-slate-50"
                  />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-dash-border px-4 py-10 text-center">
                <ShieldAlert
                  className="size-5 text-dash-muted"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-brand-navy">
                  No known allergies
                </p>
                <p className="max-w-xs text-xs text-dash-muted">
                  {canWrite
                    ? "Add the first allergy using the form above."
                    : "Nothing recorded for this client yet."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-dash-border/70 overflow-hidden rounded-xl border border-dash-border/70">
                {items.map((allergy) => (
                  <li
                    key={allergy.uuid}
                    className="flex items-start justify-between gap-3 bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-navy">
                        {allergy.allergy_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-dash-muted">
                        {[
                          allergy.allergy_type.replaceAll("_", " "),
                          allergy.reaction?.trim() || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                          HIGH_RISK.has(allergy.severity)
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-800",
                        )}
                      >
                        {allergy.severity.replaceAll("_", " ")}
                      </span>
                      {canWrite ? (
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-dash-muted transition-colors hover:bg-red-50 hover:text-red-700"
                          aria-label={`Remove ${allergy.allergy_name}`}
                          disabled={updateAllergy.isPending}
                          onClick={() => {
                            void handleDeactivate(allergy);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-dash-border/60 bg-white px-6 py-4">
          <SecondaryButton
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Done
          </SecondaryButton>
          {canWrite ? (
            <PrimaryButton
              type="submit"
              form="opd-manage-allergies-form"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save allergy"
              )}
            </PrimaryButton>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
