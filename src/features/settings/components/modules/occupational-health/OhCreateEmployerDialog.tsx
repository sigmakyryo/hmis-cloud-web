"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { createOhEmployer } from "@/features/occupational-health/services/oh.service";
import type { OhEmployer } from "@/features/occupational-health/types";
import {
  ohEmployerFormSchema,
  type OhEmployerFormInput,
  type OhEmployerFormValues,
} from "@/features/settings/components/modules/occupational-health/ohEmployer.schema";
import { getErrorMessage, logFetchError } from "@/lib/fetch-error";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

type OhCreateEmployerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (employer: OhEmployer) => void;
};

export function OhCreateEmployerDialog({
  open,
  onOpenChange,
  onCreated,
}: OhCreateEmployerDialogProps) {
  const { toast } = useToast();
  const form = useForm<OhEmployerFormInput, unknown, OhEmployerFormValues>({
    resolver: zodResolver(ohEmployerFormSchema),
    defaultValues: { name: "", code: "", registrationNumber: "" },
  });
  const isSaving = form.formState.isSubmitting;

  async function onSubmit(values: OhEmployerFormValues) {
    try {
      const created = await createOhEmployer({
        name: values.name,
        code: values.code,
        registration_number: values.registrationNumber,
      });
      toast({ variant: "success", title: "Employer added" });
      onCreated(created);
    } catch (error) {
      logFetchError("oh-employers:create", error);
      toast({
        variant: "error",
        title: "Could not add employer",
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          appFont.className,
          "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
        )}
      >
        <SheetHeader className="space-y-1 px-5 pb-4 pr-12 pt-5 text-left">
          <SheetTitle>Add employer</SheetTitle>
          <SheetDescription>
            You can set up risk profiles, departments and job titles next.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            className="space-y-4 border-t border-dash-border px-5 py-4"
            onSubmit={form.handleSubmit((values) => onSubmit(values))}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <RequiredFieldMarker />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus placeholder="Acme Mining Ltd" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ACME" className="font-mono text-[13px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="2019/123456/07" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-dash-border pt-3">
              <SecondaryButton
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isSaving}>
                {isSaving ? "Adding" : "Add and open"}
              </PrimaryButton>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
