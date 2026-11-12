"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { SectionedDialog } from "@/components/ui/sectioned-dialog";
import { SetupSaveActions } from "@/components/ui/setup-save-actions";
import { Input } from "@/components/ui/input";
import { useOnboardingReturn } from "@/features/overview/hooks/use-onboarding-return";
import {
  createOrganizationContractorDefaultValues,
  createOrganizationContractorSchema,
  toCreateOrganizationContractorPayload,
  type CreateOrganizationContractorFormValues,
} from "@/features/settings/schemas/organization-contractor.schema";
import { createOrganizationContractor } from "@/features/settings/services/settings.service";
import type { OrganizationContractor } from "@/features/settings/types/settings.types";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage, mapBffErrorsToForm } from "@/lib/bff-field-errors";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

const FORM_ID = "add-contractor-form";

type AddContractorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (contractor: OrganizationContractor) => void;
};

export function AddContractorDialog({
  open,
  onOpenChange,
  onCreated,
}: AddContractorDialogProps) {
  const { toast } = useToast();
  const { finishSetup } = useOnboardingReturn();
  const addAnotherRef = useRef(false);

  const form = useForm<CreateOrganizationContractorFormValues>({
    resolver: zodResolver(createOrganizationContractorSchema),
    defaultValues: createOrganizationContractorDefaultValues,
  });

  useEffect(() => {
    if (!open) {
      form.reset(createOrganizationContractorDefaultValues);
    }
  }, [form, open]);

  async function handleSubmit(values: CreateOrganizationContractorFormValues) {
    const addAnother = addAnotherRef.current;
    addAnotherRef.current = false;
    try {
      const contractor = await createOrganizationContractor(
        toCreateOrganizationContractorPayload(values),
      );
      toast({
        variant: "success",
        title: "Contractor added",
        description: `${contractor.name} was created successfully.`,
      });
      onCreated(contractor);
      if (addAnother) {
        form.reset(createOrganizationContractorDefaultValues);
        return;
      }
      form.reset(createOrganizationContractorDefaultValues);
      onOpenChange(false);
      finishSetup();
    } catch (error) {
      if (error instanceof BffError) {
        const fieldErrors = mapBffErrorsToForm(error.errors);
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field in createOrganizationContractorDefaultValues) {
            form.setError(
              field as keyof CreateOrganizationContractorFormValues,
              { message },
            );
          }
        }
        toast({
          variant: "error",
          title: "Could not add contractor",
          description: formatBffErrorMessage(error.message, error.errors),
        });
        return;
      }

      toast({
        variant: "error",
        title: "Could not add contractor",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <SectionedDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add contractor"
      description="Register an external company that supplies contracted workers to your organization."
      className={cn("sm:max-w-lg", appFont.className)}
      data-testid="add-contractor-dialog"
      footer={
        <SetupSaveActions
          formId={FORM_ID}
          isSubmitting={isSubmitting}
          submitLabel="Save contractor"
          onCancel={() => onOpenChange(false)}
          onSaveAndAddAnother={() => {
            addAnotherRef.current = true;
          }}
        />
      }
    >
      <Form {...form}>
        <form
          id={FORM_ID}
          className="space-y-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
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
                  <Input {...field} autoComplete="off" placeholder="Optional" />
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
        </form>
      </Form>
    </SectionedDialog>
  );
}
