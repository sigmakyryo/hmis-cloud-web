"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { fetchIpdStays } from "@/features/clinical-ipd/services/clinical-ipd.service";
import { fetchClinicalClinics } from "@/features/clinical/services/clinical-catalog.service";
import type { ClinicalClinic } from "@/features/clinical/types/clinical-catalog.types";
import { useUser } from "@/providers/user-provider";

export function IpdActiveStaysPage() {
  const { userData } = useUser();
  const [clinic, setClinic] = useState<ClinicalClinic | null>(null);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

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

  const staysQuery = useQuery({
    queryKey: ["ipd-stays", "active", clinic?.uuid, submittedSearch],
    queryFn: () =>
      fetchIpdStays({
        status: "active",
        clinic: clinic?.uuid,
        q: submittedSearch || undefined,
      }),
  });

  return (
    <ListPageLayout data-testid="ipd-active-stays">
      <ListPageHeaderSection>
        <ListPageHeaderTopRow>
          <ListPageHeaderTitleBlock
            title="Active stays"
            description="Search inpatient stays and open the encounter workspace."
          />
          <ListPageHeaderActions>
            <Link href={ROUTES.clinicalIpdBoard} className="text-sm underline">
              Ward board
            </Link>
          </ListPageHeaderActions>
        </ListPageHeaderTopRow>
      </ListPageHeaderSection>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <IpdClinicSelect
          clinics={clinicsQuery.data ?? []}
          value={clinic}
          onChange={setClinic}
          isLoading={clinicsQuery.isLoading}
        />
        <Input
          placeholder="Search by patient name or file number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setSubmittedSearch(search.trim());
            }
          }}
        />
        <Button
          type="button"
          onClick={() => setSubmittedSearch(search.trim())}
        >
          Search
        </Button>
      </div>

      {staysQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading stays…</p>
      ) : null}
      {staysQuery.error ? (
        <p className="text-sm text-destructive">
          {staysQuery.error instanceof Error
            ? staysQuery.error.message
            : "Failed to load stays."}
        </p>
      ) : null}

      <ul className="divide-y divide-border/60">
        {(staysQuery.data ?? []).map((stay) => (
          <li
            key={stay.uuid}
            className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{stay.customer_name}</p>
              <p className="text-muted-foreground">
                {stay.current_ward_name ?? "—"} / {stay.current_bed_code ?? "—"}
                {" · "}
                {new Date(stay.admitted_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusDotBadge
                tone={stay.status === "admitted" ? "success" : "neutral"}
              >
                {stay.status}
              </StatusDotBadge>
              <Link
                href={ROUTES.clinicalIpdEncounter(
                  stay.visit_uuid,
                  stay.encounter_uuid,
                )}
                className="underline"
              >
                Open
              </Link>
            </div>
          </li>
        ))}
        {!staysQuery.isLoading && (staysQuery.data?.length ?? 0) === 0 ? (
          <li className="py-6 text-sm text-muted-foreground">
            No active stays match these filters.
          </li>
        ) : null}
      </ul>
    </ListPageLayout>
  );
}
