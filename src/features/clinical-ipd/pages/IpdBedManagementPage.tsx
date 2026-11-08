"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import {
  ListPageHeaderSection,
  ListPageHeaderTitleBlock,
  ListPageHeaderTopRow,
  ListPageLayout,
} from "@/features/app-shell/components/page-layout";
import {
  createIpdBed,
  createIpdWard,
  fetchIpdBeds,
  fetchIpdWards,
} from "@/features/clinical-ipd/services/clinical-ipd.service";

export function IpdBedManagementPage() {
  const queryClient = useQueryClient();
  const [wardName, setWardName] = useState("");
  const [wardCode, setWardCode] = useState("");
  const [clinicUuid, setClinicUuid] = useState("");
  const [departmentUuid, setDepartmentUuid] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [bedCode, setBedCode] = useState("");

  const wardsQuery = useQuery({
    queryKey: ["ipd-wards"],
    queryFn: () => fetchIpdWards(),
  });
  const bedsQuery = useQuery({
    queryKey: ["ipd-beds", selectedWard],
    queryFn: () => fetchIpdBeds(selectedWard ? { ward: selectedWard } : {}),
  });

  const createWardMutation = useMutation({
    mutationFn: () =>
      createIpdWard({
        name: wardName,
        code: wardCode,
        clinic: clinicUuid,
        department: departmentUuid,
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
        ward: selectedWard,
        code: bedCode,
      }),
    onSuccess: () => {
      setBedCode("");
      void queryClient.invalidateQueries({ queryKey: ["ipd-beds"] });
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
          <Input
            placeholder="Clinic UUID"
            value={clinicUuid}
            onChange={(event) => setClinicUuid(event.target.value)}
          />
          <Input
            placeholder="IPD department UUID"
            value={departmentUuid}
            onChange={(event) => setDepartmentUuid(event.target.value)}
          />
          <Input
            placeholder="Ward name"
            value={wardName}
            onChange={(event) => setWardName(event.target.value)}
          />
          <Input
            placeholder="Ward code"
            value={wardCode}
            onChange={(event) => setWardCode(event.target.value)}
          />
          <Button
            type="button"
            disabled={createWardMutation.isPending}
            onClick={() => createWardMutation.mutate()}
          >
            Create ward
          </Button>
          <ul className="space-y-2 pt-4 text-sm">
            {(wardsQuery.data ?? []).map((ward) => (
              <li key={ward.uuid}>
                <button
                  type="button"
                  className={
                    selectedWard === ward.uuid
                      ? "font-medium underline"
                      : "text-muted-foreground underline-offset-2 hover:underline"
                  }
                  onClick={() => setSelectedWard(ward.uuid)}
                >
                  {ward.name} ({ward.code}) · {ward.ward_class}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Beds</h2>
          <Input
            placeholder="Bed code"
            value={bedCode}
            onChange={(event) => setBedCode(event.target.value)}
            disabled={!selectedWard}
          />
          <Button
            type="button"
            disabled={!selectedWard || createBedMutation.isPending}
            onClick={() => createBedMutation.mutate()}
          >
            Add bed
          </Button>
          <ul className="space-y-2 pt-4 text-sm">
            {(bedsQuery.data ?? []).map((bed) => (
              <li
                key={bed.uuid}
                className="flex items-center justify-between gap-2 border-b border-border/60 pb-2"
              >
                <span>
                  {bed.code}
                  {bed.label ? ` · ${bed.label}` : ""}
                </span>
                <StatusDotBadge
                  tone={bed.status === "available" ? "success" : "primary"}
                >
                  {bed.status}
                </StatusDotBadge>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ListPageLayout>
  );
}
