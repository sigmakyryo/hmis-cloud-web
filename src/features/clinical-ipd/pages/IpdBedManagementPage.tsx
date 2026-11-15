"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { IpdBedsTable } from "@/features/clinical-ipd/components/IpdBedsTable";
import { IpdClinicSelect } from "@/features/clinical-ipd/components/IpdClinicSelect";
import { IpdCreateBedDialog } from "@/features/clinical-ipd/components/IpdCreateBedDialog";
import { IpdCreateWardDialog } from "@/features/clinical-ipd/components/IpdCreateWardDialog";
import { IpdWardSelect } from "@/features/clinical-ipd/components/IpdWardSelect";
import { IpdWardsTable } from "@/features/clinical-ipd/components/IpdWardsTable";
import { fetchIpdBeds, fetchIpdWards, updateIpdBed } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdBed, IpdBedStatus, IpdWard } from "@/features/clinical-ipd/types/clinical-ipd.types";
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

function countByStatus(beds: IpdBed[]): Record<IpdBedStatus, number> {
  const counts = Object.fromEntries(BED_STATUSES.map((status) => [status, 0])) as Record<IpdBedStatus, number>;
  for (const bed of beds) {
    if (bed.status in counts) counts[bed.status] += 1;
  }
  return counts;
}

export function IpdBedManagementPage() {
  const queryClient = useQueryClient();
  const { userData } = useUser();
  const [clinicUuid, setClinicUuid] = useState<string | null>(null);
  const [ward, setWard] = useState<IpdWard | null>(null);
  const [status, setStatus] = useState<IpdBedStatus | "">("");
  const [creatingWard, setCreatingWard] = useState(false);
  const [creatingBed, setCreatingBed] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

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

  const wardsQuery = useQuery({
    queryKey: ["ipd-wards", clinic?.uuid],
    queryFn: () => fetchIpdWards({ clinic: clinic?.uuid }),
    enabled: Boolean(clinic?.uuid),
  });

  const bedsQuery = useQuery({
    queryKey: ["ipd-beds", ward?.uuid],
    queryFn: () => fetchIpdBeds({ ward: ward?.uuid }),
    enabled: Boolean(ward?.uuid),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ uuid, next }: { uuid: string; next: IpdBedStatus }) => updateIpdBed(uuid, { status: next }),
    onSuccess: () => {
      setStatusError(null);
      void queryClient.invalidateQueries({ queryKey: ["ipd-beds"] });
      void queryClient.invalidateQueries({ queryKey: ["ipd-census"] });
    },
    onError: (error) => {
      setStatusError(error instanceof Error ? error.message : "Could not change the bed status.");
    },
  });

  const wards = wardsQuery.data ?? [];
  const beds = bedsQuery.data ?? [];
  const statusCounts = useMemo(() => countByStatus(bedsQuery.data ?? []), [bedsQuery.data]);
  const rows = beds.filter((bed) => status === "" || bed.status === status);

  function selectWard(next: IpdWard | null) {
    setWard(next);
    setStatus("");
    setStatusError(null);
  }

  return (
    <ListPageLayout data-testid="ipd-bed-management">
      <div data-list-band className="px-5 pt-7 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <IpdClinicSelect
                appearance="title"
                clinics={clinics ?? []}
                value={clinic}
                isLoading={clinicsQuery.isLoading}
                onChange={(next) => {
                  setClinicUuid(next?.uuid ?? null);
                  selectWard(null);
                }}
              />
              <span className="text-[22px] font-medium text-dash-muted" aria-hidden>
                /
              </span>
              <IpdWardSelect
                appearance="title"
                clinicUuid={clinic?.uuid}
                value={ward}
                onChange={selectWard}
                placeholder={clinic ? "All wards" : "Ward"}
              />
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-dash-muted">
              {ward && bedsQuery.isSuccess ? (
                <>
                  <Count label="available" value={statusCounts.available} />
                  <Count label="occupied" value={statusCounts.occupied} />
                  <Count label={beds.length === 1 ? "bed" : "beds"} value={beds.length} />
                </>
              ) : null}
              {!ward && wardsQuery.isSuccess ? <Count label={wards.length === 1 ? "ward" : "wards"} value={wards.length} /> : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href={ROUTES.clinicalIpdBoard}>Ward board</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={!clinic}
              onClick={() => setCreatingWard(true)}
            >
              New ward
            </Button>
            {ward ? (
              <Button type="button" variant="primary" className="h-8 px-3 text-[13px]" onClick={() => setCreatingBed(true)}>
                Add bed
              </Button>
            ) : null}
          </div>
        </div>

        {ward ? (
          <div role="group" aria-label="Filter by bed status" className="scrollbar-hide mt-6 -mb-px flex gap-5 overflow-x-auto border-b border-dash-border">
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
        ) : (
          <div className="mt-6 border-b border-dash-border" />
        )}
      </div>

      <ListPageTableSection>
        {statusError ? <p className="px-5 pt-4 text-sm text-destructive md:px-8">{statusError}</p> : null}
        {!clinic ? (
          <ListPageBlankState
            compact
            icon="hospital"
            title={clinicsQuery.isLoading ? "Loading clinics" : "Choose a clinic"}
            description="Beds belong to a ward. Pick the clinic first."
          />
        ) : ward ? (
          <BedsBody
            isLoading={bedsQuery.isLoading}
            error={bedsQuery.error}
            beds={beds}
            rows={rows}
            filtered={status !== ""}
            pendingBedUuid={updateStatusMutation.isPending ? updateStatusMutation.variables?.uuid ?? null : null}
            onClearFilter={() => setStatus("")}
            onAddBed={() => setCreatingBed(true)}
            onStatusChange={(bed, next) => updateStatusMutation.mutate({ uuid: bed.uuid, next })}
          />
        ) : (
          <WardsBody
            isLoading={wardsQuery.isLoading}
            error={wardsQuery.error}
            wards={wards}
            onOpen={selectWard}
            onCreate={() => setCreatingWard(true)}
          />
        )}
      </ListPageTableSection>

      {creatingWard && clinic ? (
        <IpdCreateWardDialog
          clinic={clinic}
          onClose={() => setCreatingWard(false)}
          onCreated={(created) => {
            selectWard(created);
            setCreatingWard(false);
          }}
        />
      ) : null}
      {creatingBed && ward ? <IpdCreateBedDialog ward={ward} onClose={() => setCreatingBed(false)} /> : null}
    </ListPageLayout>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span className="font-semibold text-brand-navy tabular-nums">{value}</span> {label}
    </span>
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

function WardsBody({
  isLoading,
  error,
  wards,
  onOpen,
  onCreate,
}: {
  isLoading: boolean;
  error: unknown;
  wards: IpdWard[];
  onOpen: (ward: IpdWard) => void;
  onCreate: () => void;
}) {
  if (isLoading) return <RowSkeleton />;
  if (error) {
    return (
      <ListPageBlankState
        compact
        tone="error"
        icon="file"
        title="Could not load wards"
        description={error instanceof Error ? error.message : "The ward list did not load."}
      />
    );
  }
  if (wards.length === 0) {
    return (
      <ListPageBlankState
        compact
        icon="hospital"
        title="No wards yet"
        description="Add a ward for this clinic, then add the beds that belong in it."
        action={
          <Button type="button" variant="primary" className="h-8 px-3 text-[13px]" onClick={onCreate}>
            New ward
          </Button>
        }
      />
    );
  }
  return <IpdWardsTable wards={wards} onOpen={onOpen} />;
}

function BedsBody({
  isLoading,
  error,
  beds,
  rows,
  filtered,
  pendingBedUuid,
  onClearFilter,
  onAddBed,
  onStatusChange,
}: {
  isLoading: boolean;
  error: unknown;
  beds: IpdBed[];
  rows: IpdBed[];
  filtered: boolean;
  pendingBedUuid: string | null;
  onClearFilter: () => void;
  onAddBed: () => void;
  onStatusChange: (bed: IpdBed, status: IpdBedStatus) => void;
}) {
  if (isLoading) return <RowSkeleton />;
  if (error) {
    return (
      <ListPageBlankState
        compact
        tone="error"
        icon="file"
        title="Could not load beds"
        description={error instanceof Error ? error.message : "The bed list did not load."}
      />
    );
  }
  if (beds.length === 0) {
    return (
      <ListPageBlankState
        compact
        icon="hospital"
        title="No beds in this ward"
        description="Add the first bed. Occupied beds can only change when the patient is discharged or transferred."
        action={
          <Button type="button" variant="primary" className="h-8 px-3 text-[13px]" onClick={onAddBed}>
            Add bed
          </Button>
        }
      />
    );
  }
  if (rows.length === 0 && filtered) {
    return (
      <ListPageBlankState
        compact
        icon="search"
        title="No beds match"
        description="Nothing in this ward has that status."
        action={
          <Button type="button" variant="outline" className="h-8 rounded-lg text-[13px]" onClick={onClearFilter}>
            Show every bed
          </Button>
        }
      />
    );
  }
  return <IpdBedsTable beds={rows} pendingBedUuid={pendingBedUuid} onStatusChange={onStatusChange} />;
}

function RowSkeleton() {
  return (
    <div className="space-y-2 px-5 py-4 md:px-8" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
