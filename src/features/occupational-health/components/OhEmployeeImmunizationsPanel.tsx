"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  administerOhImmDose,
  createOhImmAefi,
  createOhImmExemption,
  fetchOhImmLots,
  fetchOhImmPatient,
  fetchOhImmVaccines,
  issueOhImmCertificate,
  recordOhImmTitre,
  type OhImmDose,
  type OhImmStatus,
} from "@/features/occupational-health/services/immunisation.service";
import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  up_to_date: "Up to date",
  due: "Due",
  overdue: "Overdue",
  exempt: "Exempt",
  non_responder: "Non-responder",
};

type Props = {
  customerUuid: string;
  encounterUuid?: string | null;
  visitUuid?: string | null;
  compact?: boolean;
};

export function OhEmployeeImmunizationsPanel({
  customerUuid,
  encounterUuid,
  visitUuid,
  compact,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recordOpen, setRecordOpen] = useState(false);
  const [exemptionOpen, setExemptionOpen] = useState(false);
  const [titreOpen, setTitreOpen] = useState(false);

  const record = useQuery({
    queryKey: ["oh-imm-patient", customerUuid],
    queryFn: () => fetchOhImmPatient(customerUuid),
  });
  const vaccines = useQuery({
    queryKey: ["oh-imm-vaccines"],
    queryFn: fetchOhImmVaccines,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["oh-imm-patient", customerUuid] });
    void queryClient.invalidateQueries({ queryKey: ["oh-imm-due"] });
  };

  const administer = useMutation({
    mutationFn: administerOhImmDose,
    onSuccess: (result) => {
      invalidate();
      setRecordOpen(false);
      toast({
        variant: "success",
        title: "Dose recorded",
        description:
          result.warnings.length > 0
            ? result.warnings.join(" ")
            : `${result.dose.vaccine_name ?? result.dose.vaccine_code} saved.`,
      });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not record dose",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  const exemption = useMutation({
    mutationFn: createOhImmExemption,
    onSuccess: () => {
      invalidate();
      setExemptionOpen(false);
      toast({ variant: "success", title: "Exemption saved" });
    },
    onError: (error) =>
      toast({
        variant: "error",
        title: "Could not save exemption",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });

  const aefi = useMutation({
    mutationFn: createOhImmAefi,
    onSuccess: () => {
      invalidate();
      toast({ variant: "success", title: "Reaction recorded" });
    },
  });

  const nextDue = useMemo(() => {
    const statuses = record.data?.statuses ?? [];
    return statuses
      .filter((s) => s.status === "due" || s.status === "overdue")
      .sort((a, b) => (a.next_due_date ?? "").localeCompare(b.next_due_date ?? ""))[0];
  }, [record.data?.statuses]);

  if (record.isLoading) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-dash-muted" data-testid="oh-employee-immunizations">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading immunizations…
      </p>
    );
  }

  const statuses = record.data?.statuses ?? [];
  const doses = record.data?.doses ?? [];

  return (
    <div className="space-y-4" data-testid="oh-employee-immunizations">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-medium text-brand-navy">Immunizations</h3>
          <p className="text-[13px] text-dash-muted">
            {nextDue
              ? `Next: ${nextDue.vaccine_name ?? nextDue.vaccine_code} (${STATUS_LABEL[nextDue.status] ?? nextDue.status})`
              : "No doses due right now."}
          </p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton type="button" onClick={() => setTitreOpen(true)}>
            Record titre
          </SecondaryButton>
          <SecondaryButton
            type="button"
            onClick={async () => {
              try {
                const cert = await issueOhImmCertificate(customerUuid);
                window.open(
                  BFF_OCCUPATIONAL_HEALTH_ROUTES.ohImmCertificatePrint(cert.uuid),
                  "_blank",
                  "noopener,noreferrer",
                );
                toast({
                  variant: "success",
                  title: "Certificate ready",
                  description: "Print view opened with verification QR.",
                });
              } catch (error) {
                toast({
                  variant: "error",
                  title: "Could not issue certificate",
                  description: error instanceof Error ? error.message : "Try again.",
                });
              }
            }}
          >
            Vaccination certificate
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setExemptionOpen(true)}>
            Decline / exempt
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => setRecordOpen(true)}>
            Record dose
          </PrimaryButton>
        </div>
      </div>

      {statuses.length === 0 && doses.length === 0 ? (
        <div className="rounded-md border border-dashed border-dash-border px-4 py-6 text-center">
          <p className="text-[13px] font-medium text-brand-navy">No immunization record yet</p>
          <p className="mt-1 text-[13px] text-dash-muted">
            Record a dose or an exemption to start this employee&apos;s history.
          </p>
        </div>
      ) : (
        <>
          {!compact && statuses.length > 0 ? (
            <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
              {statuses.map((status) => (
                <StatusRow key={status.uuid} status={status} />
              ))}
            </ul>
          ) : null}
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {doses.map((dose) => (
              <DoseRow
                key={dose.uuid}
                dose={dose}
                onAefi={() =>
                  aefi.mutate({
                    customer_uuid: customerUuid,
                    immunisation_uuid: dose.uuid,
                    severity: "mild",
                    description: "Reaction reported after dose",
                  })
                }
              />
            ))}
          </ul>
        </>
      )}

      {recordOpen ? (
        <RecordDoseForm
          customerUuid={customerUuid}
          encounterUuid={encounterUuid}
          visitUuid={visitUuid}
          vaccines={vaccines.data ?? []}
          preferVaccineUuid={nextDue?.vaccine_uuid ?? null}
          preferDoseNumber={
            nextDue ? (nextDue.doses_received ?? 0) + 1 : 1
          }
          pending={administer.isPending}
          onClose={() => setRecordOpen(false)}
          onSubmit={(payload) => administer.mutate(payload)}
        />
      ) : null}
      {titreOpen ? (
        <TitreForm
          vaccines={vaccines.data ?? []}
          pending={false}
          onClose={() => setTitreOpen(false)}
          onSubmit={async (payload) => {
            try {
              await recordOhImmTitre({ ...payload, customer_uuid: customerUuid });
              invalidate();
              setTitreOpen(false);
              toast({ variant: "success", title: "Titre saved" });
            } catch (error) {
              toast({
                variant: "error",
                title: "Could not save titre",
                description: error instanceof Error ? error.message : "Try again.",
              });
            }
          }}
        />
      ) : null}
      {exemptionOpen ? (
        <ExemptionForm
          customerUuid={customerUuid}
          vaccines={vaccines.data ?? []}
          pending={exemption.isPending}
          onClose={() => setExemptionOpen(false)}
          onSubmit={(payload) => exemption.mutate(payload)}
        />
      ) : null}
    </div>
  );
}

function StatusRow({ status }: { status: OhImmStatus }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div>
        <p className="text-[13px] font-medium text-brand-navy">
          {status.vaccine_name ?? status.vaccine_code}
        </p>
        <p className="text-[13px] text-dash-muted">
          {status.doses_received}
          {status.doses_required != null ? `/${status.doses_required}` : ""} doses
          {status.next_due_date ? ` · next ${status.next_due_date}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[12px] font-medium",
          status.status === "overdue"
            ? "bg-red-50 text-red-700"
            : status.status === "due"
              ? "bg-amber-50 text-amber-800"
              : status.status === "up_to_date"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-dash-tint text-dash-muted",
        )}
      >
        {STATUS_LABEL[status.status] ?? status.status}
      </span>
    </li>
  );
}

function DoseRow({ dose, onAefi }: { dose: OhImmDose; onAefi: () => void }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div>
        <p className="text-[13px] font-medium text-brand-navy">
          {dose.vaccine_name ?? dose.vaccine_code}
          {dose.dose_number ? ` · dose ${dose.dose_number}` : ""}
        </p>
        <p className="text-[13px] text-dash-muted">
          {dose.administered_at?.slice(0, 10) ?? "—"}
          {dose.lot_number ? ` · lot ${dose.lot_number}` : ""}
          {dose.given_by_name ? ` · ${dose.given_by_name}` : ""}
          {dose.source !== "administered" ? ` · ${dose.source.replace("_", " ")}` : ""}
        </p>
      </div>
      <SecondaryButton type="button" onClick={onAefi}>
        Log reaction
      </SecondaryButton>
    </li>
  );
}

function RecordDoseForm({
  customerUuid,
  encounterUuid,
  visitUuid,
  vaccines,
  preferVaccineUuid,
  preferDoseNumber,
  pending,
  onClose,
  onSubmit,
}: {
  customerUuid: string;
  encounterUuid?: string | null;
  visitUuid?: string | null;
  vaccines: Array<{ uuid: string; code: string; name: string; route: string; site: string }>;
  preferVaccineUuid: string | null;
  preferDoseNumber: number;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [vaccineUuid, setVaccineUuid] = useState(
    preferVaccineUuid ?? vaccines[0]?.uuid ?? "",
  );
  const [lotUuid, setLotUuid] = useState("");
  const [doseNumber, setDoseNumber] = useState(String(preferDoseNumber || 1));
  const [source, setSource] = useState("administered");
  const [givenBy, setGivenBy] = useState("");
  const [allowExpired, setAllowExpired] = useState(false);

  const lots = useQuery({
    queryKey: ["oh-imm-lots", vaccineUuid],
    queryFn: () => fetchOhImmLots(vaccineUuid),
    enabled: Boolean(vaccineUuid),
  });

  const preferredLot = useMemo(() => {
    const usable = (lots.data ?? []).filter(
      (l) => !l.recalled && !l.expired && l.quantity_on_hand > 0,
    );
    return usable[0]?.uuid ?? "";
  }, [lots.data]);

  // smart default lot
  const effectiveLot = lotUuid || preferredLot;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="flex h-full w-full max-w-md flex-col gap-3 overflow-y-auto border-l border-dash-border bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-navy">Record dose</h2>
          <SecondaryButton type="button" onClick={onClose}>
            Close
          </SecondaryButton>
        </div>
        <div className="space-y-1.5">
          <Label>Vaccine</Label>
          <select
            className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
            value={vaccineUuid}
            onChange={(e) => {
              setVaccineUuid(e.target.value);
              setLotUuid("");
            }}
          >
            {vaccines.map((v) => (
              <option key={v.uuid} value={v.uuid}>
                {v.name} ({v.code})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Lot (earliest expiry first)</Label>
          <select
            className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
            value={effectiveLot}
            onChange={(e) => setLotUuid(e.target.value)}
          >
            <option value="">No lot / not known</option>
            {(lots.data ?? []).map((lot) => (
              <option key={lot.uuid} value={lot.uuid}>
                {lot.lot_number}
                {lot.expiry_date ? ` · exp ${lot.expiry_date}` : ""}
                {lot.warning ? ` · ${lot.warning}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Dose number</Label>
          <Input
            type="number"
            min={1}
            value={doseNumber}
            onChange={(e) => setDoseNumber(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>How was it given?</Label>
          <select
            className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="administered">Given here</option>
            <option value="transcribed">Copied from record</option>
            <option value="self_reported">Self-reported</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Given by</Label>
          <Input value={givenBy} onChange={(e) => setGivenBy(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-dash-muted">
          <input
            type="checkbox"
            checked={allowExpired}
            onChange={(e) => setAllowExpired(e.target.checked)}
          />
          Allow expired lot (override)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={pending || !vaccineUuid}
            onClick={() =>
              onSubmit({
                customer_uuid: customerUuid,
                vaccine_uuid: vaccineUuid,
                lot_uuid: effectiveLot || null,
                dose_number: Number(doseNumber) || 1,
                source,
                given_by_name: givenBy.trim(),
                encounter_uuid: encounterUuid || null,
                visit_uuid: visitUuid || null,
                allow_expired_lot: allowExpired,
              })
            }
          >
            {pending ? "Saving…" : "Save dose"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function ExemptionForm({
  customerUuid,
  vaccines,
  pending,
  onClose,
  onSubmit,
}: {
  customerUuid: string;
  vaccines: Array<{ uuid: string; code: string; name: string }>;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [vaccineUuid, setVaccineUuid] = useState(vaccines[0]?.uuid ?? "");
  const [kind, setKind] = useState("decline");
  const [reason, setReason] = useState("");
  const [signedBy, setSignedBy] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <button type="button" className="flex-1" aria-label="Close" onClick={onClose} />
      <div className="flex h-full w-full max-w-md flex-col gap-3 overflow-y-auto border-l border-dash-border bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-brand-navy">Decline or exemption</h2>
        <div className="space-y-1.5">
          <Label>Vaccine</Label>
          <select
            className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
            value={vaccineUuid}
            onChange={(e) => setVaccineUuid(e.target.value)}
          >
            {vaccines.map((v) => (
              <option key={v.uuid} value={v.uuid}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <select
            className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="decline">Declined</option>
            <option value="exemption">Medical exemption</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Waiver signed by</Label>
          <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={pending || !reason.trim()}
            onClick={() =>
              onSubmit({
                customer_uuid: customerUuid,
                vaccine_uuid: vaccineUuid || null,
                kind,
                reason: reason.trim(),
                waiver_signed: Boolean(signedBy.trim()),
                waiver_signed_by: signedBy.trim(),
              })
            }
          >
            Save
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}


function TitreForm({
  vaccines,
  pending,
  onClose,
  onSubmit,
}: {
  vaccines: Array<{ uuid: string; code: string; name: string }>;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [vaccineUuid, setVaccineUuid] = useState(vaccines[0]?.uuid ?? "");
  const [value, setValue] = useState("");
  const [threshold, setThreshold] = useState("10");
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-3 rounded-md border border-dash-border bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-navy">Record titre result</h2>
          <button type="button" className="text-[13px] text-dash-muted" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="space-y-1.5">
          <Label>Vaccine</Label>
          <select
            className="h-9 w-full rounded-md border border-dash-border bg-white px-3 text-[13px]"
            value={vaccineUuid}
            onChange={(e) => setVaccineUuid(e.target.value)}
          >
            {vaccines.map((v) => (
              <option key={v.uuid} value={v.uuid}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Value</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Threshold</Label>
            <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
        </div>
        <p className="text-[12px] text-dash-muted">
          Below threshold marks the employee as a non-responder and sets a repeat series due.
        </p>
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={pending || !vaccineUuid || value === ""}
            onClick={() =>
              onSubmit({
                vaccine_uuid: vaccineUuid,
                value: Number(value),
                threshold: Number(threshold),
                source: "manual",
              })
            }
          >
            Save titre
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
