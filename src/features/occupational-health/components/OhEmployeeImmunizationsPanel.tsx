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
  downloadOhImmCertificatePdf,
  issueOhImmCertificate,
  recordOhImmTitre,
  fetchOhImmPatientRisk,
  fetchOhImmPatientControls,
  fetchOhImmPatientNrFlags,
  decideOhImmNrCase,
  fetchOhImmPatientExposures,
  type OhImmExposure,
  type OhImmDose,
  type OhImmStatus,
} from "@/features/occupational-health/services/immunisation.service";
import { BFF_OCCUPATIONAL_HEALTH_ROUTES } from "@/constants/api";
import { OhCopilotResult } from "@/features/occupational-health/components/OhCopilotResult";
import { draftRecall, explainCatchUp, type CopilotResponse } from "@/features/occupational-health/services/visit-copilot.service";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  up_to_date: "Up to date",
  due: "Due",
  overdue: "Overdue",
  exempt: "Exempt",
  non_responder: "Non-responder",
  true_non_responder: "True non-responder",
  second_series: "Second series",
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
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recordOpen, setRecordOpen] = useState(false);
  const [exemptionOpen, setExemptionOpen] = useState(false);
  const [titreOpen, setTitreOpen] = useState(false);
  const [copilot, setCopilot] = useState<{ title: string; pending: boolean; error: string; result: CopilotResponse | null } | null>(null);

  async function openCopilot(title: string, work: () => Promise<CopilotResponse>) {
    setCopilot({ title, pending: true, error: "", result: null });
    try {
      setCopilot({ title, pending: false, error: "", result: await work() });
    } catch (caught) {
      setCopilot({ title, pending: false, error: caught instanceof Error ? caught.message : "Could not draft that.", result: null });
    }
  }

  const record = useQuery({
    queryKey: ["oh-imm-patient", customerUuid],
    queryFn: () => fetchOhImmPatient(customerUuid),
  });
  const vaccines = useQuery({
    queryKey: ["oh-imm-vaccines"],
    queryFn: fetchOhImmVaccines,
  });
  const risk = useQuery({
    queryKey: ["oh-imm-patient-risk", customerUuid],
    queryFn: () => fetchOhImmPatientRisk(customerUuid),
  });
  const applicableControls = useQuery({
    queryKey: ["oh-imm-patient-controls", customerUuid],
    queryFn: () => fetchOhImmPatientControls(customerUuid),
    enabled: Boolean(customerUuid),
  });
  const nrFlags = useQuery({
    queryKey: ["oh-imm-patient-nr", customerUuid],
    queryFn: () => fetchOhImmPatientNrFlags(customerUuid),
  });
  const openExposures = useQuery({
    queryKey: ["oh-imm-patient-exposures", customerUuid],
    queryFn: () => fetchOhImmPatientExposures(customerUuid),
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
            data-testid="oh-imm-download-pdf"
            onClick={async () => {
              try {
                const cert = await issueOhImmCertificate(customerUuid);
                const { blob, filename } = await downloadOhImmCertificatePdf(cert.uuid);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                toast({
                  variant: "success",
                  title: "PDF downloaded",
                  description: "Vaccination certificate ready.",
                });
              } catch (error) {
                toast({
                  variant: "error",
                  title: "Could not download PDF",
                  description: error instanceof Error ? error.message : "Try again.",
                });
              }
            }}
          >
            Download PDF
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
              } catch (error) {
                toast({
                  variant: "error",
                  title: "Could not open print view",
                  description: error instanceof Error ? error.message : "Try again.",
                });
              }
            }}
          >
            Print view
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => setExemptionOpen(true)}>
            Decline / exempt
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => setRecordOpen(true)}>
            Record dose
          </PrimaryButton>
        </div>
      </div>

            {(openExposures.data ?? []).length > 0 ? (
        <div className="mb-3 space-y-1 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          <div className="font-semibold text-amber-950">Open exposure</div>
          {(openExposures.data as OhImmExposure[]).map((ex) => (
            <div key={ex.uuid} className="text-amber-900">
              <span className="font-medium">{ex.exposure_type}</span>
              {" · "}
              {(ex.clocks ?? [])
                .filter((c) => c.status !== "done")
                .map((c) => {
                  const sec = c.seconds_remaining ?? 0;
                  const overdue = sec < 0;
                  const abs = Math.abs(sec);
                  const h = Math.floor(abs / 3600);
                  const m = Math.floor((abs % 3600) / 60);
                  const clock = h > 0 ? `${h}h ${m}m` : `${m}m`;
                  return `${c.label}: ${overdue ? clock + " overdue" : clock + " left"}`;
                })
                .join(" · ") || "clocks clear"}
              {ex.rca_uuid ? ` · RCA ${ex.rca_uuid.slice(0, 8)}` : ""}
            </div>
          ))}
        </div>
      ) : null}

{(nrFlags.data?.hbig_fast_track || nrFlags.data?.true_non_responder) ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {nrFlags.data?.hbig_fast_track ? (
            <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
              HBIG fast-track
            </span>
          ) : null}
          {nrFlags.data?.true_non_responder ? (
            <span className="rounded bg-red-100 px-2 py-0.5 font-medium text-red-900">
              True non-responder
            </span>
          ) : null}
        </div>
      ) : null}

      {risk.data && (risk.data.tasks.length > 0 || risk.data.required_vaccines.length > 0) ? (
        <div className="mb-4 space-y-1 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-baseline gap-2 text-sm">
            <span className="font-semibold text-primary">Risk profile</span>
            <span className="text-muted-foreground">
              Score {risk.data.score} ({risk.data.band})
            </span>
          </div>
          {risk.data.tasks.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Tasks: {risk.data.tasks.map((x) => x.name).join(", ")}
            </p>
          ) : null}
          {risk.data.required_vaccines.length > 0 ? (
            <p className="text-sm">
              Required from risk:{" "}
              {risk.data.required_vaccines
                .map((v) => `${v.vaccine_code || v.schedule_code}${v.titre_required ? " (titre)" : ""}`)
                .join(", ")}
            </p>
          ) : null}
          {risk.data.required_controls.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Controls: {risk.data.required_controls.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {Array.isArray(applicableControls.data) && applicableControls.data.length > 0 ? (
        <div className="mb-4 space-y-1 border-b border-border/60 pb-3">
          <div className="text-sm font-semibold text-primary">Applicable controls</div>
          <ul className="text-sm">
            {(applicableControls.data as Array<Record<string, unknown>>).map((c, i) => (
              <li key={String(c.uuid ?? i)} className="text-muted-foreground">
                <span className="font-medium text-foreground">{String(c.level ?? "")}</span>
                {" · "}
                {String(c.name ?? c.code ?? "Control")}
                {c.requires_fit_test ? " · fit-test required" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {nrFlags.data?.cases?.length ? (
        <div className="mb-4 space-y-2">
          {(nrFlags.data.cases as Array<Record<string, unknown>>).map((c) => (
            <div key={String(c.uuid)} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-mono text-xs">{String(c.vaccine_code)}</span>
              <span>{STATUS_LABEL[String(c.status)] ?? String(c.status)}</span>
              <span className="text-muted-foreground">
                fails {String(c.titre_fail_count)} · series {String(c.series_attempt)}
              </span>
              {c.status === "true_non_responder" && c.decision === "pending" ? (
                <>
                  <SecondaryButton
                    type="button"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      void decideOhImmNrCase(String(c.uuid), {
                        decision: "ppe_plan",
                        reviewer_name: "OH clinician",
                        decision_notes: "Tailored PPE plan recorded",
                      }).then(() => {
                        void queryClient.invalidateQueries({ queryKey: ["oh-imm-patient-nr", customerUuid] });
                      })
                    }
                  >
                    Record PPE plan
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      void decideOhImmNrCase(String(c.uuid), {
                        decision: "role_change",
                        reviewer_name: "OH clinician",
                        decision_notes: "Role reassignment recommended",
                      }).then(() => {
                        void queryClient.invalidateQueries({ queryKey: ["oh-imm-patient-nr", customerUuid] });
                      })
                    }
                  >
                    Recommend role change
                  </SecondaryButton>
                </>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {statuses.length === 0 && doses.length === 0 ? (
        <div className="rounded-md border border-dashed border-dash-border px-4 py-6 text-center">
          <p className="text-[13px] font-medium text-brand-navy">No immunization record yet</p>
          <p className="mt-1 text-[13px] text-dash-muted">
            Record a dose or an exemption to start this employee&apos;s history.
          </p>
        </div>
      ) : (
        <>
          {statuses.length > 0 ? (
            <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
              {statuses.map((status) => (
                <StatusRow
                  key={status.uuid}
                  status={status}
                  onExplain={() => void openCopilot(`${status.vaccine_code} catch-up`, () => explainCatchUp(customerUuid, status.vaccine_code))}
                  onRecall={
                    status.status === "overdue" || status.status === "non_responder"
                      ? () =>
                          void openCopilot(`${status.vaccine_code} recall`, () =>
                            draftRecall({
                              customer_uuid: customerUuid,
                              kind: status.status === "non_responder" ? "non_responder" : "overdue",
                              vaccine_code: status.vaccine_code,
                            }),
                          )
                      : undefined
                  }
                />
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
      {copilot ? (
        <div className="rounded-md border border-dash-border bg-white p-4" data-testid="oh-imm-copilot">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-brand-navy">{copilot.title}</p>
            <SecondaryButton type="button" className="h-8" onClick={() => setCopilot(null)}>
              Close
            </SecondaryButton>
          </div>
          {copilot.pending ? <p className="text-[13px] text-dash-muted">Drafting…</p> : null}
          {copilot.error ? <p className="text-[13px] text-red-700">{copilot.error}</p> : null}
          {copilot.result ? <OhCopilotResult result={copilot.result} /> : null}
        </div>
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

function StatusRow({
  status,
  onExplain,
  onRecall,
}: {
  status: OhImmStatus;
  onExplain: () => void;
  onRecall?: () => void;
}) {
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
        {status.hbig_fast_track ? " · HBIG" : ""}
        {status.series_attempt && status.series_attempt > 1
          ? ` · series ${status.series_attempt}`
          : ""}
      </span>
      <span className="flex gap-2">
        <SecondaryButton type="button" className="h-8" onClick={onExplain}>
          Explain
        </SecondaryButton>
        {onRecall ? (
          <SecondaryButton type="button" className="h-8" onClick={onRecall}>
            Draft recall
          </SecondaryButton>
        ) : null}
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
