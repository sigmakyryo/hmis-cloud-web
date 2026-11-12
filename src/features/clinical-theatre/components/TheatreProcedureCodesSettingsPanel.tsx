"use client";

import { useDeferredValue, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TheatreProcedureProductPicker } from "@/features/clinical-theatre/components/TheatreProcedureProductPicker";
import {
  useCreateTheatreProcedureCode,
  useImportTheatreProcedureCodes,
  useLoadTheatreProcedureCodeSample,
  useSetTheatreProductCodes,
  useTheatreProcedureCodes,
  useTheatreProductCodes,
  useUpdateTheatreProcedureCode,
} from "@/features/clinical-theatre/hooks/use-theatre-catalog";
import type {
  TheatreProcedureCode,
  TheatreProcedureCodeImportResult,
  TheatreProcedureCodeRef,
  TheatreProcedureCodeSystem,
  TheatreProcedureProduct,
} from "@/features/clinical-theatre/types/theatre-catalog.types";
import {
  PROCEDURE_CODE_SYSTEM_LABELS,
  PROCEDURE_CODE_SYSTEMS,
  formatProcedureCode,
} from "@/features/clinical-theatre/utils/theatre-catalog-display";
import { SettingsSection } from "@/features/settings/components/SettingsPageLayout";

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60";

function errorText(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Something went wrong.";
}

function ImportSummary({ result }: { result: TheatreProcedureCodeImportResult }) {
  return (
    <p className="text-xs text-muted-foreground" data-testid="theatre-code-import-result">
      {result.created} added · {result.updated} updated · {result.skipped} unchanged
      {result.error_count ? ` · ${result.error_count} rejected` : ""}
      {result.errors.length
        ? ` (${result.errors
            .slice(0, 3)
            .map((row) => `line ${row.line}: ${row.error}`)
            .join("; ")})`
        : ""}
    </p>
  );
}

function CodeRow({ code }: { code: TheatreProcedureCode }) {
  const update = useUpdateTheatreProcedureCode();
  const [description, setDescription] = useState(code.description);
  const dirty = description.trim() !== code.description;
  return (
    <tr className="border-t">
      <td className="py-1.5 pr-2 text-xs">{code.system_label}</td>
      <td className="py-1.5 pr-2 font-mono text-sm">{code.code}</td>
      <td className="py-1.5 pr-2">
        <Input
          aria-label={`Description of ${code.code}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </td>
      <td className="py-1.5 pr-2 text-right">
        {dirty ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={update.isPending}
            onClick={() =>
              update.mutate({ uuid: code.uuid, payload: { description: description.trim() } })
            }
          >
            Save
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={update.isPending}
          onClick={() =>
            update.mutate({ uuid: code.uuid, payload: { is_active: !code.is_active } })
          }
        >
          {code.is_active ? "Retire" : "Restore"}
        </Button>
      </td>
    </tr>
  );
}

function ImportCodes() {
  const importCodes = useImportTheatreProcedureCodes();
  const sample = useLoadTheatreProcedureCodeSample();
  const create = useCreateTheatreProcedureCode();
  const [system, setSystem] = useState<TheatreProcedureCodeSystem>("icd10pcs");
  const [content, setContent] = useState("");
  const [licence, setLicence] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const needsLicence = system === "cpt";
  const result = importCodes.data ?? sample.data;

  return (
    <div className="space-y-3 rounded-md border p-4" data-testid="theatre-code-import">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="code-import-system">Code system</Label>
          <select
            id="code-import-system"
            className={SELECT_CLASS}
            value={system}
            onChange={(event) => setSystem(event.target.value as TheatreProcedureCodeSystem)}
          >
            {PROCEDURE_CODE_SYSTEMS.map((value) => (
              <option key={value} value={value}>
                {PROCEDURE_CODE_SYSTEM_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="code-import-file">CSV file (code,description)</Label>
          <Input
            id="code-import-file"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) setContent(await file.text());
            }}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={sample.isPending}
          onClick={() => sample.mutate()}
        >
          Load ICD-10-PCS sample
        </Button>
      </div>
      <Textarea
        aria-label="Codes to import"
        rows={4}
        placeholder={"code,description\n0DTJ4ZZ,Resection of Appendix, Percutaneous Endoscopic Approach"}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      {needsLicence ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={licence}
            onChange={(event) => setLicence(event.target.checked)}
          />
          <span>
            We hold an AMA CPT licence covering this file. CPT is not bundled with the
            system; only licensed organisations may import it.
          </span>
        </label>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!content.trim() || importCodes.isPending || (needsLicence && !licence)}
          onClick={() =>
            importCodes.mutate(
              { system, content, licence_confirmed: licence },
              { onSuccess: () => setContent("") },
            )
          }
        >
          Import codes
        </Button>
        {result ? <ImportSummary result={result} /> : null}
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!code.trim()) return;
          create.mutate(
            { system, code: code.trim(), description: description.trim() },
            {
              onSuccess: () => {
                setCode("");
                setDescription("");
              },
            },
          );
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="code-add-code">Add one code</Label>
          <Input id="code-add-code" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="min-w-[16rem] flex-1 space-y-1">
          <Label htmlFor="code-add-description">Description</Label>
          <Input
            id="code-add-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={!code.trim() || create.isPending}>
          Add code
        </Button>
      </form>
      {importCodes.error || sample.error || create.error ? (
        <p className="text-sm text-red-600">
          {errorText(importCodes.error) ?? errorText(sample.error) ?? errorText(create.error)}
        </p>
      ) : null}
    </div>
  );
}

function ProductCodes() {
  const [product, setProduct] = useState<TheatreProcedureProduct | null>(null);
  const current = useTheatreProductCodes(product?.uuid ?? null);
  const setCodes = useSetTheatreProductCodes();
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search.trim());
  const options = useTheatreProcedureCodes({ q: deferred }, { enabled: deferred.length >= 2 });
  const codes: TheatreProcedureCodeRef[] = current.data ?? [];

  function save(next: Array<{ code: string; is_primary: boolean }>) {
    if (!product) return;
    setCodes.mutate({ productUuid: product.uuid, codes: next });
  }

  const asEntries = () =>
    codes.map((row) => ({ code: row.uuid ?? "", is_primary: row.is_primary }));

  return (
    <div className="space-y-3 rounded-md border p-4" data-testid="theatre-product-codes">
      <div className="space-y-1">
        <Label htmlFor="product-codes-procedure">Procedure product</Label>
        <TheatreProcedureProductPicker
          id="product-codes-procedure"
          value={product}
          onChange={setProduct}
        />
      </div>
      {product ? (
        <>
          {codes.length ? (
            <ul className="divide-y rounded-md border">
              {codes.map((row) => (
                <li key={row.uuid} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <span className="text-sm">
                    {formatProcedureCode(row)} — {row.description}
                    {row.is_primary ? (
                      <span className="ml-2 rounded bg-brand-navy/10 px-1.5 text-[11px] font-semibold uppercase text-brand-navy">
                        Primary
                      </span>
                    ) : null}
                  </span>
                  <span className="flex gap-1">
                    {!row.is_primary ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          save(
                            asEntries().map((entry) => ({
                              ...entry,
                              is_primary: entry.code === row.uuid,
                            })),
                          )
                        }
                      >
                        Make primary
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => save(asEntries().filter((entry) => entry.code !== row.uuid))}
                    >
                      Remove
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No codes on this procedure yet.</p>
          )}
          <div className="relative">
            <Input
              aria-label="Find a code to add"
              placeholder="Find a code (e.g. 0DTJ or appendix)…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {deferred.length >= 2 && (options.data ?? []).length ? (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow">
                {(options.data ?? []).map((option) => (
                  <li key={option.uuid}>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setSearch("");
                        if (codes.some((row) => row.uuid === option.uuid)) return;
                        save([
                          ...asEntries(),
                          { code: option.uuid, is_primary: codes.length === 0 },
                        ]);
                      }}
                    >
                      {formatProcedureCode(option)} — {option.description}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}
      {setCodes.error ? (
        <p className="text-sm text-red-600">{errorText(setCodes.error)}</p>
      ) : null}
    </div>
  );
}

/** Settings › Theatre › Procedure codes (CPT / ICD-10-PCS / local). */
export function TheatreProcedureCodesSettingsPanel() {
  const [system, setSystem] = useState<TheatreProcedureCodeSystem | "">("");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const deferred = useDeferredValue(search.trim());
  const codes = useTheatreProcedureCodes({ system, q: deferred, includeInactive });
  const rows = codes.data ?? [];

  return (
    <>
      <SettingsSection
        title="Procedure codes"
        description="Code sets used on procedure products, case procedures and claim lines. ICD-10-PCS is public domain (a small sample is available); CPT is licensed by the AMA and must be imported by your organisation."
      >
        <ImportCodes />
        <div className="flex flex-wrap items-end gap-2">
          <select
            aria-label="Filter by code system"
            className={SELECT_CLASS}
            value={system}
            onChange={(event) =>
              setSystem(event.target.value as TheatreProcedureCodeSystem | "")
            }
          >
            <option value="">All systems</option>
            {PROCEDURE_CODE_SYSTEMS.map((value) => (
              <option key={value} value={value}>
                {PROCEDURE_CODE_SYSTEM_LABELS[value]}
              </option>
            ))}
          </select>
          <Input
            aria-label="Search codes"
            className="max-w-xs"
            placeholder="Search code or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
            />
            Show retired
          </label>
        </div>
        {codes.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading codes…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No codes yet.</p>
        ) : (
          <table className="w-full text-sm" data-testid="theatre-procedure-codes-table">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-2">System</th>
                <th className="py-1.5 pr-2">Code</th>
                <th className="py-1.5 pr-2">Description</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((code) => (
                <CodeRow key={code.uuid} code={code} />
              ))}
            </tbody>
          </table>
        )}
        {rows.length >= 100 ? (
          <p className="text-xs text-muted-foreground">
            Showing the first 100 matches; refine the search to see more.
          </p>
        ) : null}
      </SettingsSection>
      <SettingsSection
        title="Codes on procedure products"
        description="Pick a theatre procedure from the catalogue and attach its codes. The primary code fills the case procedure code; all codes flow to visit orders and claim lines."
      >
        <ProductCodes />
      </SettingsSection>
    </>
  );
}
