"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { IpdBedSelect } from "@/features/clinical-ipd/components/IpdBedSelect";
import { IpdChoiceGroup } from "@/features/clinical-ipd/components/IpdChoiceGroup";
import { IpdClinicSelect } from "@/features/clinical-ipd/components/IpdClinicSelect";
import { IpdDepartmentSelect } from "@/features/clinical-ipd/components/IpdDepartmentSelect";
import { IpdWardSelect } from "@/features/clinical-ipd/components/IpdWardSelect";
import { admitIpdStay, fetchIpdBeds, fetchIpdWards } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdStay } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { fetchClinicalClinics } from "@/features/clinical/services/clinical-catalog.service";
import type { ClinicalDepartment } from "@/features/clinical/types/clinical-catalog.types";
import { CustomerAppointmentPicker } from "@/features/customers/components/CustomerAppointmentPicker";
import type { Customer } from "@/features/customers/types/customer.types";
import { OrganizationUserPicker } from "@/features/settings/components/OrganizationUserPicker";
import type { OrganizationUser } from "@/features/settings/types/settings.types";
import { appFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useUser } from "@/providers/user-provider";

/** Prefill when the sheet is opened from a ward, a bed, or another page. */
export type IpdAdmitDefaults = {
  clinicUuid?: string;
  wardUuid?: string;
  bedUuid?: string;
};

type PaymentMode = "cash" | "insurance" | "free";

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "insurance", label: "Insurance" },
  { value: "free", label: "Free" },
];

type IpdAdmitSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: IpdAdmitDefaults;
  onAdmitted?: (stay: IpdStay) => void;
};

/** Direct IPD admission. Mount it wherever a patient should be placed on a bed. */
export function IpdAdmitSheet({ open, onOpenChange, defaults, onAdmitted }: IpdAdmitSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(appFont.className, "flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl")}
        data-testid="ipd-admit-sheet"
      >
        {open ? (
          <IpdAdmitForm
            defaults={defaults ?? {}}
            onClose={() => onOpenChange(false)}
            onAdmitted={onAdmitted}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function IpdAdmitForm({
  defaults,
  onClose,
  onAdmitted,
}: {
  defaults: IpdAdmitDefaults;
  onClose: () => void;
  onAdmitted?: (stay: IpdStay) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userData } = useUser();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [clinicPick, setClinicPick] = useState<string | null | undefined>(defaults.clinicUuid);
  const [department, setDepartment] = useState<ClinicalDepartment | null>(null);
  const [wardPick, setWardPick] = useState<string | null | undefined>(defaults.wardUuid);
  const [bedPick, setBedPick] = useState<string | null | undefined>(defaults.bedUuid);
  const [clinician, setClinician] = useState<OrganizationUser | null>(null);
  const [complaint, setComplaint] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState<PaymentMode>("cash");

  const clinicsQuery = useQuery({
    queryKey: ["clinical-clinics"],
    queryFn: fetchClinicalClinics,
  });

  const clinic = useMemo(() => {
    const list = clinicsQuery.data ?? [];
    if (clinicPick === null) return null;
    const uuid = clinicPick ?? defaults.clinicUuid;
    if (uuid) return list.find((item) => item.uuid === uuid) ?? null;
    const primaryId = userData?.primary_clinic?.id;
    if (primaryId == null) return null;
    return list.find((item) => item.id === primaryId) ?? null;
  }, [clinicPick, clinicsQuery.data, defaults.clinicUuid, userData?.primary_clinic?.id]);

  const wardsQuery = useQuery({
    queryKey: ["ipd-wards", clinic?.uuid],
    queryFn: () => fetchIpdWards({ clinic: clinic?.uuid }),
    enabled: Boolean(clinic?.uuid),
  });

  const ward = useMemo(() => {
    const list = wardsQuery.data ?? [];
    if (wardPick === null) return null;
    const uuid = wardPick ?? defaults.wardUuid;
    if (!uuid) return null;
    return list.find((item) => item.uuid === uuid) ?? null;
  }, [defaults.wardUuid, wardPick, wardsQuery.data]);

  const bedsQuery = useQuery({
    queryKey: ["ipd-beds", ward?.uuid, "available"],
    queryFn: () => fetchIpdBeds({ ward: ward?.uuid, status: "available" }),
    enabled: Boolean(ward?.uuid),
  });

  const bed = useMemo(() => {
    const list = bedsQuery.data ?? [];
    if (bedPick === null) return null;
    const uuid = bedPick ?? defaults.bedUuid;
    if (!uuid) return null;
    return list.find((item) => item.uuid === uuid) ?? null;
  }, [bedPick, bedsQuery.data, defaults.bedUuid]);

  const canSubmit = Boolean(customer && clinic && bed && clinician);

  const admitMutation = useMutation({
    mutationFn: () =>
      admitIpdStay({
        customer: customer?.uuid,
        clinic: clinic?.uuid,
        bed: bed?.uuid,
        clinician: clinician?.id,
        department: department?.uuid,
        presenting_complaint: complaint,
        mode_of_payment: modeOfPayment,
      }),
    onSuccess: (stay) => {
      void queryClient.invalidateQueries({ queryKey: ["ipd-census"] });
      void queryClient.invalidateQueries({ queryKey: ["ipd-stays"] });
      void queryClient.invalidateQueries({ queryKey: ["ipd-beds"] });
      onAdmitted?.(stay);
      onClose();
      router.push(ROUTES.clinicalIpdEncounter(stay.visit_uuid, stay.encounter_uuid));
    },
  });

  return (
    <>
      <SheetHeader className="border-b border-dash-border px-6 py-5 pr-12 text-left">
        <SheetTitle className="text-[20px] font-semibold tracking-tight text-brand-navy">Admit patient</SheetTitle>
        <SheetDescription className="text-[13.5px] text-dash-muted">
          Place a patient on an open bed. This starts the inpatient visit.
        </SheetDescription>
      </SheetHeader>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit || admitMutation.isPending) return;
          admitMutation.mutate();
        }}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <CustomerAppointmentPicker customer={customer} onCustomerChange={setCustomer} />
          <IpdClinicSelect
            clinics={clinicsQuery.data ?? []}
            value={clinic}
            isLoading={clinicsQuery.isLoading}
            onChange={(next) => {
              setClinicPick(next?.uuid ?? null);
              setDepartment(null);
              setWardPick(null);
              setBedPick(null);
            }}
          />
          <IpdDepartmentSelect clinicId={clinic?.id} value={department} onChange={setDepartment} />
          <IpdWardSelect
            clinicUuid={clinic?.uuid}
            value={ward}
            onChange={(next) => {
              setWardPick(next?.uuid ?? null);
              setBedPick(null);
            }}
          />
          <IpdBedSelect
            wardUuid={ward?.uuid}
            value={bed}
            onChange={(next) => setBedPick(next?.uuid ?? null)}
            availableOnly
          />
          <OrganizationUserPicker user={clinician} onUserChange={setClinician} label="Admitting clinician" />
          <IpdChoiceGroup label="Mode of payment" value={modeOfPayment} options={PAYMENT_MODES} onChange={setModeOfPayment} />
          <div className="space-y-1.5">
            <Label htmlFor="ipd-complaint">Presenting complaint</Label>
            <Textarea
              id="ipd-complaint"
              placeholder="Why they are being admitted"
              value={complaint}
              onChange={(event) => setComplaint(event.target.value)}
            />
          </div>
          {admitMutation.error ? (
            <p className="text-sm text-destructive">
              {admitMutation.error instanceof Error ? admitMutation.error.message : "Admission failed."}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-dash-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!canSubmit || admitMutation.isPending}>
            Admit to ward
          </Button>
        </div>
      </form>
    </>
  );
}
