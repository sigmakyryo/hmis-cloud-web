"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { createNativeOhVisit } from "@/features/occupational-health/services/native-visit.service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  DestructiveButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/app-buttons";
import { Form } from "@/components/ui/form";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  fetchClinicalClinics,
  fetchClinicalDepartments,
} from "@/features/clinical/services/clinical-catalog.service";
import type {
  ClinicalClinic,
  ClinicalDepartment,
} from "@/features/clinical/types/clinical-catalog.types";
import { resolveDefaultDepartmentUuid } from "@/features/clinical/utils/apply-sole-department";
import { fetchCustomerInsurance } from "@/features/customers/services/customer-insurance.service";
import {
  closeCustomerVisit,
  createCustomerVisit,
  fetchCustomerVisits,
  fetchVisit,
  findActiveCustomerVisit,
} from "@/features/customers/services/customer-visits.service";
import type { CustomerVisit } from "@/features/customers/types/customer-visit.types";
import { uploadEncounterAttachment } from "@/features/visits/services/visit-attachments.service";
import type { VisitDetail } from "@/features/visits/types/visit.types";
import type { CustomerInsurance } from "@/features/customers/types/customer-insurance.types";
import type { Customer } from "@/features/customers/types/customer.types";
import {
  canCloseCustomerVisit,
  getCloseCustomerVisitTooltip,
} from "@/features/customers/utils/can-close-customer-visit";
import { isCustomerVisitActive } from "@/features/customers/utils/customer-visit-status";
import { CloseCustomerVisitSummary } from "@/features/customers/components/detail/CloseCustomerVisitSummary";
import { CustomerVisitSheetFooter } from "@/features/customers/components/detail/CustomerVisitSheetFooter";
import { CustomerVisitSheetHeader } from "@/features/customers/components/detail/CustomerVisitSheetHeader";
import { CustomerVisitSheetSkeleton } from "@/features/customers/components/detail/CustomerVisitSheetSkeleton";
import {
  formatAdaptiveAge,
  formatCustomerName,
} from "@/features/customers/utils/format-customer";
import { OhRiskProfileRequiredNotice } from "@/features/occupational-health/components/OhRiskProfileRequiredNotice";
import { fetchOhVisitTypes } from "@/features/occupational-health/services/oh.service";
import { fetchOhVisitEligibility } from "@/features/occupational-health/services/visit-eligibility.service";
import {
  OH_RISK_PROFILE_REQUIRED_MESSAGE,
} from "@/features/occupational-health/utils/customer-has-risk-profile";
import {
  StartVisitFormFields,
  type StartVisitStep,
} from "@/features/visits/components/StartVisitFormFields";
import {
  createStartVisitDefaultValues,
  startVisitSchema,
  toCreateVisitPayload,
  type StartVisitFormValues,
} from "@/features/visits/schemas/start-visit.schema";
import { fetchDepartmentConsultationServices } from "@/features/visits/services/consultation-services.service";
import type { ConsultationServiceCatalogItem } from "@/features/visits/types/visit.types";
import { useUser } from "@/providers/user-provider";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage, mapBffErrorsToForm } from "@/lib/bff-field-errors";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

const OH_DEPARTMENT_TYPE = "occupational_health";

type CustomerVisitDialogProps = {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVisitChanged: (visit: CustomerVisit) => void;
};

export function CustomerVisitDialog({
  customer,
  open,
  onOpenChange,
  onVisitChanged,
}: CustomerVisitDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const nativeSubmissionKey = useRef<string | null>(null);
  const { userData } = useUser();
  const [loadedConsultationServices, setLoadedConsultationServices] = useState<{
    departmentUuid: string;
    items: ConsultationServiceCatalogItem[];
  } | null>(null);
  const [insuranceSchemes, setInsuranceSchemes] = useState<CustomerInsurance[]>([]);
  const [clinics, setClinics] = useState<ClinicalClinic[]>([]);
  const [departments, setDepartments] = useState<ClinicalDepartment[]>([]);
  const [activeVisit, setActiveVisit] = useState<CustomerVisit | null>(null);
  const [activeVisitDetail, setActiveVisitDetail] = useState<VisitDetail | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [consultationServiceSearch, setConsultationServiceSearch] = useState("");
  const [startStep, setStartStep] = useState<StartVisitStep>("visit");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const contextGeneration = useRef(0);
  const submittingVisit = useRef(false);

  const form = useForm<StartVisitFormValues>({
    resolver: zodResolver(startVisitSchema),
    defaultValues: createStartVisitDefaultValues(),
  });

  const selectedClinicUuid = form.watch("clinic");
  const selectedDepartmentUuid = form.watch("department");
  const modeOfPayment = form.watch("mode_of_payment");
  const requiresPreAuth = form.watch("requires_pre_authorization");
  const customerName = useMemo(() => formatCustomerName(customer), [customer]);
  const ageLabel = useMemo(() => formatAdaptiveAge(customer.dob), [customer.dob]);
  const defaultClinic = userData?.primary_clinic ?? null;

  const clinicIdByUuid = useMemo(
    () => new Map(clinics.map((clinic) => [clinic.uuid, clinic.id])),
    [clinics],
  );

  const defaultClinicUuid = useMemo(() => {
    if (!defaultClinic) {
      return "";
    }

    return (
      clinics.find((clinic) => clinic.id === defaultClinic.id)?.uuid ?? ""
    );
  }, [clinics, defaultClinic]);

  const selectedClinicId = useMemo(() => {
    if (!selectedClinicUuid) {
      return defaultClinic?.id ?? null;
    }
    return clinicIdByUuid.get(selectedClinicUuid) ?? defaultClinic?.id ?? null;
  }, [clinicIdByUuid, defaultClinic?.id, selectedClinicUuid]);

  const consultationServices =
    loadedConsultationServices?.departmentUuid === selectedDepartmentUuid
      ? loadedConsultationServices.items
      : [];
  const isLoadingConsultationServices = Boolean(
    selectedDepartmentUuid &&
      loadedConsultationServices?.departmentUuid !== selectedDepartmentUuid,
  );

  const hasDefaultClinic = Boolean(defaultClinic && defaultClinicUuid);

  const selectedDepartment = useMemo(
    () =>
      departments.find((department) => department.uuid === selectedDepartmentUuid) ??
      null,
    [departments, selectedDepartmentUuid],
  );
  const isOhDepartment = selectedDepartment?.department_type === OH_DEPARTMENT_TYPE;
  const visitTypes = useQuery({
    queryKey: ["oh-visit-types"],
    queryFn: fetchOhVisitTypes,
    enabled: open && isOhDepartment,
  });
  const eligibility = useQuery({
    queryKey: ["oh-visit-eligibility", customer.uuid, selectedDepartmentUuid],
    queryFn: () => fetchOhVisitEligibility(customer.uuid),
    enabled: open && isOhDepartment && !activeVisit,
    staleTime: 0,
    retry: false,
  });
  const showRiskProfileNotice = Boolean(
    isOhDepartment && !eligibility.isError && !eligibility.isFetching &&
      eligibility.data?.eligible === false,
  );
  const eligibilityUnavailable = isOhDepartment &&
    (eligibility.isPending || eligibility.isFetching || eligibility.isError);

  useEffect(() => {
    if (!isOhDepartment) return;
    form.setValue("mode_of_payment", "cash");
    form.setValue("insurance_scheme", "");
    form.setValue("consultation_service", "");
    setAttachmentFile(null);
  }, [isOhDepartment, form]);

  const canClose = useMemo(
    () => canCloseCustomerVisit(userData, activeVisit, clinicIdByUuid),
    [activeVisit, clinicIdByUuid, userData],
  );

  const closeTooltip = useMemo(
    () => getCloseCustomerVisitTooltip(userData, activeVisit, clinicIdByUuid),
    [activeVisit, clinicIdByUuid, userData],
  );

  const loadDialogContext = useCallback(async () => {
    const generation = ++contextGeneration.current;
    nativeSubmissionKey.current = null;
    setIsLoadingContext(true);
    setCloseError(null);

    try {
      const [visits, insurance, clinicList] = await Promise.all([
        fetchCustomerVisits(customer.uuid, { limit: 100 }),
        fetchCustomerInsurance(customer.uuid).catch(() => [] as CustomerInsurance[]),
        fetchClinicalClinics(),
      ]);

      if (generation !== contextGeneration.current) return;
      setConsultationServiceSearch("");
      setStartStep("visit");
      setAttachmentFile(null);
      setLoadedConsultationServices(null);
      setInsuranceSchemes(insurance);
      const active = findActiveCustomerVisit(visits);
      setActiveVisit(active);
      if (active) {
        const detail = await fetchVisit(active.uuid);
        if (generation !== contextGeneration.current) return;
        setActiveVisitDetail(detail);
      } else {
        setActiveVisitDetail(null);
      }
      setClinics(clinicList);

      const primaryClinic = userData?.primary_clinic ?? null;
      const matchedClinic = primaryClinic
        ? clinicList.find((clinic) => clinic.id === primaryClinic.id)
        : undefined;
      const primaryClinicUuid = matchedClinic?.uuid ?? "";

      let nextDepartments: ClinicalDepartment[] = [];
      if (primaryClinic) {
        nextDepartments = await fetchClinicalDepartments(primaryClinic.id);
        if (generation !== contextGeneration.current) return;
        setDepartments(nextDepartments);
      } else {
        setDepartments([]);
      }

      form.reset(
        createStartVisitDefaultValues({
          clinic: primaryClinicUuid,
          department: resolveDefaultDepartmentUuid(nextDepartments),
        }),
      );
    } catch (error) {
      if (generation !== contextGeneration.current) return;
      toast({
        variant: "error",
        title: "Could not load visit details",
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      if (generation === contextGeneration.current) setIsLoadingContext(false);
    }
  }, [customer.uuid, form, toast, userData?.primary_clinic]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadDialogContext();
    return () => { contextGeneration.current += 1; };
  }, [loadDialogContext, open]);

  useEffect(() => {
    if (!open || !selectedDepartmentUuid || isOhDepartment) {
      return;
    }

    let cancelled = false;

    async function loadDepartmentServices() {
      try {
        const services =
          await fetchDepartmentConsultationServices(selectedDepartmentUuid);
        if (cancelled) {
          return;
        }

        setLoadedConsultationServices({
          departmentUuid: selectedDepartmentUuid,
          items: services,
        });
        setConsultationServiceSearch("");
        const currentService = form.getValues("consultation_service");
        if (
          currentService &&
          !services.some((service) => service.uuid === currentService)
        ) {
          form.setValue("consultation_service", "");
        }
      } catch {
        if (cancelled) {
          return;
        }

        setLoadedConsultationServices({
          departmentUuid: selectedDepartmentUuid,
          items: [],
        });
        form.setValue("consultation_service", "");
      }
    }

    void loadDepartmentServices();

    return () => {
      cancelled = true;
    };
  }, [form, open, selectedDepartmentUuid, isOhDepartment]);

  useEffect(() => {
    if (modeOfPayment !== "insurance") {
      form.setValue("requires_pre_authorization", false);
      form.setValue("pre_authorization_number", "");
      form.setValue("pre_authorization_comments", "");
      form.setValue("insurance_scheme", "");
    }
  }, [form, modeOfPayment]);

  useEffect(() => {
    if (!requiresPreAuth) {
      form.setValue("pre_authorization_number", "");
      form.setValue("pre_authorization_comments", "");
    }
  }, [form, requiresPreAuth]);

  const handleStartVisit = form.handleSubmit(async (values) => {
    const department =
      departments.find((row) => row.uuid === values.department) ?? null;
    if (submittingVisit.current) return;
    submittingVisit.current = true;
    setIsSubmitting(true);
    const generation = contextGeneration.current;

    try {
      if (department?.department_type === OH_DEPARTMENT_TYPE) {
        const check = await eligibility.refetch({ throwOnError: true });
        if (generation !== contextGeneration.current || form.getValues("department") !== values.department) return;
        if (!check.data?.eligible) {
          setStartStep("visit");
          return;
        }
      }
      if (department?.department_type === OH_DEPARTMENT_TYPE) {
        if (!values.visit_type) {
          form.setError("visit_type", { type: "manual", message: "Select a visit type" });
          return;
        }
        nativeSubmissionKey.current ??= crypto.randomUUID();
        const native = await createNativeOhVisit({
          customer_uuid: customer.uuid, department_uuid: values.department, clinic_uuid: values.clinic,
          visit_date: new Date(values.visit_date).toISOString(), visit_type_uuid: values.visit_type,
          idempotency_key: nativeSubmissionKey.current,
        });
        if (generation !== contextGeneration.current) return;
        void queryClient.invalidateQueries({ queryKey: ["oh-encounters"] });
        onOpenChange(false);
        router.push(ROUTES.occupationalHealthEncounter(native.visit, native.uuid));
        toast({ variant: "success", title: "OH visit started" });
        return;
      }
      const visit = await createCustomerVisit(
        toCreateVisitPayload(customer.uuid, values),
      );

      if (generation !== contextGeneration.current) return;
      const encounterUuid =
        visit.created_encounter?.uuid ?? visit.encounters?.[0]?.uuid ?? null;
      if (attachmentFile && encounterUuid) {
        try {
          await uploadEncounterAttachment(encounterUuid, attachmentFile);
        } catch (uploadError) {
          toast({
            variant: "error",
            title: "Visit started, attachment failed",
            description:
              uploadError instanceof Error
                ? uploadError.message
                : "You can try uploading the attachment again later.",
          });
          onVisitChanged(visit);
          onOpenChange(false);
          return;
        }
      }

      onVisitChanged(visit);
      onOpenChange(false);
      toast({
        variant: "success",
        title: "Visit started",
        description: `Successfully started visit for ${customerName}.`,
      });
    } catch (error) {
      if (generation !== contextGeneration.current) return;
      const fieldErrors = error instanceof BffError ? mapBffErrorsToForm(error.errors) : {};
      const legacyReferralError = department?.department_type === OH_DEPARTMENT_TYPE &&
        fieldErrors.department === OH_RISK_PROFILE_REQUIRED_MESSAGE;
      for (const [field, message] of Object.entries(fieldErrors)) {
        if (field === "department" && legacyReferralError) continue;
        if (field in form.getValues()) {
          form.setError(field as keyof StartVisitFormValues, { message });
        }
      }
      toast({
        variant: "error",
        title: "Could not start visit",
        description: legacyReferralError
          ? "The core visit service could not complete the OH referral and did not return the underlying reason. Your form has been kept. No automatic retry was made."
          : error instanceof BffError
            ? formatBffErrorMessage(error.message, error.errors)
            : error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      submittingVisit.current = false;
      setIsSubmitting(false);
    }
  });

  const handleCloseVisit = async () => {
    if (!activeVisit) {
      return;
    }

    setIsSubmitting(true);
    setCloseError(null);

    try {
      const visit = await closeCustomerVisit(activeVisit.uuid);
      onVisitChanged(visit);
      setActiveVisit(null);
      setActiveVisitDetail(null);
      onOpenChange(false);
      toast({
        variant: "success",
        title: "Visit closed",
        description: `Successfully closed visit for ${customerName}.`,
      });
    } catch (error) {
      const message =
        error instanceof BffError
          ? formatBffErrorMessage(error.message, error.errors)
          : error instanceof Error
            ? error.message
            : "Failed to close visit.";

      setCloseError(message);
      toast({
        variant: "error",
        title: "Could not close visit",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showingCloseVisit =
    Boolean(activeVisit) ||
    (isLoadingContext && isCustomerVisitActive(customer.visit_status));
  const headerClinicName = showingCloseVisit
    ? activeVisit?.clinic_name ?? defaultClinic?.name ?? null
    : defaultClinic?.name ?? null;
  const footerRecap = activeVisit ? "This will end the current visit." : null;

  async function handleContinueToPayment() {
    const valid = await form.trigger(["clinic", "department", "visit_date"]);
    if (!valid) {
      return;
    }
    if (showRiskProfileNotice || eligibilityUnavailable) {
      return;
    }
    setStartStep("payment");
  }

  async function handleContinueToAttachments() {
    const paymentFields =
      modeOfPayment === "insurance"
        ? (["mode_of_payment", "insurance_scheme"] as const)
        : (["mode_of_payment"] as const);
    const valid = await form.trigger([...paymentFields]);
    if (valid) {
      setStartStep("attachments");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          appFont.className,
          "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl",
        )}
        data-testid="customer-visit-dialog"
      >
        <CustomerVisitSheetHeader
          action={showingCloseVisit ? "close" : "start"}
          customerName={customerName}
          identifier={customer.customer_identifier}
          gender={customer.gender}
          ageLabel={ageLabel}
          clinicName={headerClinicName}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isLoadingContext ? (
            <CustomerVisitSheetSkeleton />
          ) : activeVisit ? (
            <CloseCustomerVisitSummary
              visit={activeVisit}
              visitDetail={activeVisitDetail}
              closeTooltip={closeTooltip}
              canClose={canClose}
              closeError={closeError}
            />
          ) : !hasDefaultClinic ? (
            <div className="flex flex-col items-center px-2 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-tint text-brand-primary">
                <Building2 className="size-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-brand-navy">
                No default clinic assigned
              </h3>
              <p className="mt-2 max-w-sm text-sm text-dash-muted">
                You don&apos;t have a default clinic set. Ask an administrator to
                assign your primary clinic in Settings → User Management.
              </p>
            </div>
          ) : (
            <Form {...form}>
              <form className="space-y-4">
                {isOhDepartment && (eligibility.isFetching || eligibility.isError) ? (
                  <div aria-live="polite" className="text-sm text-dash-muted">
                    {eligibility.isFetching ? (
                      <p role="status" className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Checking OH eligibility…
                      </p>
                    ) : eligibility.isError ? (
                      <>
                        <p role="alert">OH eligibility could not be checked: {eligibility.error.message}</p>
                        <SecondaryButton type="button" size="sm" disabled={isSubmitting}
                          onClick={() => void eligibility.refetch()}>
                          Retry OH check
                        </SecondaryButton>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <StartVisitFormFields
                  form={form}
                  nativeOh={isOhDepartment}
                  step={isOhDepartment ? "visit" : startStep}
                  onStepChange={(step) => {
                    if (step !== "visit" && (showRiskProfileNotice || eligibilityUnavailable)) {
                      return;
                    }
                    setStartStep(step);
                  }}
                  lockLaterSteps={showRiskProfileNotice || eligibilityUnavailable}
                  riskProfileNotice={
                    showRiskProfileNotice ? (
                      <OhRiskProfileRequiredNotice
                        customerUuid={customer.uuid}
                        onNavigate={() => onOpenChange(false)}
                      />
                    ) : null
                  }
                  defaultClinicName={defaultClinic?.name ?? "Your clinic"}
                  departments={departments}
                  visitTypes={visitTypes.data ?? []}
                  consultationServices={consultationServices}
                  isLoadingConsultationServices={isLoadingConsultationServices}
                  insuranceSchemes={insuranceSchemes}
                  customerUuid={customer.uuid}
                  onInsuranceHrefClick={() => onOpenChange(false)}
                  consultationServiceSearch={consultationServiceSearch}
                  onConsultationServiceSearchChange={setConsultationServiceSearch}
                  selectedClinicId={selectedClinicId}
                  attachmentFile={attachmentFile}
                  onAttachmentFileChange={setAttachmentFile}
                />
              </form>
            </Form>
          )}
        </div>

        {!isLoadingContext ? (
          <CustomerVisitSheetFooter recap={footerRecap}>
            {activeVisit ? (
              <>
                <SecondaryButton
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </SecondaryButton>
                {!canClose && closeTooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <DestructiveButton type="button" disabled>
                          Close visit
                        </DestructiveButton>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{closeTooltip}</TooltipContent>
                  </Tooltip>
                ) : (
                  <DestructiveButton
                    type="button"
                    onClick={() => void handleCloseVisit()}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Closing...
                      </>
                    ) : (
                      "Close visit"
                    )}
                  </DestructiveButton>
                )}
              </>
            ) : hasDefaultClinic && isOhDepartment ? (
              <>
                <SecondaryButton type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</SecondaryButton>
                <PrimaryButton type="button" disabled={isSubmitting || eligibilityUnavailable || showRiskProfileNotice}
                  onClick={() => void handleStartVisit()}>
                  {isSubmitting ? "Starting…" : "Start OH visit"}
                </PrimaryButton>
              </>
            ) : hasDefaultClinic && startStep === "attachments" ? (
              <>
                <SecondaryButton
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStartStep("payment")}
                >
                  Back
                </SecondaryButton>
                <PrimaryButton
                  type="button"
                  disabled={
                    isSubmitting || eligibilityUnavailable || showRiskProfileNotice ||
                    (modeOfPayment === "insurance" && insuranceSchemes.length === 0)
                  }
                  onClick={() => void handleStartVisit()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Starting...
                    </>
                  ) : (
                    "Start visit"
                  )}
                </PrimaryButton>
              </>
            ) : hasDefaultClinic && startStep === "payment" ? (
              <>
                <SecondaryButton
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStartStep("visit")}
                >
                  Back
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleContinueToAttachments()}
                >
                  Add attachment
                </SecondaryButton>
                <PrimaryButton
                  type="button"
                  disabled={
                    isSubmitting || eligibilityUnavailable || showRiskProfileNotice ||
                    (modeOfPayment === "insurance" && insuranceSchemes.length === 0)
                  }
                  onClick={() => void handleStartVisit()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Starting...
                    </>
                  ) : (
                    "Start visit"
                  )}
                </PrimaryButton>
              </>
            ) : (
              <>
                <SecondaryButton
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </SecondaryButton>
                {hasDefaultClinic ? (
                  <PrimaryButton
                    type="button"
                    disabled={showRiskProfileNotice || eligibilityUnavailable}
                    onClick={() => void handleContinueToPayment()}
                  >
                    Continue
                  </PrimaryButton>
                ) : null}
              </>
            )}
          </CustomerVisitSheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
