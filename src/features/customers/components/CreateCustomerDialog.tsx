"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { ROUTES } from "@/constants/routes";
import { NextStepOptionsList } from "@/components/ui/next-step-options-list";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CreateAppointmentDialog } from "@/features/appointments/components/CreateAppointmentDialog";
import type { Appointment } from "@/features/appointments/types/appointment.types";
import { CustomerEmploymentFields } from "@/features/customers/components/CustomerEmploymentFields";
import { CustomerFormFields } from "@/features/customers/components/CustomerFormFields";
import { CustomerOnboardingForms } from "@/features/customers/components/CustomerOnboardingForms";
import { CustomerInsuranceFormFields } from "@/features/customers/components/CustomerInsuranceFormFields";
import { CustomerVisitDialog } from "@/features/customers/components/detail/CustomerVisitDialog";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Form } from "@/components/ui/form";
import {
  createCustomerInsuranceDefaultValues,
  createCustomerInsuranceSchema,
  toCustomerInsurancePayload,
  type CreateCustomerInsuranceFormValues,
} from "@/features/customers/schemas/customer-insurance.schema";
import {
  customerEmploymentDefaultValues,
  customerEmploymentFormSchema,
  toCustomerEmploymentWritePayload,
  type CustomerEmploymentFormValues,
} from "@/features/customers/schemas/customer-employment.schema";
import {
  createCustomerDefaultValues,
  createCustomerSchema,
  toCustomerWritePayload,
  type CreateCustomerFormValues,
} from "@/features/customers/schemas/customer.schema";
import { splitClientSearchName } from "@/features/customers/utils/format-customer";
import type { CustomerRegistrationDraft } from "@/features/customers/utils/membership-registration";
import { createCustomerInsurance } from "@/features/customers/services/customer-insurance.service";
import { createCustomer } from "@/features/customers/services/customers.service";
import { fetchInsuranceSchemes } from "@/features/customers/services/insurance-schemes.service";
import type { Customer } from "@/features/customers/types/customer.types";
import type { CustomerVisit } from "@/features/customers/types/customer-visit.types";
import type { InsuranceScheme } from "@/features/customers/types/customer-insurance.types";
import type { ClinicalFormRecord } from "@/features/occupational-health/lib/oh-form-catalog";
import { fetchClinicalForms } from "@/features/occupational-health/services/oh.service";
import type { OrganizationContractor } from "@/features/settings/types/settings.types";
import { isEmployeeBasedOrganization } from "@/features/settings/utils/organization-type";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage, mapBffErrorsToForm } from "@/lib/bff-field-errors";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/providers/user-provider";

type CreateCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: Customer) => void;
  initialName?: string;
  registration?: CustomerRegistrationDraft | null;
  /** Save the client and return immediately — skip insurance. */
  mode?: "full" | "quick";
};

type CreateCustomerTab =
  | "employment"
  | "personal"
  | "onboarding"
  | "insurance"
  | "whats-next";

function getCustomerDisplayName(customer: Customer) {
  return (
    customer.full_name ||
    [customer.first_name, customer.middle_name, customer.last_name]
      .filter(Boolean)
      .join(" ")
  );
}

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onCreated,
  initialName = "",
  registration = null,
  mode = "full",
}: CreateCustomerDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { userData } = useUser();
  const showEmploymentTab = isEmployeeBasedOrganization(userData?.tenant);
  const initialTab: CreateCustomerTab = showEmploymentTab
    ? "employment"
    : "personal";
  const [activeTab, setActiveTab] = useState<CreateCustomerTab>(initialTab);
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);
  const [schemes, setSchemes] = useState<InsuranceScheme[]>([]);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [onboardingForms, setOnboardingForms] = useState<ClinicalFormRecord[]>([]);
  const [employmentContractor, setEmploymentContractor] =
    useState<OrganizationContractor | null>(null);
  const [employmentRelatedEmployee, setEmploymentRelatedEmployee] =
    useState<Customer | null>(null);
  const [employmentComplete, setEmploymentComplete] = useState(false);

  const personalForm = useForm<CreateCustomerFormValues>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      ...createCustomerDefaultValues,
      ...splitClientSearchName(initialName),
    },
  });

  const employmentForm = useForm<CustomerEmploymentFormValues>({
    resolver: zodResolver(customerEmploymentFormSchema),
    defaultValues: customerEmploymentDefaultValues,
  });

  const insuranceForm = useForm<CreateCustomerInsuranceFormValues>({
    resolver: zodResolver(createCustomerInsuranceSchema),
    defaultValues: createCustomerInsuranceDefaultValues,
  });
  const appliedRegistrationKey = useRef("");

  const registrationKey = registration
    ? [
        registration.membershipNumber,
        registration.suffix,
        registration.firstName,
        registration.lastName,
      ].join("|")
    : "";

  useEffect(() => {
    if (!open) {
      appliedRegistrationKey.current = "";
      return;
    }
    const key = registrationKey || "blank";
    if (appliedRegistrationKey.current === key) {
      return;
    }
    appliedRegistrationKey.current = key;
    setActiveTab(showEmploymentTab ? "employment" : "personal");
    setCreatedCustomer(null);
    setEmploymentComplete(false);
    setEmploymentContractor(null);
    setEmploymentRelatedEmployee(null);
    employmentForm.reset(customerEmploymentDefaultValues);
    const searchedName = registration ? null : splitClientSearchName(initialName);
    personalForm.reset({
      ...createCustomerDefaultValues,
      first_name: registration?.firstName || searchedName?.first_name || "",
      middle_name: registration?.middleName || searchedName?.middle_name || "",
      last_name: registration?.lastName || searchedName?.last_name || "",
      gender: registration?.gender ?? createCustomerDefaultValues.gender,
      dob: registration?.dob ?? "",
      phone_number: registration?.phoneNumber ?? "",
      email: registration?.email ?? "",
    });
    insuranceForm.reset({
      ...createCustomerInsuranceDefaultValues,
      membership_number: registration?.membershipNumber ?? "",
      suffix: registration?.suffix ?? "",
      is_principal_member: registration?.isPrincipalMember ?? false,
      principal_member_name: registration?.principalMemberName ?? "",
      relationship_to_principal_member: registration?.relationship ?? "",
      is_primary: Boolean(registration?.membershipNumber),
    });
  }, [
    employmentForm,
    initialName,
    insuranceForm,
    open,
    personalForm,
    registration,
    registrationKey,
    showEmploymentTab,
  ]);

  const isCustomerCreated = Boolean(createdCustomer);
  const isCreatingCustomer = personalForm.formState.isSubmitting;
  const isSavingInsurance = insuranceForm.formState.isSubmitting;
  const isBusy = isCreatingCustomer || isSavingInsurance;

  const customerFullName = useMemo(() => {
    if (createdCustomer) {
      return getCustomerDisplayName(createdCustomer);
    }

    const values = personalForm.getValues();
    return [values.first_name, values.middle_name, values.last_name]
      .filter(Boolean)
      .join(" ");
  }, [createdCustomer, personalForm]);

  const resetDialogState = useCallback(() => {
    setActiveTab(showEmploymentTab ? "employment" : "personal");
    setCreatedCustomer(null);
    setSchemes([]);
    setIsLoadingSchemes(false);
    setVisitDialogOpen(false);
    setAppointmentDialogOpen(false);
    setOnboardingForms([]);
    setEmploymentComplete(false);
    setEmploymentContractor(null);
    setEmploymentRelatedEmployee(null);
    employmentForm.reset(customerEmploymentDefaultValues);
    personalForm.reset(createCustomerDefaultValues);
    insuranceForm.reset(createCustomerInsuranceDefaultValues);
  }, [employmentForm, insuranceForm, personalForm, showEmploymentTab]);

  const loadInsuranceSchemes = useCallback(async () => {
    const hint = registration?.schemeName.trim().toLowerCase();
    const applyScheme = (nextSchemes: InsuranceScheme[]) => {
      if (!hint) {
        return;
      }
      const match = nextSchemes.find((scheme) => {
        const name = scheme.name.trim().toLowerCase();
        const code = scheme.code.trim().toLowerCase();
        return name === hint || code === hint;
      });
      if (match) {
        insuranceForm.setValue("insurance_scheme", match.id);
      }
    };

    if (schemes.length > 0) {
      applyScheme(schemes);
      return;
    }

    try {
      setIsLoadingSchemes(true);
      const nextSchemes = await fetchInsuranceSchemes();
      setSchemes(nextSchemes);
      applyScheme(nextSchemes);
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not load insurance schemes",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setIsLoadingSchemes(false);
    }
  }, [insuranceForm, registration?.schemeName, schemes, toast]);

  function handleTabChange(tabId: CreateCustomerTab) {
    setActiveTab(tabId);
    if (tabId === "insurance" && isCustomerCreated) {
      void loadInsuranceSchemes();
    }
  }

  const finalizeCreatedCustomer = useCallback(
    (customer: Customer) => {
      resetDialogState();
      onCreated(customer);
      onOpenChange(false);
    },
    [onCreated, onOpenChange, resetDialogState],
  );

  async function requiredOnboardingForms() {
    try {
      const forms = await fetchClinicalForms();
      return forms.filter((form) => (
        form.family === "custom"
        && form.placement?.trigger === "onboarding"
        && form.placement.required === true
      ));
    } catch (error) {
      toast({
        variant: "error",
        title: "Could not check onboarding forms",
        description: error instanceof Error ? error.message : "Something went wrong.",
      });
      return [];
    }
  }

  function continueAfterOnboarding() {
    setOnboardingForms([]);
    if (!createdCustomer) {
      return;
    }
    if (mode === "quick") {
      finalizeCreatedCustomer(createdCustomer);
      return;
    }
    setActiveTab("insurance");
    void loadInsuranceSchemes();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && onboardingForms.length > 0) {
      toast({
        variant: "error",
        title: "Finish the required forms",
        description: "This client is saved. Submit or upload each required form before closing.",
      });
      return;
    }

    if (!nextOpen) {
      if (createdCustomer) {
        finalizeCreatedCustomer(createdCustomer);
        return;
      }

      resetDialogState();
    }

    onOpenChange(nextOpen);
  }

  async function handleContinueFromEmployment(
    values: CustomerEmploymentFormValues,
  ) {
    const payload = toCustomerEmploymentWritePayload(values);
    if (!payload) {
      return;
    }
    if (
      payload.role === "employee" &&
      payload.employee_number &&
      !personalForm.getValues("internal_reference")
    ) {
      personalForm.setValue("internal_reference", payload.employee_number);
    }
    setEmploymentComplete(true);
    setActiveTab("personal");
  }

  async function handleCreateCustomer(values: CreateCustomerFormValues) {
    try {
      const employmentPayload = showEmploymentTab
        ? toCustomerEmploymentWritePayload(employmentForm.getValues())
        : null;
      if (showEmploymentTab && !employmentPayload) {
        setActiveTab("employment");
        toast({
          variant: "error",
          title: "Employment details required",
          description: "Complete the Employment tab before saving the client.",
        });
        return;
      }
      const customer = await createCustomer(
        toCustomerWritePayload(values, employmentPayload),
      );
      toast({
        variant: "success",
        title: "Client created",
        description:
          mode === "quick"
            ? `${getCustomerDisplayName(customer)} was added.`
            : `${getCustomerDisplayName(customer)} was added. Continue with insurance, or skip ahead.`,
      });
      const pending = await requiredOnboardingForms();
      setCreatedCustomer(customer);
      if (pending.length > 0) {
        setOnboardingForms(pending);
        setActiveTab("onboarding");
        return;
      }
      if (mode === "quick") {
        finalizeCreatedCustomer(customer);
        return;
      }
      setActiveTab("insurance");
      void loadInsuranceSchemes();
    } catch (error) {
      if (error instanceof BffError) {
        const fieldErrors = mapBffErrorsToForm(error.errors);
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field in createCustomerDefaultValues) {
            personalForm.setError(field as keyof CreateCustomerFormValues, {
              message,
            });
          }
          if (field.startsWith("employment.")) {
            const employmentField = field.replace(
              "employment.",
              "",
            ) as keyof CustomerEmploymentFormValues;
            employmentForm.setError(employmentField, { message });
            setActiveTab("employment");
          }
        }

        toast({
          variant: "error",
          title: "Could not create client",
          description: formatBffErrorMessage(error.message, error.errors),
        });
        return;
      }

      toast({
        variant: "error",
        title: "Could not create client",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  async function handleSaveInsurance(values: CreateCustomerInsuranceFormValues) {
    if (!createdCustomer) {
      return;
    }

    try {
      await createCustomerInsurance(
        createdCustomer.uuid,
        toCustomerInsurancePayload(values),
      );
      toast({
        variant: "success",
        title: "Insurance added",
        description: "Insurance details were saved for this client.",
      });
      insuranceForm.reset(createCustomerInsuranceDefaultValues);
      setActiveTab("whats-next");
    } catch (error) {
      if (error instanceof BffError) {
        const fieldErrors = mapBffErrorsToForm(error.errors);
        for (const [field, message] of Object.entries(fieldErrors)) {
          if (field in createCustomerInsuranceDefaultValues) {
            insuranceForm.setError(
              field as keyof CreateCustomerInsuranceFormValues,
              { message },
            );
          }
        }

        toast({
          variant: "error",
          title: "Could not add insurance",
          description: formatBffErrorMessage(error.message, error.errors),
        });
        return;
      }

      toast({
        variant: "error",
        title: "Could not add insurance",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    }
  }

  const onboardingPending = onboardingForms.length > 0;
  const personalDisabled = showEmploymentTab && !employmentComplete && !isCustomerCreated;
  const tabs: Array<{
    id: CreateCustomerTab;
    label: string;
    disabled?: boolean;
  }> =
    mode === "quick"
      ? [
          ...(showEmploymentTab
            ? [{ id: "employment" as const, label: "Employment", disabled: isCustomerCreated }]
            : []),
          { id: "personal", label: "Client", disabled: personalDisabled },
          ...(onboardingPending
            ? [{ id: "onboarding" as const, label: "Forms", disabled: !isCustomerCreated }]
            : []),
        ]
      : [
          ...(showEmploymentTab
            ? [{ id: "employment" as const, label: "Employment", disabled: isCustomerCreated }]
            : []),
          { id: "personal", label: "Personal", disabled: personalDisabled },
          ...(onboardingPending
            ? [{ id: "onboarding" as const, label: "Forms", disabled: !isCustomerCreated }]
            : []),
          { id: "insurance", label: "Insurance", disabled: !isCustomerCreated || onboardingPending },
          { id: "whats-next", label: "What's next?", disabled: !isCustomerCreated || onboardingPending },
        ];

  const whatsNextOptions = useMemo(() => {
    if (!createdCustomer) {
      return [];
    }

    const displayName = getCustomerDisplayName(createdCustomer);

    return [
      {
        id: "view-client",
        title: "View client",
        description: `Open ${displayName}'s profile.`,
        icon: "user" as const,
        onSelect: () => {
          finalizeCreatedCustomer(createdCustomer);
          router.push(ROUTES.customerDetail(createdCustomer.uuid));
        },
        testId: "create-customer-view-client-next-button",
      },
      {
        id: "start-visit",
        title: "Start a visit",
        description: "Open the visit workflow for this client.",
        icon: "hospital" as const,
        emphasized: true,
        onSelect: () => setVisitDialogOpen(true),
        testId: "create-customer-start-visit-next-button",
      },
      {
        id: "schedule-appointment",
        title: "Schedule an appointment",
        description: `Book a future appointment for ${displayName}.`,
        icon: "calendarClock" as const,
        onSelect: () => setAppointmentDialogOpen(true),
        testId: "create-customer-schedule-appointment-next-button",
      },
    ];
  }, [createdCustomer, finalizeCreatedCustomer, router]);

  function handleVisitChanged(_visit: CustomerVisit) {
    if (!createdCustomer) {
      return;
    }

    finalizeCreatedCustomer(createdCustomer);
    router.push(ROUTES.customerDetail(createdCustomer.uuid));
  }

  function handleAppointmentCreated(_appointment: Appointment) {
    if (!createdCustomer) {
      return;
    }

    toast({
      variant: "success",
      title: "Appointment scheduled",
      description: `An appointment was booked for ${getCustomerDisplayName(createdCustomer)}.`,
    });
    setAppointmentDialogOpen(false);
    finalizeCreatedCustomer(createdCustomer);
    router.push(ROUTES.customerDetail(createdCustomer.uuid));
  }

  function renderFooter() {
    if (activeTab === "employment" && !isCustomerCreated) {
      return (
        <>
          <SecondaryButton
            type="button"
            disabled={isBusy}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            form="create-customer-employment-form"
            disabled={isBusy}
            data-testid="create-customer-employment-continue"
          >
            Continue
          </PrimaryButton>
        </>
      );
    }

    if (activeTab === "personal" && !isCustomerCreated) {
      return (
        <>
          {showEmploymentTab ? (
            <SecondaryButton
              type="button"
              disabled={isBusy}
              onClick={() => setActiveTab("employment")}
            >
              Back
            </SecondaryButton>
          ) : (
            <SecondaryButton
              type="button"
              disabled={isBusy}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </SecondaryButton>
          )}
          <PrimaryButton
            type="submit"
            form="create-customer-personal-form"
            disabled={isBusy}
            data-testid="create-customer-submit"
          >
            {isCreatingCustomer ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Creating...
              </>
            ) : (
              "Save"
            )}
          </PrimaryButton>
        </>
      );
    }

    if (activeTab === "personal" && isCustomerCreated) {
      return (
        <>
          <SecondaryButton
            type="button"
            disabled={isBusy}
            onClick={() => createdCustomer && finalizeCreatedCustomer(createdCustomer)}
          >
            Finish
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={isBusy}
            onClick={() => handleTabChange("insurance")}
          >
            Add insurance
          </PrimaryButton>
        </>
      );
    }

    if (activeTab === "insurance") {
      const hasInsuranceSchemes = !isLoadingSchemes && schemes.length > 0;

      return (
        <>
          <SecondaryButton
            type="button"
            disabled={isBusy}
            onClick={() => setActiveTab("whats-next")}
          >
            {hasInsuranceSchemes ? "Skip for now" : "Continue without insurance"}
          </SecondaryButton>
          {hasInsuranceSchemes ? (
            <PrimaryButton
              type="submit"
              form="create-customer-insurance-form"
              disabled={isBusy || isLoadingSchemes}
              data-testid="create-customer-insurance-submit"
            >
              {isSavingInsurance ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </PrimaryButton>
          ) : null}
        </>
      );
    }

    if (activeTab === "whats-next") {
      return (
        <SecondaryButton
          type="button"
          disabled={isBusy}
          onClick={() => createdCustomer && finalizeCreatedCustomer(createdCustomer)}
        >
          Close
        </SecondaryButton>
      );
    }

    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          className={cn(
            appFont.className,
            "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl",
          )}
          data-testid="create-customer-dialog"
        >
          <SheetHeader className="space-y-1 border-b border-dash-border px-5 py-4 pr-12 text-left">
            <SheetTitle className="text-[16px] font-semibold tracking-tight text-brand-navy">
              Register client
            </SheetTitle>
            <SheetDescription className="text-[13px] text-dash-muted">
              {mode === "quick"
                ? "Add the client's name and required details. You can add insurance later."
                : "Save the client, then start a visit, book an appointment, or add extras."}
            </SheetDescription>
          </SheetHeader>

          {tabs.length > 1 ? (
            <nav
              aria-label="Registration sections"
              className="flex gap-6 overflow-x-auto border-b border-dash-border px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={tab.disabled}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => {
                      if (
                        !tab.disabled &&
                        (tab.id === "employment" ||
                          tab.id === "personal" ||
                          tab.id === "onboarding" ||
                          tab.id === "insurance" ||
                          tab.id === "whats-next")
                      ) {
                        handleTabChange(tab.id);
                      }
                    }}
                    className={cn(
                      "-mb-px shrink-0 border-b-2 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40",
                      isActive
                        ? "border-brand-primary font-medium text-brand-primary"
                        : "border-transparent text-dash-muted hover:text-brand-navy",
                    )}
                    data-testid={`tabbed-dialog-tab-${tab.id}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {activeTab === "employment" ? (
              <Form {...employmentForm}>
                <form
                  id="create-customer-employment-form"
                  className="space-y-4"
                  onSubmit={employmentForm.handleSubmit(
                    handleContinueFromEmployment,
                  )}
                  data-testid="create-customer-employment-form"
                >
                  {isCustomerCreated ? (
                    <p className="rounded-lg border border-brand-primary/30 bg-brand-tint px-3 py-2.5 text-sm text-brand-slate">
                      Client created. Employment details are locked.
                    </p>
                  ) : null}
                  <CustomerEmploymentFields
                    form={employmentForm}
                    contractor={employmentContractor}
                    relatedEmployee={employmentRelatedEmployee}
                    onContractorChange={setEmploymentContractor}
                    onRelatedEmployeeChange={setEmploymentRelatedEmployee}
                    disabled={isCustomerCreated}
                  />
                </form>
              </Form>
            ) : null}

            {activeTab === "personal" ? (
              <Form {...personalForm}>
                <form
                  id="create-customer-personal-form"
                  className="space-y-4"
                  onSubmit={personalForm.handleSubmit(handleCreateCustomer)}
                  data-testid="create-customer-form"
                >
                  {isCustomerCreated ? (
                    <p
                      className="rounded-lg border border-brand-primary/30 bg-brand-tint px-3 py-2.5 text-sm text-brand-slate"
                      data-testid="create-customer-locked-notice"
                    >
                      Client created. Personal details are locked while you add
                      insurance or choose what to do next.
                    </p>
                  ) : null}
                  <CustomerFormFields
                    form={personalForm}
                    isSubmitting={isCreatingCustomer}
                    fieldsDisabled={isCustomerCreated}
                    idPrefix="create-customer"
                  />
                </form>
              </Form>
            ) : null}

            {activeTab === "onboarding" && createdCustomer && onboardingForms.length > 0 ? (
              <CustomerOnboardingForms
                customerUuid={createdCustomer.uuid}
                forms={onboardingForms}
                onFinished={continueAfterOnboarding}
              />
            ) : null}

            {activeTab === "insurance" && isCustomerCreated ? (
              <Form {...insuranceForm}>
                <form
                  id="create-customer-insurance-form"
                  className="space-y-4"
                  onSubmit={insuranceForm.handleSubmit(handleSaveInsurance)}
                  data-testid="create-customer-insurance-form"
                >
                  <CustomerInsuranceFormFields
                    form={insuranceForm}
                    schemes={schemes}
                    isLoadingSchemes={isLoadingSchemes}
                    isSubmitting={isSavingInsurance}
                    customerFullName={customerFullName}
                  />
                </form>
              </Form>
            ) : null}

            {activeTab === "whats-next" && isCustomerCreated ? (
              <div className="-mx-5 -my-4">
                <p className="px-5 pb-2 pt-4 text-sm text-dash-muted">
                  What would you like to do next?
                </p>
                <NextStepOptionsList
                  options={whatsNextOptions}
                  testId="create-customer-next-step-options"
                />
              </div>
            ) : null}
          </div>

          <SheetFooter className="mt-0 flex w-full shrink-0 flex-row gap-2 border-t border-dash-border bg-white px-5 py-3 sm:space-x-0 [&>button]:w-full [&>button]:flex-1">
            {renderFooter()}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {createdCustomer ? (
        <>
          <CustomerVisitDialog
            customer={createdCustomer}
            open={visitDialogOpen}
            onOpenChange={setVisitDialogOpen}
            onVisitChanged={handleVisitChanged}
          />
          <CreateAppointmentDialog
            customer={createdCustomer}
            open={appointmentDialogOpen}
            onOpenChange={setAppointmentDialogOpen}
            onCreated={handleAppointmentCreated}
          />
        </>
      ) : null}
    </>
  );
}
