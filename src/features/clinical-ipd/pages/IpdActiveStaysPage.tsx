"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/constants/routes";
import {
  ListPageBlankState,
  ListPageLayout,
  ListPageTableSection,
} from "@/features/app-shell/components/page-layout";
import { IpdAdmitSheet, type IpdAdmitDefaults } from "@/features/clinical-ipd/components/IpdAdmitSheet";
import { IpdClinicSelect } from "@/features/clinical-ipd/components/IpdClinicSelect";
import { IpdStaysTable } from "@/features/clinical-ipd/components/IpdStaysTable";
import { fetchIpdStays } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdStay, IpdStayStatus } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { fetchClinicalClinics } from "@/features/clinical/services/clinical-catalog.service";
import { cn } from "@/lib/utils";
import { useUser } from "@/providers/user-provider";

type StayFilter = "active" | IpdStayStatus;

const FILTERS: { id: StayFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "admitted", label: "Admitted" },
  { id: "planned", label: "Planned" },
  { id: "transferred", label: "Transferred" },
  { id: "discharged", label: "Discharged" },
  { id: "cancelled", label: "Cancelled" },
];

const ACTIVE: IpdStayStatus[] = ["planned", "admitted", "transferred"];

function isActive(stay: IpdStay): boolean {
  return ACTIVE.includes(stay.status);
}

function matchesFilter(stay: IpdStay, filter: StayFilter): boolean {
  if (filter === "active") return isActive(stay);
  return stay.status === filter;
}

function matchesSearch(stay: IpdStay, query: string): boolean {
  if (!query) return true;
  const haystack = [stay.customer_name, stay.current_ward_name, stay.current_bed_code, stay.admitting_clinician_name, stay.presenting_complaint]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function IpdActiveStaysPage() {
  const { userData } = useUser();
  const [clinicUuid, setClinicUuid] = useState<string | null | undefined>(undefined);
  const [filter, setFilter] = useState<StayFilter>("active");
  const [search, setSearch] = useState("");
  const [admit, setAdmit] = useState<IpdAdmitDefaults | null>(null);

  const clinicsQuery = useQuery({
    queryKey: ["clinical-clinics"],
    queryFn: fetchClinicalClinics,
  });

  const clinics = clinicsQuery.data;
  const clinic = useMemo(() => {
    const list = clinics ?? [];
    if (clinicUuid === null) return null;
    if (clinicUuid) return list.find((item) => item.uuid === clinicUuid) ?? null;
    const primaryId = userData?.primary_clinic?.id;
    if (primaryId == null) return null;
    return list.find((item) => item.id === primaryId) ?? null;
  }, [clinicUuid, clinics, userData?.primary_clinic?.id]);

  const staysQuery = useQuery({
    queryKey: ["ipd-stays", clinic?.uuid],
    queryFn: () => fetchIpdStays({ clinic: clinic?.uuid }),
    enabled: Boolean(clinic?.uuid),
  });

  const stays = staysQuery.data ?? [];
  const query = search.trim().toLowerCase();
  const counts = useMemo(() => {
    const next = Object.fromEntries(FILTERS.map((item) => [item.id, 0])) as Record<StayFilter, number>;
    for (const stay of staysQuery.data ?? []) {
      if (isActive(stay)) next.active += 1;
      next[stay.status] += 1;
    }
    return next;
  }, [staysQuery.data]);
  const rows = stays.filter((stay) => matchesFilter(stay, filter) && matchesSearch(stay, query));

  return (
    <ListPageLayout data-testid="ipd-active-stays">
      <div data-list-band className="px-5 pt-7 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="flex min-w-0 flex-wrap items-center gap-x-2">
              <IpdClinicSelect
                appearance="title"
                clinics={clinics ?? []}
                value={clinic}
                isLoading={clinicsQuery.isLoading}
                onChange={(next) => setClinicUuid(next?.uuid ?? null)}
              />
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-dash-muted">
              {staysQuery.isSuccess ? (
                <>
                  <span>
                    <span className="font-semibold text-brand-navy tabular-nums">{counts.active}</span> active
                  </span>
                  <span>
                    <span className="font-semibold text-brand-navy tabular-nums">{counts.discharged}</span> discharged
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href={ROUTES.clinicalIpdBoard}>Ward board</Link>
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-8 px-3 text-[13px]"
              disabled={!clinic}
              onClick={() => setAdmit({ clinicUuid: clinic?.uuid })}
            >
              Admit patient
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-x-8 gap-y-3 border-b border-dash-border md:flex-row md:items-end md:justify-between">
          <div role="group" aria-label="Filter by stay status" className="scrollbar-hide -mb-px flex gap-5 overflow-x-auto">
            {FILTERS.map((item) => {
              const selected = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "flex shrink-0 items-baseline gap-1.5 border-b-2 pb-2.5 text-[13.5px] whitespace-nowrap transition-colors focus-visible:text-brand-primary focus-visible:outline-none",
                    selected
                      ? "border-brand-primary font-semibold text-brand-navy"
                      : "border-transparent font-medium text-dash-muted hover:text-brand-navy",
                  )}
                >
                  {item.label}
                  <span className={cn("text-[12px] tabular-nums", selected ? "text-brand-primary" : "text-dash-muted/80")}>
                    {counts[item.id]}
                  </span>
                </button>
              );
            })}
          </div>
          <label className="relative mb-2.5 block w-full md:w-72">
            <span className="sr-only">Search stays</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dash-muted" aria-hidden />
            <Input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Patient, ward, clinician"
              className="h-9 rounded-full border-dash-border bg-white pr-9 pl-9 text-[13.5px] shadow-none focus-visible:border-brand-primary/50 focus-visible:ring-2 focus-visible:ring-brand-primary/15"
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-dash-muted hover:text-brand-navy"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </label>
        </div>
      </div>

      <ListPageTableSection>
        {!clinic ? (
          <ListPageBlankState compact icon="hospital" title="Choose a clinic" description="Stays are listed for one clinic at a time." />
        ) : staysQuery.isLoading ? (
          <div className="space-y-2 px-5 py-4 md:px-8" aria-hidden>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : staysQuery.error ? (
          <ListPageBlankState
            compact
            tone="error"
            icon="file"
            title="Could not load stays"
            description={staysQuery.error instanceof Error ? staysQuery.error.message : "The stay list did not load."}
          />
        ) : stays.length === 0 ? (
          <ListPageBlankState
            compact
            icon="hospital"
            title="No stays yet"
            description="Admit a patient onto a ward bed to start a stay."
            action={
              <Button type="button" variant="primary" className="h-8 px-3 text-[13px]" onClick={() => setAdmit({ clinicUuid: clinic.uuid })}>
                Admit patient
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <ListPageBlankState
            compact
            icon="search"
            title="No stays match"
            description="Nothing in this clinic has that status or search."
            action={
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-lg text-[13px]"
                onClick={() => {
                  setFilter("active");
                  setSearch("");
                }}
              >
                Show active stays
              </Button>
            }
          />
        ) : (
          <IpdStaysTable stays={rows} />
        )}
      </ListPageTableSection>

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
