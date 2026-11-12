"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import {
  ListPageHeaderSection,
  ListPageHeaderTitleBlock,
  ListPageHeaderTopRow,
  ListPageLayout,
} from "@/features/app-shell/components/page-layout";
import { IpdBedSelect } from "@/features/clinical-ipd/components/IpdBedSelect";
import { IpdClinicSelect } from "@/features/clinical-ipd/components/IpdClinicSelect";
import { IpdDepartmentSelect } from "@/features/clinical-ipd/components/IpdDepartmentSelect";
import { IpdWardSelect } from "@/features/clinical-ipd/components/IpdWardSelect";
import {
  admitIpdStay,
  fetchIpdBeds,
  fetchIpdWards,
} from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdBed, IpdWard } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { fetchClinicalClinics } from "@/features/clinical/services/clinical-catalog.service";
import type {
  ClinicalClinic,
  ClinicalDepartment,
} from "@/features/clinical/types/clinical-catalog.types";
import { CustomerAppointmentPicker } from "@/features/customers/components/CustomerAppointmentPicker";
import type { Customer } from "@/features/customers/types/customer.types";
import { OrganizationUserPicker } from "@/features/settings/components/OrganizationUserPicker";
import type { OrganizationUser } from "@/features/settings/types/settings.types";
import { useUser } from "@/providers/user-provider";

export function IpdAdmitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData } = useUser();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [clinic, setClinic] = useState<ClinicalClinic | null>(null);
  const [department, setDepartment] = useState<ClinicalDepartment | null>(null);
  const [ward, setWard] = useState<IpdWard | null>(null);
  const [bed, setBed] = useState<IpdBed | null>(null);
  const [clinician, setClinician] = useState<OrganizationUser | null>(null);
  const [complaint, setComplaint] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState<"cash" | "insurance" | "free">(
    "cash",
  );

  const clinicsQuery = useQuery({
    queryKey: ["clinical-clinics"],
    queryFn: fetchClinicalClinics,
  });

  const prefillClinicUuid = searchParams.get("clinic") ?? "";
  const prefillWardUuid = searchParams.get("ward") ?? "";
  const prefillBedUuid = searchParams.get("bed") ?? "";

  useEffect(() => {
    const clinics = clinicsQuery.data ?? [];
    if (!clinics.length || clinic) return;
    if (prefillClinicUuid) {
      const matched = clinics.find((item) => item.uuid === prefillClinicUuid);
      if (matched) {
        setClinic(matched);
        return;
      }
    }
    const primary = userData?.primary_clinic;
    if (primary) {
      const matched = clinics.find((item) => item.id === primary.id);
      if (matched) setClinic(matched);
    }
  }, [clinicsQuery.data, clinic, prefillClinicUuid, userData?.primary_clinic]);

  const wardsQuery = useQuery({
    queryKey: ["ipd-wards-prefill", clinic?.uuid],
    queryFn: () => fetchIpdWards(clinic ? { clinic: clinic.uuid } : {}),
    enabled: Boolean(clinic?.uuid && (prefillWardUuid || prefillBedUuid)),
  });

  useEffect(() => {
    if (!wardsQuery.data?.length || ward) return;
    if (prefillWardUuid) {
      const matched = wardsQuery.data.find((item) => item.uuid === prefillWardUuid);
      if (matched) setWard(matched);
    }
  }, [wardsQuery.data, ward, prefillWardUuid]);

  const bedsQuery = useQuery({
    queryKey: ["ipd-beds-prefill", ward?.uuid, prefillBedUuid],
    queryFn: () => fetchIpdBeds(ward ? { ward: ward.uuid } : {}),
    enabled: Boolean(ward?.uuid && prefillBedUuid),
  });

  useEffect(() => {
    if (!bedsQuery.data?.length || bed) return;
    if (prefillBedUuid) {
      const matched = bedsQuery.data.find((item) => item.uuid === prefillBedUuid);
      if (matched) setBed(matched);
    }
  }, [bedsQuery.data, bed, prefillBedUuid]);

  const canSubmit = useMemo(
    () => Boolean(customer && clinic && bed && clinician),
    [customer, clinic, bed, clinician],
  );

  const admitMutation = useMutation({
    mutationFn: () =>
      admitIpdStay({
        customer: customer!.uuid,
        clinic: clinic!.uuid,
        bed: bed!.uuid,
        clinician: clinician!.id,
        department: department?.uuid,
        presenting_complaint: complaint,
        mode_of_payment: modeOfPayment,
      }),
    onSuccess: (stay) => {
      router.push(
        ROUTES.clinicalIpdEncounter(stay.visit_uuid, stay.encounter_uuid),
      );
    },
  });

  return (
    <ListPageLayout data-testid="ipd-admit">
      <ListPageHeaderSection>
        <ListPageHeaderTopRow>
          <ListPageHeaderTitleBlock
            title="Admit patient"
            description="Direct IPD admission without a prior OPD encounter."
          />
        </ListPageHeaderTopRow>
      </ListPageHeaderSection>

      <form
        className="mx-auto max-w-xl space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          admitMutation.mutate();
        }}
      >
        <CustomerAppointmentPicker
          customer={customer}
          onCustomerChange={setCustomer}
        />
        <IpdClinicSelect
          clinics={clinicsQuery.data ?? []}
          value={clinic}
          onChange={(next) => {
            setClinic(next);
            setDepartment(null);
            setWard(null);
            setBed(null);
          }}
          isLoading={clinicsQuery.isLoading}
        />
        <IpdDepartmentSelect
          clinicId={clinic?.id}
          value={department}
          onChange={setDepartment}
        />
        <IpdWardSelect
          clinicUuid={clinic?.uuid}
          value={ward}
          onChange={(next) => {
            setWard(next);
            setBed(null);
          }}
        />
        <IpdBedSelect
          wardUuid={ward?.uuid}
          value={bed}
          onChange={setBed}
          availableOnly
        />
        <OrganizationUserPicker
          user={clinician}
          onUserChange={setClinician}
          label="Admitting clinician"
        />
        <div className="space-y-1.5">
          <Label htmlFor="ipd-mode-of-payment">Mode of payment</Label>
          <select
            id="ipd-mode-of-payment"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={modeOfPayment}
            onChange={(event) =>
              setModeOfPayment(
                event.target.value as "cash" | "insurance" | "free",
              )
            }
          >
            <option value="cash">Cash</option>
            <option value="insurance">Insurance</option>
            <option value="free">Free</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ipd-complaint">Presenting complaint</Label>
          <Textarea
            id="ipd-complaint"
            placeholder="Presenting complaint"
            value={complaint}
            onChange={(event) => setComplaint(event.target.value)}
          />
        </div>
        {admitMutation.error ? (
          <p className="text-sm text-destructive">
            {admitMutation.error instanceof Error
              ? admitMutation.error.message
              : "Admission failed."}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={!canSubmit || admitMutation.isPending}
        >
          Admit to ward
        </Button>
      </form>
    </ListPageLayout>
  );
}
