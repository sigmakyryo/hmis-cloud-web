"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SecondaryButton } from "@/components/ui/app-buttons";
import { CheckField, Field } from "@/app/(app)/immunizations/_components/shared/Field";
import { ImmPrimaryCell, ImmRecordTable, ImmStatusBadge } from "@/app/(app)/immunizations/_components/shared/ImmRecordTable";
import { ImmNotice } from "@/app/(app)/immunizations/_components/shared/ImmTabsBar";
import { LoadError, QuietLoading } from "@/app/(app)/immunizations/_components/shared/QuietLoading";
import { DaCell, DaRow } from "@/app/(app)/drug-alcohol/_components/shared/da-ui";
import {
  fetchIntegrationCatalogue,
  importDeviceResults,
  importRoster,
  ohExportCsvUrl,
  ohTemplateCsvUrl,
  type OhImportResult,
} from "@/features/occupational-health/services/oh-ext.service";
import { useToast } from "@/providers/toast-provider";
import { errorText } from "../shared/fit-format";

type ImportKind = "roster" | "hearing" | "lung";

const IMPORT_LABEL: Record<ImportKind, string> = {
  roster: "HR roster (employment)",
  hearing: "Audiometer results (hearing)",
  lung: "Spirometer results (lung function)",
};

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function ImportResultTable({ result }: { result: OhImportResult }) {
  return (
    <div className="space-y-2" data-testid="oh-import-result">
      <ImmNotice tone={result.summary.error ? "warning" : "default"}>
        {result.dry_run ? "Check only — nothing was saved. " : "Saved. "}
        {Object.entries(result.summary)
          .map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`)
          .join(", ")}
      </ImmNotice>
      <ImmRecordTable columns={["Line", "Worker", "Result", "Details"]}>
        {result.rows.map((r) => (
          <DaRow key={r.line} testId="oh-import-row">
            <DaCell first>{r.line}</DaCell>
            <DaCell>
              <ImmPrimaryCell title={r.employee_number || r.customer_uuid || "—"} detail={r.employee_number ? r.customer_uuid : undefined} />
            </DaCell>
            <DaCell>
              <ImmStatusBadge status={r.action === "error" ? "fail" : "cleared"} label={r.action.replace(/_/g, " ")} />
            </DaCell>
            <DaCell>{r.errors?.join(" ") || r.changes?.join(", ") || r.outcome || ""}</DaCell>
          </DaRow>
        ))}
      </ImmRecordTable>
    </div>
  );
}

export function OhDataExchange() {
  const { toast } = useToast();
  const catalogue = useQuery({ queryKey: ["oh-int", "catalogue"], queryFn: fetchIntegrationCatalogue, retry: false });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<ImportKind>("roster");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [createTitles, setCreateTitles] = useState(false);
  const [result, setResult] = useState<OhImportResult | null>(null);

  const run = useMutation({
    mutationFn: (dryRun: boolean) =>
      kind === "roster"
        ? importRoster({ csv, dry_run: dryRun, create_job_titles: createTitles })
        : importDeviceResults({ program: kind, csv, dry_run: dryRun }),
    onSuccess: (data) => {
      setResult(data);
      if (!data.dry_run) toast({ variant: "success", title: "Import saved" });
    },
    onError: (error) => toast({ variant: "error", title: "Import failed", description: errorText(error) }),
  });

  async function pickFile(file: File | undefined) {
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    setCsv(await readText(file));
  }

  return (
    <div className="space-y-6" data-testid="oh-data-exchange">
      <section className="space-y-3">
        <h3 className="text-[14px] font-semibold text-brand-ink">Exports</h3>
        <p className="text-[13px] text-brand-slate">
          Identifiers, dates and statuses only — no diagnoses or results. Connected systems can pull the same data with the exports scope.
        </p>
        <div className="flex flex-wrap gap-3">
          <Field label="From" type="date" value={from} onChange={setFrom} />
          <Field label="To" type="date" value={to} onChange={setTo} />
        </div>
        {catalogue.isLoading ? <QuietLoading /> : null}
        {catalogue.isError ? <LoadError>{errorText(catalogue.error, "Could not load exports.")}</LoadError> : null}
        {catalogue.isSuccess ? (
          <ImmRecordTable columns={["Dataset", "Columns", "Download"]}>
            {catalogue.data.datasets.map((d) => (
              <DaRow key={d.code} testId="oh-export-row">
                <DaCell first>
                  <ImmPrimaryCell title={d.label} detail={d.code} />
                </DaCell>
                <DaCell>{d.columns.length} columns</DaCell>
                <DaCell actions>
                  <a className="text-[13px] font-medium text-brand-primary underline" href={ohExportCsvUrl(d.code, { from, to })}>
                    CSV
                  </a>
                </DaCell>
              </DaRow>
            ))}
          </ImmRecordTable>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-[14px] font-semibold text-brand-ink">Imports</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[13px] text-brand-slate">
            What are you importing?
            <select
              aria-label="Import type"
              className="rounded-md border border-brand-border px-2 py-1.5"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as ImportKind);
                setResult(null);
              }}
            >
              {(Object.keys(IMPORT_LABEL) as ImportKind[]).map((k) => (
                <option key={k} value={k}>
                  {IMPORT_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <a className="text-[13px] font-medium text-brand-primary underline" href={ohTemplateCsvUrl(kind)}>
            Download template
          </a>
        </div>
        <label className="flex flex-col gap-1 text-[13px] text-brand-slate">
          CSV file
          <input aria-label="CSV file" type="file" accept=".csv,text/csv" onChange={(e) => void pickFile(e.target.files?.[0])} />
        </label>
        {fileName ? <p className="text-[12px] text-brand-slate">{fileName}</p> : null}
        {kind === "roster" ? (
          <CheckField label="Create job titles that do not exist yet" checked={createTitles} onChange={setCreateTitles} />
        ) : null}
        <div className="flex gap-2">
          <SecondaryButton disabled={!csv || run.isPending} onClick={() => run.mutate(true)}>
            Check file
          </SecondaryButton>
          <SecondaryButton disabled={!csv || run.isPending || !result?.dry_run} onClick={() => run.mutate(false)}>
            Import
          </SecondaryButton>
        </div>
        {result ? <ImportResultTable result={result} /> : null}
      </section>
    </div>
  );
}
