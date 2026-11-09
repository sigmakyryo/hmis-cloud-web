"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { ROUTES } from "@/constants/routes";
import {
  ListPageHeaderActions,
  ListPageHeaderSection,
  ListPageHeaderTitleBlock,
  ListPageHeaderTopRow,
  ListPageLayout,
} from "@/features/app-shell/components/page-layout";
import { IpdClinicSelect } from "@/features/clinical-ipd/components/IpdClinicSelect";
import { IpdStayDischargeDialog } from "@/features/clinical-ipd/components/IpdStayDischargeDialog";
import { IpdStayTransferDialog } from "@/features/clinical-ipd/components/IpdStayTransferDialog";
import { IpdWardHandoverPanel } from "@/features/clinical-ipd/components/IpdWardHandoverPanel";
import { IpdWardSelect } from "@/features/clinical-ipd/components/IpdWardSelect";
import {
  fetchIpdCensus,
  fetchIpdCensusStats,
} from "@/features/clinical-ipd/services/clinical-ipd.service";
import type {
  IpdBedStatus,
  IpdCensusRow,
  IpdWard,
  IpdWardClass,
} from "@/features/clinical-ipd/types/clinical-ipd.types";
import { fetchClinicalClinics } from "@/features/clinical/services/clinical-catalog.service";
import type { ClinicalClinic } from "@/features/clinical/types/clinical-catalog.types";
import { useUser } from "@/providers/user-provider";

const STATUS_TONE: Record<
  IpdBedStatus,
  "success" | "primary" | "warning" | "danger" | "neutral"
> = {
  available: "success",
  occupied: "primary",
  blocked: "warning",
  maintenance: "danger",
  reserved: "warning",
  cleaning: "warning",
};

const BED_STATUSES: Array<IpdBedStatus | ""> = [
  "",
  "available",
  "occupied",
  "reserved",
  "cleaning",
  "blocked",
  "maintenance",
];

const WARD_CLASSES: Array<IpdWardClass | ""> = [
  "",
  "general",
  "icu",
  "maternity",
  "other",
];

export function IpdWardBoardPage() {
  const { userData } = useUser();
  const [clinic, setClinic] = useState<ClinicalClinic | null>(null);
  const [ward, setWard] = useState<IpdWard | null>(null);
  const [wardClass, setWardClass] = useState<IpdWardClass | "">("");
  const [status, setStatus] = useState<IpdBedStatus | "">("");
  const [transferStay, setTransferStay] = useState<IpdCensusRow | null>(null);
  const [dischargeStay, setDischargeStay] = useState<IpdCensusRow | null>(null);

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

  const filters = useMemo(
    () => ({
      clinic: clinic?.uuid,
      ward: ward?.uuid,
      ward_class: wardClass || undefined,
      status: status || undefined,
    }),
    [clinic?.uuid, ward?.uuid, wardClass, status],
  );

  const censusQuery = useQuery({
    queryKey: ["ipd-census", filters],
    queryFn: () => fetchIpdCensus(filters),
  });

  const statsQuery = useQuery({
    queryKey: ["ipd-census-stats", clinic?.uuid, ward?.uuid],
    queryFn: () =>
      fetchIpdCensusStats({
        clinic: clinic?.uuid,
        ward: ward?.uuid,
      }),
  });

  const boardCounts = useMemo(() => {
    const rows = censusQuery.data ?? [];
    return {
      available: rows.filter((row) => row.bed_status === "available").length,
      occupied: rows.filter((row) => row.bed_status === "occupied").length,
      blocked: rows.filter(
        (row) =>
          row.bed_status === "blocked" ||
          row.bed_status === "maintenance" ||
          row.bed_status === "reserved" ||
          row.bed_status === "cleaning",
      ).length,
    };
  }, [censusQuery.data]);

  return (
    <ListPageLayout data-testid="ipd-ward-board">
      <ListPageHeaderSection>
        <ListPageHeaderTopRow>
          <ListPageHeaderTitleBlock
            title="Ward board"
            description="Live bed occupancy across IPD wards."
          />
          <ListPageHeaderActions>
            <div className="flex gap-3 text-sm">
              <Link href={ROUTES.clinicalIpdAdmit} className="underline">
                Admit patient
              </Link>
              <Link href={ROUTES.clinicalIpdStays} className="underline">
                Active stays
              </Link>
              <Link href={ROUTES.clinicalIpdBeds} className="underline">
                Manage beds
              </Link>
            </div>
          </ListPageHeaderActions>
        </ListPageHeaderTopRow>
      </ListPageHeaderSection>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <IpdClinicSelect
          clinics={clinicsQuery.data ?? []}
          value={clinic}
          onChange={(next) => {
            setClinic(next);
            setWard(null);
          }}
          isLoading={clinicsQuery.isLoading}
        />
        <IpdWardSelect
          clinicUuid={clinic?.uuid}
          value={ward}
          onChange={setWard}
        />
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="ward-class-filter">
            Ward class
          </label>
          <select
            id="ward-class-filter"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={wardClass}
            onChange={(event) =>
              setWardClass(event.target.value as IpdWardClass | "")
            }
          >
            {WARD_CLASSES.map((value) => (
              <option key={value || "all"} value={value}>
                {value || "All classes"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="bed-status-filter">
            Bed status
          </label>
          <select
            id="bed-status-filter"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as IpdBedStatus | "")
            }
          >
            {BED_STATUSES.map((value) => (
              <option key={value || "all"} value={value}>
                {value || "All statuses"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <span>
          Available: <strong>{boardCounts.available}</strong>
        </span>
        <span>
          Occupied: <strong>{boardCounts.occupied}</strong>
        </span>
        <span>
          Other: <strong>{boardCounts.blocked}</strong>
        </span>
        {statsQuery.data ? (
          <>
            <span className="text-muted-foreground">·</span>
            <span>
              Active stays: <strong>{statsQuery.data.active_stays}</strong>
            </span>
            <span>
              Admitted today: <strong>{statsQuery.data.admitted_today}</strong>
            </span>
          </>
        ) : null}
      </div>

      {censusQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading census…</p>
      ) : null}
      {censusQuery.error ? (
        <p className="text-sm text-destructive">
          {censusQuery.error instanceof Error
            ? censusQuery.error.message
            : "Failed to load census."}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(censusQuery.data ?? []).map((row) => {
            const href =
              row.stay?.visit_uuid && row.stay.encounter_uuid
                ? ROUTES.clinicalIpdEncounter(
                    row.stay.visit_uuid,
                    row.stay.encounter_uuid,
                  )
                : null;
            const admitHref = `${ROUTES.clinicalIpdAdmit}?clinic=${encodeURIComponent(row.clinic_uuid)}&ward=${encodeURIComponent(row.ward_uuid)}&bed=${encodeURIComponent(row.bed_uuid)}`;

            return (
              <div
                key={row.bed_uuid}
                className="space-y-2 rounded-md border border-border/70 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {row.ward_code}-{row.bed_code}
                  </p>
                  <StatusDotBadge tone={STATUS_TONE[row.bed_status]}>
                    {row.bed_status}
                  </StatusDotBadge>
                </div>
                <p className="text-muted-foreground">
                  {row.ward_name} · {row.ward_class}
                </p>
                {row.stay?.customer ? (
                  <>
                    <p>
                      {row.stay.customer.display_name}
                      {row.stay.customer.file_number
                        ? ` · ${row.stay.customer.file_number}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {href ? (
                        <Link href={href} className="underline">
                          Open encounter
                        </Link>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setTransferStay(row)}
                      >
                        Transfer
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setDischargeStay(row)}
                      >
                        Discharge
                      </Button>
                    </div>
                  </>
                ) : row.bed_status === "available" ? (
                  <Link href={admitHref} className="inline-block underline">
                    Admit here
                  </Link>
                ) : (
                  <p className="text-muted-foreground">Empty</p>
                )}
              </div>
            );
          })}
        </div>

        {ward ? (
          <IpdWardHandoverPanel wardUuid={ward.uuid} wardName={ward.name} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a ward to view patients and record handovers.
          </p>
        )}
      </div>

      {transferStay?.stay ? (
        <IpdStayTransferDialog
          stayUuid={transferStay.stay.uuid}
          clinicUuid={transferStay.clinic_uuid}
          open
          onClose={() => setTransferStay(null)}
        />
      ) : null}
      {dischargeStay?.stay ? (
        <IpdStayDischargeDialog
          stayUuid={dischargeStay.stay.uuid}
          open
          onClose={() => setDischargeStay(null)}
        />
      ) : null}
    </ListPageLayout>
  );
}
