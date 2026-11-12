"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { Switch } from "@/components/ui/switch";
import { TabbedDialog } from "@/components/ui/tabbed-dialog";
import {
  toUpdateOrganizationContractorFormValues,
  toUpdateOrganizationContractorPayload,
  updateOrganizationContractorSchema,
  type UpdateOrganizationContractorFormValues,
} from "@/features/settings/schemas/organization-contractor.schema";
import { updateOrganizationContractor } from "@/features/settings/services/settings.service";
import type { OrganizationContractor } from "@/features/settings/types/settings.types";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage, mapBffErrorsToForm } from "@/lib/bff-field-errors";
import { appFont } from "@/lib/fonts";
import { useToast } from "@/providers/toast-provider";

const FORM_ID = "update-contractor-form";

type UpdateContractorTab = "details" | "active";

const UPDATE_CONTRACTOR_TABS: ReadonlyArray<{
  id: UpdateContractorTab;
  label: string;
}> = [
  { id: "details", label: "Details" },
  { id: "active", label: "Active" },
];

function isUpdateContractorTab(value: string): value is UpdateContractorTab {
  return UPDATE_CONTRACTOR_TABS.some((tab) => tab.id === value);
}

type UpdateContractorDialogProps = {
  contractor: OrganizationContractor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (contractor: OrganizationContractor) => void;
};

export function UpdateContractorDialog({
  contractor,
  open,
  onOpenChange,
  onUpdated,
}: UpdateContractorDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<UpdateContractorTab>("details");

  const form = useForm<UpdateOrganizationContractorFormValues>({
    resolver: zodResolver(updateOrganizationContractorSchema),
    defaultValues: toUpdateOrganizationContractorFormValues(contractor),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    form.reset(toUpdateOrganizationContractorFormValues(contractor));
    setActiveTab("details");
  }, [contractor, form, open]);

  async function handleSubmit(values: UpdateOrganizationContractorFormValues) {
    try {
      const updated = await updateOrganizationContractor(
        contractor.uuid,
        toUpdateOrganizationContractorPayload(values),
      );
      toast({
        variant: "success",
        title: "Contractor updated",
        description: `${updated.name} was saved successfully.`,
      });
      onUpdated(updated);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof BffError) {
        const fieldErrors = mapBffErrorsToForm(error.errors);
        for (const [field, message] of Object.entries(fieldErrors)) {
          form.setError(field as keyof UpdateOrganizationContractorFormValues, {
            message,
          });
        }
        toast({
          variant: "error",
          title: "Could not update contractor",
          description: formatBffErrorMessage(error.message, error.errors),
        });
        return;
      }

      toast({
        variant: "error",
        title: "Could not update contractor",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;
  const isActive = form.watch("is_active");

  return (
    <TabbedDialog
      open={open}
      onOpenChange={onOpenChange}
      title={contractor.name}
      description="Update contractor details or activate status."
      className={appFont.className}
      data-testid="update-contractor-dialog"
      tabs={UPDATE_CONTRACTOR_TABS}
      activeTab={activeTab}
      onTabChange={(value) => {
        if (isUpdateContractorTab(value)) {
          setActiveTab(value);
        }
      }}
      footer={
        <div className="flex justify-end gap-2">
          <SecondaryButton
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            form={FORM_ID}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </PrimaryButton>
        </div>
      }
    >
      <Form {...form}>
        <form
          id={FORM_ID}
          className="space-y-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          {activeTab === "details" ? (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Company name
                      <RequiredFieldMarker />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="organization" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contractor code</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact person</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" autoComplete="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="street-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ) : (
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 space-y-0 rounded-xl border border-brand-border px-4 py-3">
                  <div className="min-w-0">
                    <FormLabel className="text-sm text-brand-navy">
                      Contractor is {isActive ? "active" : "inactive"}
                    </FormLabel>
                    <p className="mt-1 text-xs text-brand-muted">
                      {isActive
                        ? "Active contractors can be selected during patient registration."
                        : "Inactive contractors stay on file and are hidden from registration."}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                      data-testid="contractor-active-switch"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </form>
      </Form>
    </TabbedDialog>
  );
}
