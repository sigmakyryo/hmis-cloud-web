"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import {
  ListPageHeaderSection,
  ListPageHeaderTitleBlock,
  ListPageHeaderTopRow,
  ListPageLayout,
} from "@/features/app-shell/components/page-layout";
import { IpdClinicSelect } from "@/features/clinical-ipd/components/IpdClinicSelect";
import { IpdDepartmentSelect } from "@/features/clinical-ipd/components/IpdDepartmentSelect";
import { IpdWardSelect } from "@/features/clinical-ipd/components/IpdWardSelect";
import {
  createIpdBed,
  createIpdWard,
  fetchIpdBeds,
  fetchIpdWards,
  updateIpdBed,
} from "@/features/clinical-ipd/services/clinical-ipd.service";
import type {
  IpdBedStatus,
  IpdWard,
} from "@/features/clinical-ipd/types/clinical-ipd.types";
import { fetchClinicalClinics } from "@/features/clinical/services/clinical-catalog.service";
import type {
  ClinicalClinic,
  ClinicalDepartment,
} from "@/features/clinical/types/clinical-catalog.types";
import { useUser } from "@/providers/user-provider";

const EDITABLE_STATUSES: IpdBedStatus[] = [
  "available",
  "reserved",
  "cleaning",
  "blocked",
  "maintenance",
];

function bedTone(
  status: IpdBedStatus,
): "success" | "primary" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "available":
      return "success";
    case "occupied":
      return "primary";
    case "reserved":
    case "cleaning":
      return "warning";
    case "blocked":
    case "maintenance":
      return "danger";
    default:
      return "neutral";
  }
}

export function IpdBedManagementPage() {
  const queryClient = useQueryClient();
  const { userData } = useUser();
  const [clinic, setClinic] = useState<ClinicalClinic | null>(null);
  const [department, setDepartment] = useState<ClinicalDepartment | null>(null);
  const [wardName, setWardName] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [selectedWard, setSelectedWard] = useState<IpdWard | null>(null);
  const [bedCode, setBedCode] = useState("");

  const clinicsQuery = useQuery({
    queryKey: ["clinical-clinics"],
    queryFn: fetchClinicalClinics,
  });

  useEffect(() => {
    const clinics = clinicsQuery.data ?? [];
    if (!clinics.length || clinic) return;
    const primary = userData?.primary_clinic;
    if (!primary) return;
    const matched = clinics.find((item) => item.id === primary.id);
    if (matched) setClinic(matched);
  }, [clinicsQuery.data, clinic, userData?.primary_clinic]);

  const wardsQuery = useQuery({
    queryKey: ["ipd-wards", clinic?.uuid],
    queryFn: () => fetchIpdWards(clinic ? { clinic: clinic.uuid } : {}),
  });

  const bedsQuery = useQuery({
    queryKey: ["ipd-beds", selectedWard?.uuid],
    queryFn: () =>
      fetchIpdBeds(selectedWard ? { ward: selectedWard.uuid } : {}),
    enabled: Boolean(selectedWard?.uuid),
  });

  const createWardMutation = useMutation({
    mutationFn: () =>
      createIpdWard({
        name: wardName,
        code: wardCode,
        clinic: clinic!.uuid,
        department: department!.uuid,
      }),
    onSuccess: () => {
      setWardName("");
      setWardCode("");
      void queryClient.invalidateQueries({ queryKey: ["ipd-wards"] });
    },
  });

  const createBedMutation = useMutation({
    mutationFn: () =>
      createIpdBed({
        ward: selectedWard!.uuid,
        code: bedCode,
      }),
    onSuccess: () => {
      setBedCode("");
      void queryClient.invalidateQueries({ queryKey: ["ipd-beds"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      uuid,
      status,
      code,
    }: {
      uuid: string;
      status: IpdBedStatus;
      code: string;
    }) => updateIpdBed(uuid, { status, code }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ipd-beds"] });
      void queryClient.invalidateQueries({ queryKey: ["ipd-census"] });
    },
  });

  return (
    <ListPageLayout data-testid="ipd-bed-management">
      <ListPageHeaderSection>
        <ListPageHeaderTopRow>
          <ListPageHeaderTitleBlock
            title="Bed management"
            description="Maintain wards and beds for inpatient admissions."
          />
        </ListPageHeaderTopRow>
      </ListPageHeaderSection>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Create ward</h2>
          <IpdClinicSelect
            clinics={clinicsQuery.data ?? []}
            value={clinic}
            onChange={(next) => {
              setClinic(next);
              setDepartment(null);
              setSelectedWard(null);
            }}
            isLoading={clinicsQuery.isLoading}
          />
          <IpdDepartmentSelect
            clinicId={clinic?.id}
            value={department}
            onChange={setDepartment}
          />
          <div className="space-y-1.5">
            <Label htmlFor="ward-name">Ward name</Label>
            <Input
              id="ward-name"
              placeholder="General A"
              value={wardName}
              onChange={(event) => setWardName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ward-code">Ward code</Label>
            <Input
              id="ward-code"
              placeholder="GEN-A"
              value={wardCode}
              onChange={(event) => setWardCode(event.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={
              !clinic ||
              !department ||
              !wardName.trim() ||
              !wardCode.trim() ||
              createWardMutation.isPending
            }
            onClick={() => createWardMutation.mutate()}
          >
            Create ward
          </Button>
          <div className="pt-4">
            <IpdWardSelect
              clinicUuid={clinic?.uuid}
              value={selectedWard}
              onChange={setSelectedWard}
              label="Selected ward"
            />
          </div>
          <ul className="space-y-2 pt-2 text-sm">
            {(wardsQuery.data ?? []).map((ward) => (
              <li key={ward.uuid}>
                <button
                  type="button"
                  className={
                    selectedWard?.uuid === ward.uuid
                      ? "font-medium underline"
                      : "text-muted-foreground underline-offset-2 hover:underline"
                  }
                  onClick={() => setSelectedWard(ward)}
                >
                  {ward.name} ({ward.code}) · {ward.ward_class}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Beds</h2>
          <div className="space-y-1.5">
            <Label htmlFor="bed-code">Bed code</Label>
            <Input
              id="bed-code"
              placeholder="B01"
              value={bedCode}
              onChange={(event) => setBedCode(event.target.value)}
              disabled={!selectedWard}
            />
          </div>
          <Button
            type="button"
            disabled={
              !selectedWard || !bedCode.trim() || createBedMutation.isPending
            }
            onClick={() => createBedMutation.mutate()}
          >
            Add bed
          </Button>
          <ul className="space-y-2 pt-4 text-sm">
            {(bedsQuery.data ?? []).map((bed) => (
              <li
                key={bed.uuid}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2"
              >
                <span>
                  {bed.code}
                  {bed.label ? ` · ${bed.label}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <StatusDotBadge tone={bedTone(bed.status)}>
                    {bed.status}
                  </StatusDotBadge>
                  {bed.status !== "occupied" ? (
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={bed.status}
                      disabled={updateStatusMutation.isPending}
                      onChange={(event) =>
                        updateStatusMutation.mutate({
                          uuid: bed.uuid,
                          code: bed.code,
                          status: event.target.value as IpdBedStatus,
                        })
                      }
                    >
                      {EDITABLE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ListPageLayout>
  );
}
