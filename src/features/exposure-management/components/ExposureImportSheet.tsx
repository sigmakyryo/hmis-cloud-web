"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { PrimaryButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import type { ImportResult } from "@/features/exposure-management/exposure.types";
import { errorMessage } from "@/features/exposure-management/lib/exposure-format";
import { exposureKeys, previewImport, runImport } from "@/features/exposure-management/services/exposure.service";

const TEMPLATE = "group_code,agent_code,sampled_at,duration_minutes,result_value,result_unit,sample_type,below_lod,lod_value,lab_ref\n";

/** Paste or upload a CSV, preview every row, and import only when all rows are valid. */
export function ExposureImportSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState("");

  const preview = useMutation({
    mutationFn: () => previewImport(csv),
    onSuccess: (data) => { setResult(data); setMessage(""); },
    onError: (e) => setMessage(errorMessage(e, "Could not read the file.")),
  });
  const commit = useMutation({
    mutationFn: () => runImport(csv),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: exposureKeys.all });
      setResult(data);
      setMessage(`Imported ${data.imported} results.`);
    },
    onError: (e) => setMessage(errorMessage(e, "Import failed. Nothing was saved.")),
  });
  const badRows = result?.rows.filter((r) => !r.ok) ?? [];

  return (
    <Drawer title="Import results" description="All rows are checked first. If any row is invalid, nothing is imported." onClose={onClose} wide>
      <p className="text-[12px] text-dash-muted">Columns: <code>{TEMPLATE.trim()}</code></p>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="CSV file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) { setCsv(await file.text()); setResult(null); }
        }}
      />
      <Textarea aria-label="CSV text" rows={8} value={csv} placeholder={TEMPLATE} onChange={(e) => { setCsv(e.target.value); setResult(null); }} />
      {result ? (
        <div className="space-y-1 text-[13px]">
          <p className={result.valid ? "text-emerald-700" : "text-red-700"}>
            {result.valid ? `${result.rows.length} rows are valid.` : `${badRows.length} of ${result.rows.length} rows have problems.`}
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {badRows.map((row) => <li key={row.row} className="text-red-700">Row {row.row}: {row.errors.join("; ")}</li>)}
          </ul>
        </div>
      ) : null}
      {message ? <p role="status" className="text-[13px] text-brand-slate">{message}</p> : null}
      <DrawerActions>
        <SecondaryButton type="button" onClick={onClose}>Close</SecondaryButton>
        <SecondaryButton type="button" disabled={!csv.trim() || preview.isPending} onClick={() => preview.mutate()}>Check rows</SecondaryButton>
        <PrimaryButton type="button" disabled={!result?.valid || commit.isPending || result.imported > 0} onClick={() => commit.mutate()}>Import</PrimaryButton>
      </DrawerActions>
    </Drawer>
  );
}
