"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants/routes";
import {
  ListPageHeaderSection,
  ListPageHeaderTitleBlock,
  ListPageHeaderTopRow,
  ListPageLayout,
} from "@/features/app-shell/components/page-layout";
import { admitIpdStay } from "@/features/clinical-ipd/services/clinical-ipd.service";

export function IpdAdmitPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState("");
  const [clinic, setClinic] = useState("");
  const [bed, setBed] = useState("");
  const [clinician, setClinician] = useState("");
  const [complaint, setComplaint] = useState("");

  const admitMutation = useMutation({
    mutationFn: () =>
      admitIpdStay({
        customer,
        clinic,
        bed,
        clinician: Number(clinician),
        presenting_complaint: complaint,
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
          admitMutation.mutate();
        }}
      >
        <Input
          placeholder="Customer UUID"
          value={customer}
          onChange={(event) => setCustomer(event.target.value)}
          required
        />
        <Input
          placeholder="Clinic UUID"
          value={clinic}
          onChange={(event) => setClinic(event.target.value)}
          required
        />
        <Input
          placeholder="Bed UUID"
          value={bed}
          onChange={(event) => setBed(event.target.value)}
          required
        />
        <Input
          placeholder="Clinician user ID"
          value={clinician}
          onChange={(event) => setClinician(event.target.value)}
          required
        />
        <Textarea
          placeholder="Presenting complaint"
          value={complaint}
          onChange={(event) => setComplaint(event.target.value)}
        />
        {admitMutation.error ? (
          <p className="text-sm text-destructive">
            {admitMutation.error instanceof Error
              ? admitMutation.error.message
              : "Admission failed."}
          </p>
        ) : null}
        <Button type="submit" disabled={admitMutation.isPending}>
          Admit to ward
        </Button>
      </form>
    </ListPageLayout>
  );
}
