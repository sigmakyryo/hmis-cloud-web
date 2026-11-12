"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyClinicalCapabilities } from "@/features/clinical-opd/hooks/use-clinical-opd";
import { useTheatreImplantRecall } from "@/features/clinical-theatre/hooks/use-theatre-cssd";
import { theatreImplantRecallExportUrl } from "@/features/clinical-theatre/services/theatre-cssd.service";
import type { TheatreImplantRecallFilters } from "@/features/clinical-theatre/types/theatre-cssd.types";
import { recallFiltersEmpty } from "@/features/clinical-theatre/utils/theatre-cssd-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const FIELDS: { key: keyof TheatreImplantRecallFilters; label: string; type?: string }[] = [
  { key: "lot", label: "Lot / batch" },
  { key: "serial", label: "Serial number" },
  { key: "product", label: "Product" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "date_from", label: "Implanted from", type: "date" },
  { key: "date_to", label: "Implanted to", type: "date" },
];

/** Trim filters and drop the empty ones. */
export function cleanRecallFilters(
  filters: TheatreImplantRecallFilters,
): TheatreImplantRecallFilters {
  const out: TheatreImplantRecallFilters = {};
  for (const [key, value] of Object.entries(filters)) {
    const trimmed = (value ?? "").trim();
    if (trimmed) out[key as keyof TheatreImplantRecallFilters] = trimmed;
  }
  return out;
}

/** Implant recall: find patients by lot, serial, product or manufacturer. */
export function TheatreImplantRecallPage() {
  const { data: capabilityData, isLoading: loadingCaps } = useMyClinicalCapabilities();
  const allowed = (capabilityData?.capabilities ?? []).includes("view_theatre_implant_recall");
  const [draft, setDraft] = useState<TheatreImplantRecallFilters>({});
  const [filters, setFilters] = useState<TheatreImplantRecallFilters>({});
  const ready = !recallFiltersEmpty(filters);
  const { data, isFetching, error } = useTheatreImplantRecall(filters, ready && allowed);

  if (!loadingCaps && !allowed) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          You do not have permission to search implant recalls.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" data-testid="theatre-implant-recall-page">
      <div>
        <h1 className="text-xl font-semibold text-brand-navy">Implant recall search</h1>
        <p className="text-sm text-muted-foreground">
          Find every patient who received an implant by lot, serial number, product or
          manufacturer.
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters(cleanRecallFilters(draft));
        }}
      >
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`recall-${field.key}`}>{field.label}</Label>
            <Input
              id={`recall-${field.key}`}
              type={field.type ?? "text"}
              className="w-44"
              value={draft[field.key] ?? ""}
              onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
            />
          </div>
        ))}
        <Button type="submit" disabled={recallFiltersEmpty(cleanRecallFilters(draft))}>
          Search
        </Button>
        {ready ? (
          <Button asChild variant="outline">
            <a href={theatreImplantRecallExportUrl(filters)} download>
              Export CSV
            </a>
          </Button>
        ) : null}
      </form>
      {!ready ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Enter at least one filter to search.
        </p>
      ) : isFetching && !data ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{errorMessage(error, "Could not search.")}</p>
      ) : data ? (
        <div className="space-y-2">
          <p className="text-sm" data-testid="theatre-implant-recall-summary">
            {data.count} implant(s) in {data.patients} patient(s)
            {data.truncated ? " — showing the first results; narrow the search or export CSV." : "."}
          </p>
          {data.results.length ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2">Implanted</th>
                    <th className="px-3 py-2">Implant</th>
                    <th className="px-3 py-2">Lot / serial</th>
                    <th className="px-3 py-2">Site</th>
                    <th className="px-3 py-2">Surgeon</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((row) => (
                    <tr key={row.uuid} className="border-t" data-testid="theatre-implant-recall-row">
                      <td className="px-3 py-2">
                        {row.patient_name}
                        <p className="text-xs text-muted-foreground">
                          {[row.patient_identifier, row.patient_phone].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="px-3 py-2">{row.implanted_on || "—"}</td>
                      <td className="px-3 py-2">
                        {row.product_name}
                        {row.manufacturer ? <p className="text-xs text-muted-foreground">{row.manufacturer}</p> : null}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {row.lot_number ? `Lot ${row.lot_number}` : ""}
                        {row.serial_number ? <span className="block">SN {row.serial_number}</span> : null}
                        {row.expiry_date ? <span className="block text-muted-foreground">exp {row.expiry_date}</span> : null}
                      </td>
                      <td className="px-3 py-2">
                        {[row.implant_site, row.implant_laterality && row.implant_laterality !== "not_applicable" ? `(${row.implant_laterality})` : ""]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="px-3 py-2">{row.surgeon_name || "—"}</td>
                      <td className="px-3 py-2">{row.status_label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
