"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { PrimaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import { IpdBedSelect } from "@/features/clinical-ipd/components/IpdBedSelect";
import { IpdClinicSelect } from "@/features/clinical-ipd/components/IpdClinicSelect";
import { IpdWardSelect } from "@/features/clinical-ipd/components/IpdWardSelect";
import { fetchIpdStays } from "@/features/clinical-ipd/services/clinical-ipd.service";
import type { IpdBed, IpdWard } from "@/features/clinical-ipd/types/clinical-ipd.types";
import { fetchClinicalClinics } from "@/features/clinical/services/clinical-catalog.service";
import type { ClinicalClinic } from "@/features/clinical/types/clinical-catalog.types";
import { OpdEncounterTabSkeleton } from "@/features/clinical-opd/components/detail/OpdEncounterTabSkeleton";
import { useOpdEncounterWorkspace } from "@/features/clinical-opd/components/detail/opd-encounter-workspace-context";
import {
  useEncounterDisposition,
  useUpsertEncounterDisposition,
} from "@/features/clinical-opd/hooks/use-clinical-opd";
import { dispositionSchema } from "@/features/clinical-opd/schemas/clinical-opd.schema";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { useToast } from "@/providers/toast-provider";
import { useUser } from "@/providers/user-provider";

const OUTCOMES = [
  { value: "discharged", label: "Discharged" },
  { value: "follow_up", label: "Follow-up" },
  { value: "referred", label: "Referred" },
  { value: "admitted", label: "Admitted" },
  { value: "other", label: "Other" },
] as const;

type OpdDispositionTabPanelProps = {
  visitUuid: string;
  encounterUuid: string;
  isActive?: boolean;
};

export function OpdDispositionTabPanel({
  visitUuid,
  encounterUuid,
  isActive = true,
}: OpdDispositionTabPanelProps) {
  const { toast } = useToast();
  const { userData } = useUser();
  const { isChartLocked, capabilities } = useOpdEncounterWorkspace();
  const disposition = useEncounterDisposition(
    visitUuid,
    encounterUuid,
    isActive,
  );
  const upsert = useUpsertEncounterDisposition(visitUuid, encounterUuid);
  const canWrite = capabilities.includes("record_disposition") && !isChartLocked;
  const [clinic, setClinic] = useState<ClinicalClinic | null>(null);
  const [ward, setWard] = useState<IpdWard | null>(null);
  const [bed, setBed] = useState<IpdBed | null>(null);
  const [ipdLink, setIpdLink] = useState<string | null>(null);

  const clinicsQuery = useQuery({
    queryKey: ["clinical-clinics"],
    queryFn: fetchClinicalClinics,
    enabled: isActive,
  });

  useEffect(() => {
    const clinics = clinicsQuery.data ?? [];
    if (!clinics.length || clinic) return;
    const primary = userData?.primary_clinic;
    if (!primary) return;
    const matched = clinics.find((item) => item.id === primary.id);
    if (matched) setClinic(matched);
  }, [clinicsQuery.data, clinic, userData?.primary_clinic]);

  const form = useForm({
    resolver: zodResolver(dispositionSchema),
    values: {
      outcome: (disposition.data?.outcome ?? "discharged") as
        | "discharged"
        | "follow_up"
        | "referred"
        | "admitted"
        | "other",
      follow_up_at: disposition.data?.follow_up_at ?? "",
      notes: disposition.data?.notes ?? "",
      referral_destination: disposition.data?.referral_destination ?? "",
      ipd_bed: bed?.uuid ?? "",
    },
  });
  const outcome = form.watch("outcome");

  useEffect(() => {
    form.setValue("ipd_bed", bed?.uuid ?? "");
  }, [bed, form]);

  if (!isActive) return null;
  if (disposition.isLoading) return <OpdEncounterTabSkeleton rows={4} />;

  return (
    <form
      className="max-w-xl space-y-4"
      data-testid="opd-disposition-tab-panel"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await upsert.mutateAsync({
            ...values,
            follow_up_at: values.follow_up_at || null,
            ipd_bed: values.ipd_bed || null,
          });
          if (values.outcome === "admitted" && values.ipd_bed) {
            const stays = await fetchIpdStays({
              status: "active",
              visit: visitUuid,
            });
            const stay = stays[0];
            if (stay?.visit_uuid && stay.encounter_uuid) {
              const href = ROUTES.clinicalIpdEncounter(
                stay.visit_uuid,
                stay.encounter_uuid,
              );
              setIpdLink(href);
              toast({
                title: "Admitted to IPD",
                description: "Open the inpatient encounter to continue care.",
                variant: "success",
              });
              return;
            }
          }
          setIpdLink(null);
          toast({
            title: "Disposition saved",
            variant: "success",
          });
        } catch (error) {
          toast({
            title: "Could not save disposition",
            description:
              error instanceof BffError
                ? formatBffErrorMessage(error.message, error.errors)
                : "If this is a follow-up, the time slot may be unavailable.",
            variant: "error",
          });
        }
      })}
    >
      <div>
        <h2 className="text-base font-semibold text-brand-navy">Disposition</h2>
        <p className="mt-1 text-sm text-dash-muted">
          Optional. Closing the visit does not require a disposition.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Outcome</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          disabled={!canWrite}
          {...form.register("outcome")}
        >
          {OUTCOMES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {outcome === "follow_up" ? (
        <div className="space-y-1.5">
          <Label>Follow-up at</Label>
          <Input
            type="datetime-local"
            disabled={!canWrite}
            {...form.register("follow_up_at")}
          />
        </div>
      ) : null}
      {outcome === "referred" ? (
        <div className="space-y-1.5">
          <Label>Referral destination</Label>
          <Input
            disabled={!canWrite}
            {...form.register("referral_destination")}
          />
        </div>
      ) : null}
      {outcome === "admitted" ? (
        <div className="space-y-3">
          <IpdClinicSelect
            clinics={clinicsQuery.data ?? []}
            value={clinic}
            onChange={(next) => {
              setClinic(next);
              setWard(null);
              setBed(null);
            }}
            disabled={!canWrite}
            isLoading={clinicsQuery.isLoading}
          />
          <IpdWardSelect
            clinicUuid={clinic?.uuid}
            value={ward}
            onChange={(next) => {
              setWard(next);
              setBed(null);
            }}
            disabled={!canWrite}
          />
          <IpdBedSelect
            wardUuid={ward?.uuid}
            value={bed}
            onChange={setBed}
            disabled={!canWrite}
            availableOnly
            label="Available IPD bed"
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea rows={3} disabled={!canWrite} {...form.register("notes")} />
      </div>
      {ipdLink ? (
        <p className="text-sm">
          <Link href={ipdLink} className="underline">
            Open IPD encounter
          </Link>
        </p>
      ) : null}
      {canWrite ? (
        <PrimaryButton type="submit" disabled={upsert.isPending}>
          Save disposition
        </PrimaryButton>
      ) : null}
    </form>
  );
}
