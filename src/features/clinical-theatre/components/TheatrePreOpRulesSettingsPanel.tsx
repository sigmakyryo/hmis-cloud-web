"use client";

import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchCatalogProducts } from "@/features/catalog/services/catalog.service";
import { TheatreProcedureProductPicker } from "@/features/clinical-theatre/components/TheatreProcedureProductPicker";
import {
  useArchiveTheatrePreOpRule,
  useCreateTheatrePreOpRule,
  useTheatrePreOpRules,
} from "@/features/clinical-theatre/hooks/use-theatre-planning";
import type { TheatreProcedureProduct } from "@/features/clinical-theatre/types/theatre-catalog.types";
import type {
  TheatreComorbidity,
  TheatrePreOpTestRule,
  TheatrePreOpTestRulePayload,
} from "@/features/clinical-theatre/types/theatre-planning.types";
import {
  ASA_GRADES,
  COMORBIDITIES,
  COMORBIDITY_LABELS,
} from "@/features/clinical-theatre/utils/theatre-planning-display";
import { errorMessage } from "@/features/clinical-theatre/utils/theatre-record-display";

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60";
const MIN_SEARCH = 2;

/** Human summary of when a rule applies ("All patients" when unconditional). */
export function describeRule(
  rule: Pick<
    TheatrePreOpTestRule,
    "procedure_product" | "min_asa" | "min_age" | "max_age" | "sex" | "comorbidities"
  >,
): string {
  const parts: string[] = [];
  if (rule.procedure_product) parts.push(rule.procedure_product.name);
  if (rule.min_asa) parts.push(`ASA ${rule.min_asa}+`);
  if (rule.min_age !== null && rule.max_age !== null) parts.push(`age ${rule.min_age}–${rule.max_age}`);
  else if (rule.min_age !== null) parts.push(`age ${rule.min_age}+`);
  else if (rule.max_age !== null) parts.push(`age ≤ ${rule.max_age}`);
  if (rule.sex) parts.push(rule.sex);
  if (rule.comorbidities.length > 0) {
    parts.push(rule.comorbidities.map((value) => COMORBIDITY_LABELS[value] ?? value).join(" or "));
  }
  return parts.length > 0 ? parts.join(" · ") : "All patients";
}

function TestProductSearch({
  value,
  onChange,
}: {
  value: { uuid: string; name: string } | null;
  onChange: (product: { uuid: string; name: string } | null) => void;
}) {
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search.trim());
  const results = useQuery({
    queryKey: ["theatre", "pre-op-test-products", deferred],
    queryFn: () =>
      fetchCatalogProducts({ search: deferred, sale_ok: true, active: true, pageSize: 10 }),
    enabled: value === null && deferred.length >= MIN_SEARCH,
  });
  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-sm">
        <span className="font-medium">{value.name}</span>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Input
        id="theatre-rule-test"
        placeholder="Search lab, imaging or other test products…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {(results.data?.results ?? []).length > 0 ? (
        <ul className="max-h-48 overflow-y-auto rounded-md border text-sm">
          {(results.data?.results ?? []).map((product) => (
            <li key={product.uuid}>
              <button
                type="button"
                className="w-full px-2 py-1 text-left hover:bg-muted"
                onClick={() => {
                  onChange({ uuid: product.uuid, name: product.name });
                  setSearch("");
                }}
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Pre-op test rules: which tests a patient needs by procedure, ASA, age and comorbidity. */
export function TheatrePreOpRulesSettingsPanel() {
  const { data: rules = [], isLoading } = useTheatrePreOpRules();
  const create = useCreateTheatrePreOpRule();
  const archive = useArchiveTheatrePreOpRule();
  const [name, setName] = useState("");
  const [testProduct, setTestProduct] = useState<{ uuid: string; name: string } | null>(null);
  const [procedure, setProcedure] = useState<TheatreProcedureProduct | null>(null);
  const [minAsa, setMinAsa] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [sex, setSex] = useState<"" | "Male" | "Female">("");
  const [comorbidities, setComorbidities] = useState<TheatreComorbidity[]>([]);
  const [validity, setValidity] = useState("90");

  const reset = () => {
    setName("");
    setTestProduct(null);
    setProcedure(null);
    setMinAsa("");
    setMinAge("");
    setMaxAge("");
    setSex("");
    setComorbidities([]);
    setValidity("90");
  };

  const submit = () => {
    if (!testProduct) return;
    const payload: TheatrePreOpTestRulePayload = {
      name: name.trim() || testProduct.name,
      test_product: testProduct.uuid,
      procedure_product: procedure?.uuid ?? null,
      min_asa: minAsa,
      min_age: minAge ? Number(minAge) : null,
      max_age: maxAge ? Number(maxAge) : null,
      sex,
      comorbidities,
      validity_days: Number(validity) || 90,
    };
    create.mutate(payload, { onSuccess: reset });
  };

  return (
    <section className="space-y-4" data-testid="theatre-pre-op-rules-settings">
      <div>
        <h2 className="text-base font-semibold text-brand-navy">Pre-op test rules</h2>
        <p className="text-sm text-muted-foreground">
          A test is required when every condition on a rule matches (any one comorbidity is
          enough). Tests are only ordered after the clinician confirms in the pre-op clinic.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rules yet.</p>
      ) : (
        <table className="w-full text-sm" data-testid="theatre-pre-op-rules">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-1 pr-3">Rule</th>
              <th className="py-1 pr-3">Test</th>
              <th className="py-1 pr-3">Applies to</th>
              <th className="py-1 pr-3">Result valid</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.uuid} className="border-t">
                <td className="py-1.5 pr-3 font-medium">{rule.name}</td>
                <td className="py-1.5 pr-3">{rule.test_product?.name ?? "—"}</td>
                <td className="py-1.5 pr-3">{describeRule(rule)}</td>
                <td className="py-1.5 pr-3">{rule.validity_days} d</td>
                <td className="py-1.5 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={archive.isPending}
                    onClick={() => archive.mutate(rule.uuid)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">Add rule</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="theatre-rule-test">Test product</Label>
            <TestProductSearch value={testProduct} onChange={setTestProduct} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="theatre-rule-procedure">Only for procedure (optional)</Label>
            <TheatreProcedureProductPicker id="theatre-rule-procedure" value={procedure} onChange={setProcedure} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="theatre-rule-name">Rule name</Label>
            <Input
              id="theatre-rule-name"
              placeholder="e.g. ECG for over 50s"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label htmlFor="theatre-rule-asa">ASA ≥</Label>
              <select id="theatre-rule-asa" className={SELECT_CLASS} value={minAsa} onChange={(event) => setMinAsa(event.target.value)}>
                <option value="">Any</option>
                {ASA_GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="theatre-rule-min-age">Age ≥</Label>
              <Input id="theatre-rule-min-age" type="number" min={0} value={minAge} onChange={(event) => setMinAge(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="theatre-rule-max-age">Age ≤</Label>
              <Input id="theatre-rule-max-age" type="number" min={0} value={maxAge} onChange={(event) => setMaxAge(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="theatre-rule-sex">Sex</Label>
              <select
                id="theatre-rule-sex"
                className={SELECT_CLASS}
                value={sex}
                onChange={(event) => setSex(event.target.value as "" | "Male" | "Female")}
              >
                <option value="">Any</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
        </div>
        <fieldset className="space-y-1">
          <legend className="text-sm">Comorbidities (any of)</legend>
          <div className="grid gap-1 sm:grid-cols-3 lg:grid-cols-4">
            {COMORBIDITIES.map((row) => (
              <label key={row.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={comorbidities.includes(row.value)}
                  onChange={(event) =>
                    setComorbidities(
                      event.target.checked
                        ? [...comorbidities, row.value]
                        : comorbidities.filter((value) => value !== row.value),
                    )
                  }
                />
                {row.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="theatre-rule-validity">A previous result is reusable for (days)</Label>
            <Input
              id="theatre-rule-validity"
              type="number"
              min={1}
              className="w-28"
              value={validity}
              onChange={(event) => setValidity(event.target.value)}
            />
          </div>
          <Button type="button" disabled={!testProduct || create.isPending} onClick={submit}>
            Add rule
          </Button>
        </div>
        {create.error || archive.error ? (
          <p className="text-sm text-red-600">
            {errorMessage(create.error ?? archive.error, "Could not save the rule.")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
