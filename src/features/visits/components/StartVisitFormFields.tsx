"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";

import { ROUTES } from "@/constants/routes";
import { OH_RISK_PROFILE_REQUIRED_MESSAGE } from "@/features/occupational-health/utils/customer-has-risk-profile";

import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RequiredFieldMarker } from "@/components/ui/required-field-marker";
import { SearchableSelect, SelectItem } from "@/components/ui/searchable-select";
import type { ClinicalDepartment } from "@/features/clinical/types/clinical-catalog.types";
import type { CustomerInsurance } from "@/features/customers/types/customer-insurance.types";
import { StartVisitPaymentChoice } from "@/features/visits/components/StartVisitPaymentChoice";
import { VisitAttachmentDropzone } from "@/features/visits/components/VisitAttachmentDropzone";
import type { StartVisitFormValues } from "@/features/visits/schemas/start-visit.schema";
import type { ConsultationServiceCatalogItem } from "@/features/visits/types/visit.types";
import {
  formatDateTimeLocal,
  formatDateTimePickerLabel,
  parseDateTimeLocal,
} from "@/lib/date-time-local";
import { cn } from "@/lib/utils";

export type StartVisitStep = "visit" | "payment" | "attachments";

type StartVisitFormFieldsProps = {
  form: UseFormReturn<StartVisitFormValues>;
  nativeOh?: boolean;
  step: StartVisitStep;
  onStepChange: (step: StartVisitStep) => void;
  defaultClinicName: string;
  departments: ClinicalDepartment[];
  visitTypes?: Array<{ uuid: string; name: string }>;
  consultationServices: ConsultationServiceCatalogItem[];
  isLoadingConsultationServices?: boolean;
  insuranceSchemes: CustomerInsurance[];
  customerUuid: string;
  onInsuranceHrefClick?: () => void;
  consultationServiceSearch: string;
  onConsultationServiceSearchChange: (value: string) => void;
  selectedClinicId: number | null;
  attachmentFile: File | null;
  onAttachmentFileChange: (file: File | null) => void;
  lockLaterSteps?: boolean;
  /** When set, only the department field stays so the clinic can switch away from occupational health. */
  riskProfileNotice?: ReactNode;
};

export function StartVisitFormFields({
  form,
  nativeOh = false,
  step,
  onStepChange,
  defaultClinicName,
  departments,
  visitTypes = [],
  consultationServices,
  isLoadingConsultationServices = false,
  insuranceSchemes,
  customerUuid,
  onInsuranceHrefClick,
  consultationServiceSearch,
  onConsultationServiceSearchChange,
  selectedClinicId,
  attachmentFile,
  onAttachmentFileChange,
  lockLaterSteps = false,
  riskProfileNotice,
}: StartVisitFormFieldsProps) {
  const [departmentSelectOpen, setDepartmentSelectOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [typeSelectOpen, setTypeSelectOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");
  const [serviceSelectOpen, setServiceSelectOpen] = useState(false);

  useEffect(() => {
    if (insuranceSchemes.length !== 1) {
      return;
    }

    const onlyScheme = insuranceSchemes[0];
    if (!onlyScheme || form.getValues("insurance_scheme")) {
      return;
    }

    form.setValue("insurance_scheme", onlyScheme.uuid, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [form, insuranceSchemes]);

  const selectedDepartmentUuid = form.watch("department");
  const selectedVisitTypeUuid = form.watch("visit_type");
  const selectedServiceUuid = form.watch("consultation_service");
  const visitDate = form.watch("visit_date");
  const canSelectConsultationService = Boolean(selectedDepartmentUuid);

  const selectedDepartment = useMemo(
    () =>
      departments.find((department) => department.uuid === selectedDepartmentUuid) ??
      null,
    [departments, selectedDepartmentUuid],
  );

  const selectedService = useMemo(
    () =>
      consultationServices.find((service) => service.uuid === selectedServiceUuid) ??
      null,
    [consultationServices, selectedServiceUuid],
  );

  const selectedVisitType = useMemo(
    () => visitTypes.find((type) => type.uuid === selectedVisitTypeUuid) ?? null,
    [selectedVisitTypeUuid, visitTypes],
  );
  const filteredVisitTypes = useMemo(() => {
    const query = typeSearch.trim().toLowerCase();
    if (!query) return visitTypes;
    return visitTypes.filter((type) => type.name.toLowerCase().includes(query));
  }, [typeSearch, visitTypes]);

  const filteredDepartments = useMemo(() => {
    const query = departmentSearch.trim().toLowerCase();
    if (!query) {
      return departments;
    }

    return departments.filter((department) => {
      const haystack = `${department.name} ${department.code}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [departmentSearch, departments]);

  const filteredServices = useMemo(() => {
    const query = consultationServiceSearch.trim().toLowerCase();
    if (!query) {
      return consultationServices;
    }

    return consultationServices.filter((service) => {
      const haystack = `${service.name} ${service.code}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [consultationServiceSearch, consultationServices]);

  const parsedVisitDate = parseDateTimeLocal(visitDate);
  const visitRecap = [
    selectedDepartment?.name,
    parsedVisitDate ? formatDateTimePickerLabel(parsedVisitDate) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  async function goToPayment() {
    const valid = await form.trigger(["clinic", "department", "visit_date"]);
    if (valid) {
      onStepChange("payment");
    }
  }

  async function goToAttachments() {
    const paymentFields =
      form.getValues("mode_of_payment") === "insurance"
        ? (["mode_of_payment", "insurance_scheme"] as const)
        : (["mode_of_payment"] as const);
    const valid = await form.trigger([...paymentFields]);
    if (valid) {
      onStepChange("attachments");
    }
  }

  return (
    <div className="space-y-6">
      {riskProfileNotice || nativeOh ? null : (
      <nav
        aria-label="Start visit steps"
        className="flex items-center gap-5 border-b border-dash-border/70"
      >
        <button
          type="button"
          onClick={() => onStepChange("visit")}
          className={cn(
            "relative -mb-px pb-2.5 text-sm",
            step === "visit"
              ? "font-medium text-brand-navy"
              : "text-dash-muted hover:text-brand-navy",
          )}
        >
          Visit
          {step === "visit" ? (
            <span className="absolute inset-x-0 bottom-0 h-px bg-brand-navy" />
          ) : null}
        </button>
        <button
          type="button"
          disabled={lockLaterSteps}
          onClick={() => void goToPayment()}
          className={cn(
            "relative -mb-px pb-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40",
            step === "payment"
              ? "font-medium text-brand-navy"
              : "text-dash-muted hover:text-brand-navy",
          )}
        >
          Payment
          {step === "payment" ? (
            <span className="absolute inset-x-0 bottom-0 h-px bg-brand-navy" />
          ) : null}
        </button>
        <button
          type="button"
          disabled={lockLaterSteps}
          onClick={() => void goToAttachments()}
          className={cn(
            "relative -mb-px pb-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40",
            step === "attachments"
              ? "font-medium text-brand-navy"
              : "text-dash-muted hover:text-brand-navy",
          )}
        >
          Attachments
          {step === "attachments" ? (
            <span className="absolute inset-x-0 bottom-0 h-px bg-brand-navy" />
          ) : null}
        </button>
      </nav>
      )}

      {step === "visit" ? (
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Department <RequiredFieldMarker />
                  </FormLabel>
                  <Link
                    href={`${ROUTES.settingsOrganization}?tab=departments&add=department`}
                    className="text-xs text-brand-primary hover:underline"
                  >
                    Create department
                  </Link>
                </div>
                <FormControl>
                  <SearchableSelect
                    value={field.value || undefined}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("consultation_service", "");
                      form.setValue("visit_type", "");
                    }}
                    open={departmentSelectOpen}
                    onOpenChange={(open) => {
                      setDepartmentSelectOpen(open);
                      if (!open) {
                        setDepartmentSearch("");
                      }
                    }}
                    disabled={!selectedClinicId || departments.length === 0}
                    searchValue={departmentSearch}
                    onSearchChange={setDepartmentSearch}
                    searchPlaceholder="Search departments"
                    placeholder="Select a department"
                    displayValue={selectedDepartment?.name}
                    minSearchLength={0}
                    noResultsMessage="No departments found"
                    contentClassName="z-[60]"
                    data-testid="start-visit-department"
                  >
                    {filteredDepartments.map((department) => (
                      <SelectItem key={department.uuid} value={department.uuid}>
                        {department.name}
                        {department.code ? ` · ${department.code}` : ""}
                      </SelectItem>
                    ))}
                  </SearchableSelect>
                </FormControl>
                {riskProfileNotice ? null : (
                  <p className="text-xs text-dash-muted">{defaultClinicName}</p>
                )}
                {form.formState.errors.department?.message ===
                OH_RISK_PROFILE_REQUIRED_MESSAGE ? null : (
                  <FormMessage />
                )}
                {riskProfileNotice}
              </FormItem>
            )}
          />

          {nativeOh ? (
            <FormField
              control={form.control}
              name="visit_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Type <RequiredFieldMarker />
                  </FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      open={typeSelectOpen}
                      onOpenChange={(open) => {
                        setTypeSelectOpen(open);
                        if (!open) setTypeSearch("");
                      }}
                      disabled={visitTypes.length === 0}
                      searchValue={typeSearch}
                      onSearchChange={setTypeSearch}
                      searchPlaceholder="Search visit types"
                      placeholder="Select a type"
                      displayValue={selectedVisitType?.name}
                      minSearchLength={0}
                      noResultsMessage="No visit types found"
                      contentClassName="z-[60]"
                      data-testid="start-visit-type"
                    >
                      {filteredVisitTypes.map((type) => (
                        <SelectItem key={type.uuid} value={type.uuid}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SearchableSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {riskProfileNotice ? null : (
          <>
          <FormField
            control={form.control}
            name="visit_date"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Arrived <RequiredFieldMarker />
                  </FormLabel>
                  <button
                    type="button"
                    onClick={() =>
                      form.setValue("visit_date", formatDateTimeLocal(new Date()), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    className="text-xs text-brand-primary hover:underline"
                  >
                    Now
                  </button>
                </div>
                <FormControl>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    layout="split"
                    data-testid="start-visit-datetime"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {nativeOh ? null : (
          <FormField
            control={form.control}
            name="consultation_service"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Service</FormLabel>
                  <Link
                    href={`${ROUTES.settingsVisitManagement}?add=service`}
                    className="text-xs text-brand-primary hover:underline"
                  >
                    Create service
                  </Link>
                </div>
                <FormControl>
                  <SearchableSelect
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    open={serviceSelectOpen}
                    onOpenChange={(open) => {
                      setServiceSelectOpen(open);
                      if (!open) {
                        onConsultationServiceSearchChange("");
                      }
                    }}
                    disabled={!canSelectConsultationService}
                    isLoading={isLoadingConsultationServices}
                    searchValue={consultationServiceSearch}
                    onSearchChange={onConsultationServiceSearchChange}
                    searchPlaceholder="Search services"
                    placeholder={
                      canSelectConsultationService
                        ? isLoadingConsultationServices
                          ? "Loading…"
                          : "Optional"
                        : "Select a department first"
                    }
                    displayValue={selectedService?.name}
                    minSearchLength={0}
                    noResultsMessage="No services for this department"
                    contentClassName="z-[60]"
                    data-testid="start-visit-consultation-service"
                  >
                    {filteredServices.map((service) => (
                      <SelectItem key={service.uuid} value={service.uuid}>
                        {service.name}
                        {service.code ? ` · ${service.code}` : ""}
                      </SelectItem>
                    ))}
                  </SearchableSelect>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          )}
          </>
          )}
        </div>
      ) : step === "payment" ? (
        <div className="space-y-6">
          {visitRecap ? (
            <button
              type="button"
              onClick={() => onStepChange("visit")}
              className="flex w-full items-baseline justify-between gap-3 text-left"
            >
              <span className="text-sm text-dash-muted">{visitRecap}</span>
              <span className="text-xs text-brand-primary">Edit</span>
            </button>
          ) : null}
          <StartVisitPaymentChoice
            form={form}
            insuranceSchemes={insuranceSchemes}
            customerUuid={customerUuid}
            onInsuranceHrefClick={onInsuranceHrefClick}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <VisitAttachmentDropzone
            file={attachmentFile}
            onFileChange={onAttachmentFileChange}
          />
        </div>
      )}
    </div>
  );
}
