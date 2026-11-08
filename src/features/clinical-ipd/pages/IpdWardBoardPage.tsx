"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { ROUTES } from "@/constants/routes";
import {
  ListPageHeaderActions,
  ListPageHeaderSection,
  ListPageHeaderTitleBlock,
  ListPageHeaderTopRow,
  ListPageLayout,
} from "@/features/app-shell/components/page-layout";
import { fetchIpdCensus } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdBedStatus } from "@/features/clinical-ipd/types/clinical-ipd.types";

const STATUS_TONE: Record<
  IpdBedStatus,
  "success" | "primary" | "warning" | "danger" | "neutral"
> = {
  available: "success",
  occupied: "primary",
  blocked: "warning",
  maintenance: "danger",
};

export function IpdWardBoardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ipd-census"],
    queryFn: () => fetchIpdCensus(),
  });

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
              <Link href={ROUTES.clinicalIpdBeds} className="underline">
                Manage beds
              </Link>
            </div>
          </ListPageHeaderActions>
        </ListPageHeaderTopRow>
      </ListPageHeaderSection>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading census…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load census."}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(data ?? []).map((row) => {
          const href =
            row.stay?.visit_uuid && row.stay.encounter_uuid
              ? ROUTES.clinicalIpdEncounter(
                  row.stay.visit_uuid,
                  row.stay.encounter_uuid,
                )
              : null;
          const body = (
            <div className="space-y-2 rounded-md border border-border/70 p-3 text-sm">
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
                <p>
                  {row.stay.customer.display_name}
                  {row.stay.customer.file_number
                    ? ` · ${row.stay.customer.file_number}`
                    : ""}
                </p>
              ) : (
                <p className="text-muted-foreground">Empty</p>
              )}
            </div>
          );
          return href ? (
            <Link key={row.bed_uuid} href={href} className="block hover:opacity-90">
              {body}
            </Link>
          ) : (
            <div key={row.bed_uuid}>{body}</div>
          );
        })}
      </div>
    </ListPageLayout>
  );
}
