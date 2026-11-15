"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import {
  ListPageBlankState,
  ListPageLayout,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { IpdAdmitSheet, type IpdAdmitDefaults } from "@/features/clinical-ipd/components/IpdAdmitSheet";
import { IpdClinicSelect } from "@/features/clinical-ipd/components/IpdClinicSelect";
import { IpdStayDischargeDialog } from "@/features/clinical-ipd/components/IpdStayDischargeDialog";
import { IpdStayTransferDialog } from "@/features/clinical-ipd/components/IpdStayTransferDialog";
import { IpdWardBoardTable } from "@/features/clinical-ipd/components/IpdWardBoardTable";
import { IpdWardHandoverPanel } from "@/features/clinical-ipd/components/IpdWardHandoverPanel";
import { IpdWardSelect } from "@/features/clinical-ipd/components/IpdWardSelect";
import { fetchIpdCensus, fetchIpdCensusStats } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdBedStatus, IpdCensusRow, IpdWard, IpdWardClass } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { fetchClinicalClinics } from "@/features/clinical/services/clinical-catalog.service";
import { cn } from "@/lib/utils";
import { useUser } from "@/providers/user-provider";

const BED_STATUSES: IpdBedStatus[] = ["available", "occupied", "reserved", "cleaning", "blocked", "maintenance"];

const BED_STATUS_LABEL: Record<IpdBedStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  cleaning: "Cleaning",
  blocked: "Blocked",
  maintenance: "Maintenance",
};

const WARD_CLASSES: IpdWardClass[] = ["general", "icu", "maternity", "other"];

const WARD_CLASS_LABEL: Record<IpdWardClass, string> = {
  general: "General",
  icu: "ICU",
  maternity: "Maternity",
  other: "Other",
};

function countBy<T extends string>(rows: IpdCensusRow[], value: (row: IpdCensusRow) => T, keys: T[]): Record<T, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  for (const row of rows) {
    const key = value(row);
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

export function IpdWardBoardPage() {
  const { userData } = useUser();
  const [clinicUuid, setClinicUuid] = useState<string | null>(null);
  const [ward, setWard] = useState<IpdWard | null>(null);
  const [wardClass, setWardClass] = useState<IpdWardClass | "">("");
  const [status, setStatus] = useState<IpdBedStatus | "">("");
  const [transferStay, setTransferStay] = useState<IpdCensusRow | null>(null);
  const [dischargeStay, setDischargeStay] = useState<IpdCensusRow | null>(null);
  const [admit, setAdmit] = useState<IpdAdmitDefaults | null>(null);

  const clinicsQuery = useQuery({
    queryKey: ["clinical-clinics"],
    queryFn: fetchClinicalClinics,
  });

  const clinics = clinicsQuery.data;
  const clinic = useMemo(() => {
    const list = clinics ?? [];
    if (clinicUuid) return list.find((item) => item.uuid === clinicUuid) ?? null;
    const primaryId = userData?.primary_clinic?.id;
    if (primaryId == null) return null;
    return list.find((item) => item.id === primaryId) ?? null;
  }, [clinicUuid, clinics, userData?.primary_clinic?.id]);

  const censusQuery = useQuery({
    queryKey: ["ipd-census", clinic?.uuid, ward?.uuid],
    queryFn: () => fetchIpdCensus({ clinic: clinic?.uuid, ward: ward?.uuid }),
  });

  const statsQuery = useQuery({
    queryKey: ["ipd-census-stats", clinic?.uuid, ward?.uuid],
    queryFn: () => fetchIpdCensusStats({ clinic: clinic?.uuid, ward: ward?.uuid }),
  });

  const census = censusQuery.data;
  const beds = census ?? [];
  const statusCounts = useMemo(() => countBy(census ?? [], (row) => row.bed_status, BED_STATUSES), [census]);
  const classCounts = useMemo(() => countBy(census ?? [], (row) => row.ward_class, WARD_CLASSES), [census]);
  const rows = beds.filter(
    (row) => (status === "" || row.bed_status === status) && (wardClass === "" || row.ward_class === wardClass),
  );
  const filtered = status !== "" || wardClass !== "";

  return (
    <ListPageLayout data-testid="ipd-ward-board">
      <div data-list-band className="px-5 pt-7 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <IpdClinicSelect
                appearance="title"
                clinics={clinics ?? []}
                value={clinic}
                onChange={(next) => {
                  setClinicUuid(next?.uuid ?? null);
                  setWard(null);
                }}
                isLoading={clinicsQuery.isLoading}
              />
              <span className="text-[22px] font-medium text-dash-muted" aria-hidden>
                /
              </span>
              <IpdWardSelect
                appearance="title"
                clinicUuid={clinic?.uuid}
                value={ward}
                onChange={setWard}
                placeholder={clinic ? "All wards" : "Ward"}
              />
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-dash-muted">
              <span>
                <span className="font-semibold text-brand-navy tabular-nums">{statusCounts.available}</span> available
              </span>
              <span>
                <span className="font-semibold text-brand-navy tabular-nums">{statusCounts.occupied}</span> occupied
              </span>
              {statsQuery.data ? (
                <>
                  <span>
                    <span className="font-semibold text-brand-navy tabular-nums">{statsQuery.data.active_stays}</span> active stays
                  </span>
                  <span>
                    <span className="font-semibold text-brand-navy tabular-nums">{statsQuery.data.admitted_today}</span> admitted today
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href={ROUTES.clinicalIpdStays}>Active stays</Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href={ROUTES.clinicalIpdBeds}>Beds</Link>
            </Button>
            <Button variant="primary" className="h-8 px-3 text-[13px]" onClick={() => setAdmit({ clinicUuid: clinic?.uuid, wardUuid: ward?.uuid })}>
              Admit patient
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-y-3 border-b border-dash-border lg:flex-row lg:items-end lg:justify-between">
          <div role="group" aria-label="Filter by bed status" className="scrollbar-hide -mb-px flex gap-5 overflow-x-auto">
            <StatusTab label="All" count={beds.length} selected={status === ""} onSelect={() => setStatus("")} />
            {BED_STATUSES.map((value) => (
              <StatusTab
                key={value}
                label={BED_STATUS_LABEL[value]}
                count={statusCounts[value]}
                selected={status === value}
                onSelect={() => setStatus(value)}
              />
            ))}
          </div>
          <div role="group" aria-label="Filter by ward class" className="scrollbar-hide -mb-px flex gap-4 overflow-x-auto">
            <StatusTab label="All classes" count={beds.length} selected={wardClass === ""} onSelect={() => setWardClass("")} />
            {WARD_CLASSES.map((value) => (
              <StatusTab
                key={value}
                label={WARD_CLASS_LABEL[value]}
                count={classCounts[value]}
                selected={wardClass === value}
                onSelect={() => setWardClass(value)}
              />
            ))}
          </div>
        </div>
      </div>

      <ListPageTableSection>
        {censusQuery.isLoading ? (
          <div className="space-y-2 px-5 py-4 md:px-8" aria-hidden>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : censusQuery.error ? (
          <ListPageBlankState
            compact
            tone="error"
            icon="file"
            title="Could not load the ward board"
            description={censusQuery.error instanceof Error ? censusQuery.error.message : "The census did not load."}
          />
        ) : beds.length === 0 ? (
          <ListPageBlankState compact icon="hospital" title="No beds on this board" description="Choose another clinic or ward, or add beds for this ward." />
        ) : rows.length === 0 && filtered ? (
          <ListPageBlankState
            compact
            icon="search"
            title="No beds match"
            description="Nothing on this board has that status or ward class."
            action={
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg text-[13px]"
                onClick={() => {
                  setStatus("");
                  setWardClass("");
                }}
              >
                Show every bed
              </Button>
            }
          />
        ) : (
          <IpdWardBoardTable
            rows={rows}
            onTransfer={setTransferStay}
            onDischarge={setDischargeStay}
            onAdmit={(row) =>
              setAdmit({ clinicUuid: row.clinic_uuid, wardUuid: row.ward_uuid, bedUuid: row.bed_uuid })
            }
          />
        )}
      </ListPageTableSection>

      {ward ? (
        <div data-list-band className="border-t border-dash-border px-5 py-6 md:px-8">
          <IpdWardHandoverPanel wardUuid={ward.uuid} wardName={ward.name} />
        </div>
      ) : null}

      {transferStay?.stay ? (
        <IpdStayTransferDialog
          stayUuid={transferStay.stay.uuid}
          clinicUuid={transferStay.clinic_uuid}
          open
          onClose={() => setTransferStay(null)}
        />
      ) : null}
      {dischargeStay?.stay ? (
        <IpdStayDischargeDialog stayUuid={dischargeStay.stay.uuid} open onClose={() => setDischargeStay(null)} />
      ) : null}
      {admit ? (
        <IpdAdmitSheet
          open
          defaults={admit}
          onOpenChange={(open) => {
            if (!open) setAdmit(null);
          }}
        />
      ) : null}
    </ListPageLayout>
  );
}

function StatusTab({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex shrink-0 items-baseline gap-1.5 border-b-2 pb-2.5 text-[13.5px] whitespace-nowrap transition-colors focus-visible:text-brand-primary focus-visible:outline-none",
        selected ? "border-brand-primary font-semibold text-brand-navy" : "border-transparent font-medium text-dash-muted hover:text-brand-navy",
      )}
    >
      {label}
      <span className={cn("text-[12px] tabular-nums", selected ? "text-brand-primary" : "text-dash-muted/80")}>{count}</span>
    </button>
  );
}
