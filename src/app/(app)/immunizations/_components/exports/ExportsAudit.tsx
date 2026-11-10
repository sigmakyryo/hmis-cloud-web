"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/providers/toast-provider";
import { QuietLoading } from "../shared/QuietLoading";
import { CertificatePdfForm } from "../shared/CertificatePdfForm";
import { EmptyAction } from "../shared/EmptyAction";
import {
  type OhImmSchedule,
  createOhImmDhisMapping,
  downloadOhImmDhisCsv,
  downloadOhImmFhirNdjson,
  exportOhImmPack,
  fetchOhImmAudits,
  fetchOhImmDhisMappings,
  importOhImmPack,
} from "@/features/occupational-health/services/immunisation.service";

export function ExportsAudit({ schedules }: { schedules: OhImmSchedule[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audits = useQuery({
    queryKey: ["oh-imm-audits"],
    queryFn: () => fetchOhImmAudits({ limit: 50 }),
  });
  const mappings = useQuery({
    queryKey: ["oh-imm-dhis-mappings"],
    queryFn: fetchOhImmDhisMappings,
  });
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [orgUnit, setOrgUnit] = useState("OU");
  const [packJson, setPackJson] = useState("");
  const [deCode, setDeCode] = useState("");
  const [deVaccine, setDeVaccine] = useState("");
  const [deId, setDeId] = useState("");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">Exports</p>
        <p className="text-[13px] text-dash-muted">
          Read-only FHIR immunizations and DHIS2 aggregates for this facility.
        </p>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton
            type="button"
            onClick={async () => {
              try {
                const { blob, filename } = await downloadOhImmFhirNdjson();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              } catch (error) {
                toast({
                  variant: "error",
                  title: "FHIR export failed",
                  description: error instanceof Error ? error.message : "Try again.",
                });
              }
            }}
          >
            Download FHIR NDJSON
          </SecondaryButton>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[12px]">Period (YYYYMM)</Label>
              <Input className="h-8 w-28" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Org unit</Label>
              <Input className="h-8 w-28" value={orgUnit} onChange={(e) => setOrgUnit(e.target.value)} />
            </div>
            <SecondaryButton
              type="button"
              onClick={async () => {
                try {
                  const { blob, filename } = await downloadOhImmDhisCsv(period, orgUnit);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  toast({
                    variant: "error",
                    title: "DHIS2 export failed",
                    description: error instanceof Error ? error.message : "Try again.",
                  });
                }
              }}
            >
              Download DHIS2 CSV
            </SecondaryButton>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">Vaccination certificate PDF</p>
        <p className="text-[13px] text-dash-muted">
          Issue and download an A4 PDF for an employee (also available on their immunizations tab).
        </p>
        <CertificatePdfForm />
      </section>

      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">DHIS2 data element mapping</p>
        <div className="flex flex-wrap gap-2">
          <Input className="h-8 w-28" placeholder="Vaccine" value={deVaccine} onChange={(e) => setDeVaccine(e.target.value)} />
          <Input className="h-8 w-36" placeholder="Data element id" value={deId} onChange={(e) => setDeId(e.target.value)} />
          <Input className="h-8 w-40" placeholder="Label" value={deCode} onChange={(e) => setDeCode(e.target.value)} />
          <PrimaryButton
            type="button"
            disabled={!deVaccine.trim() || !deId.trim()}
            onClick={async () => {
              try {
                await createOhImmDhisMapping({
                  vaccine_code: deVaccine.trim(),
                  data_element_id: deId.trim(),
                  label: deCode.trim(),
                  age_band: "18+",
                  sex: "",
                });
                setDeVaccine("");
                setDeId("");
                setDeCode("");
                void queryClient.invalidateQueries({ queryKey: ["oh-imm-dhis-mappings"] });
                toast({ variant: "success", title: "Mapping saved" });
              } catch (error) {
                toast({
                  variant: "error",
                  title: "Could not save mapping",
                  description: error instanceof Error ? error.message : "Try again.",
                });
              }
            }}
          >
            Add mapping
          </PrimaryButton>
        </div>
        {mappings.isLoading ? (
          <QuietLoading />
        ) : (mappings.data ?? []).length === 0 ? (
          <EmptyAction title="No mappings yet" description="Add vaccine → data element pairs for DHIS2 exports." />
        ) : (
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {(mappings.data ?? []).map((m) => (
              <li key={String(m.uuid)} className="flex justify-between gap-2 px-4 py-2 text-[13px]">
                <span className="font-medium text-brand-navy">{String(m.vaccine_code)}</span>
                <span className="text-dash-muted">{String(m.data_element_id)} · {String(m.label || m.age_band || "")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">Schedule packs</p>
        <p className="text-[13px] text-dash-muted">
          Import never overwrites an edited schedule — it publishes a new version. Example packs stay labelled as examples.
        </p>
        <div className="flex flex-wrap gap-2">
          {(schedules ?? []).slice(0, 6).map((s) => (
            <SecondaryButton
              key={s.uuid}
              type="button"
              onClick={async () => {
                try {
                  const pack = await exportOhImmPack(s.uuid);
                  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${s.code || "schedule"}-pack.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  toast({
                    variant: "error",
                    title: "Pack export failed",
                    description: error instanceof Error ? error.message : "Try again.",
                  });
                }
              }}
            >
              Export {s.name}
            </SecondaryButton>
          ))}
        </div>
        <textarea
          className="min-h-28 w-full rounded-md border border-dash-border p-2 text-[13px]"
          placeholder="Paste pack JSON to import…"
          value={packJson}
          onChange={(e) => setPackJson(e.target.value)}
        />
        <PrimaryButton
          type="button"
          disabled={!packJson.trim()}
          onClick={async () => {
            try {
              const pack = JSON.parse(packJson) as Record<string, unknown>;
              const result = await importOhImmPack(pack);
              void queryClient.invalidateQueries({ queryKey: ["oh-imm-schedules"] });
              void queryClient.invalidateQueries({ queryKey: ["oh-imm-audits"] });
              setPackJson("");
              toast({
                variant: "success",
                title: "Pack installed",
                description: String(result.notes || result.status || "Done"),
              });
            } catch (error) {
              toast({
                variant: "error",
                title: "Pack import failed",
                description: error instanceof Error ? error.message : "Check JSON and try again.",
              });
            }
          }}
        >
          Import pack
        </PrimaryButton>
      </section>

      <section className="space-y-2">
        <p className="text-[13px] font-medium text-brand-navy">Audit trail</p>
        <p className="text-[13px] text-dash-muted">Who changed what — codes and status only, no patient names.</p>
        {audits.isLoading ? (
          <QuietLoading />
        ) : (audits.data ?? []).length === 0 ? (
          <EmptyAction title="No audit rows yet" description="Catalog, dose, certificate, and export actions appear here." />
        ) : (
          <ul className="divide-y divide-dash-border rounded-md border border-dash-border bg-white">
            {(audits.data ?? []).map((row) => (
              <li key={String(row.uuid)} className="px-4 py-2.5 text-[13px]">
                <p className="font-medium text-brand-navy">
                  {String(row.entity_type)} · {String(row.action)}
                </p>
                <p className="text-dash-muted">
                  {String(row.summary || "")}
                  {row.occurred_at ? ` · ${String(row.occurred_at)}` : ""}
                  {row.actor_name ? ` · ${String(row.actor_name)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

