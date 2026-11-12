"use client";

import { useEffect, useMemo, useState } from "react";

import { StatusDotBadge, type StatusDotBadgeTone } from "@/components/ui/status-dot-badge";
import type { CatalogPricelist } from "@/features/catalog/types/catalog.types";
import {
  fetchPricelistValidationConfig,
  fetchValidationPackDefinitions,
  updatePricelistValidationConfig,
} from "@/features/claims/services/claims.service";
import type {
  ValidationDefinitionSummary,
  ValidationPack,
} from "@/features/claims/types/claims.types";
import { AdvisorPackPicker } from "@/features/inventory/components/detail/AdvisorPackPicker";
import { BffError } from "@/lib/bff-client";
import { formatBffErrorMessage } from "@/lib/bff-field-errors";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

type PricelistDetailAdvisorPackTabProps = {
  pricelist: CatalogPricelist;
  isActive: boolean;
};

function severityTone(severity: string): StatusDotBadgeTone {
  const value = severity.trim().toLowerCase();
  if (value === "rejection_risk") {
    return "danger";
  }
  if (value === "warning") {
    return "warning";
  }
  if (value === "info") {
    return "info";
  }
  return "neutral";
}

function formatAreaLabel(category: string): string {
  return category
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PricelistDetailAdvisorPackTab({
  pricelist,
  isActive,
}: PricelistDetailAdvisorPackTabProps) {
  const { toast } = useToast();
  const [pack, setPack] = useState<ValidationPack | null>(null);
  const [definitions, setDefinitions] = useState<ValidationDefinitionSummary[]>([]);
  const [loadedForUuid, setLoadedForUuid] = useState<string | null>(null);
  const [definitionsPackCode, setDefinitionsPackCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDefinitions, setIsLoadingDefinitions] = useState(false);
  const isLoading = loadedForUuid !== pricelist.uuid;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const config = await fetchPricelistValidationConfig(pricelist.uuid);
        if (!cancelled) {
          setPack(config.selected_packs[0] ?? null);
          setLoadedForUuid(pricelist.uuid);
        }
      } catch {
        if (!cancelled) {
          setPack(null);
          setLoadedForUuid(pricelist.uuid);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pricelist.uuid]);

  useEffect(() => {
    if (!pack?.code) {
      setDefinitions([]);
      setDefinitionsPackCode(null);
      return;
    }

    let cancelled = false;
    setIsLoadingDefinitions(true);
    void (async () => {
      try {
        const rows = await fetchValidationPackDefinitions(pack.code);
        if (!cancelled) {
          setDefinitions(rows);
          setDefinitionsPackCode(pack.code);
        }
      } catch {
        if (!cancelled) {
          setDefinitions([]);
          setDefinitionsPackCode(pack.code);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDefinitions(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pack?.code]);

  const groupedDefinitions = useMemo(() => {
    const groups = new Map<string, ValidationDefinitionSummary[]>();
    for (const definition of definitions) {
      const key = definition.category || "other";
      const existing = groups.get(key) ?? [];
      existing.push(definition);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [definitions]);

  async function handlePackChange(nextPack: ValidationPack | null) {
    setIsSaving(true);
    try {
      const config = await updatePricelistValidationConfig(
        pricelist.uuid,
        nextPack ? [nextPack.code] : [],
      );
      setPack(config.selected_packs[0] ?? null);
      toast({
        variant: "success",
        title: nextPack
          ? `${config.selected_packs[0]?.name ?? nextPack.name} will run on claims billed to this pricelist.`
          : "Only global claim-quality checks will run for this pricelist.",
      });
    } catch (error) {
      const message =
        error instanceof BffError
          ? formatBffErrorMessage(error.message, error.errors)
          : "Could not save the advisor pack.";
      toast({ title: message, variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className={cn("space-y-4", !isActive && "hidden")}
      data-testid="pricelist-advisor-pack-tab"
    >
      <section
        className="space-y-3 rounded-xl border border-brand-border bg-white p-5"
        data-testid="pricelist-advisor-pack"
      >
        <AdvisorPackPicker
          pack={pack}
          onPackChange={(nextPack) => {
            void handlePackChange(nextPack);
          }}
          disabled={isLoading || isSaving || !pricelist.is_active}
        />
        {!pack ? (
          <p className="text-sm text-brand-muted" data-testid="pricelist-advisor-pack-empty">
            No advisor pack. Only global claim-quality checks will run.
          </p>
        ) : (
          <p className="text-sm text-brand-navy" data-testid="pricelist-advisor-pack-assigned">
            {pack.name}
          </p>
        )}
      </section>

      {pack ? (
        <section
          className="space-y-4 rounded-xl border border-brand-border bg-white p-5"
          data-testid="pricelist-advisor-pack-rules"
        >
          <div>
            <h2 className="text-sm font-semibold text-brand-navy">Rules in this pack</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Deterministic checks that run when claims are billed against this pricelist.
            </p>
          </div>

          {isLoadingDefinitions || definitionsPackCode !== pack.code ? (
            <p className="text-sm text-brand-muted">Loading rules…</p>
          ) : definitions.length === 0 ? (
            <p className="text-sm text-brand-muted">This pack has no active rules.</p>
          ) : (
            <div className="space-y-5">
              {groupedDefinitions.map(([area, rows]) => (
                <div key={area} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
                    {formatAreaLabel(area)}
                  </h3>
                  <ul className="space-y-2">
                    {rows.map((definition) => (
                      <li
                        key={definition.code}
                        className="rounded-lg border border-brand-border/70 px-3 py-2.5"
                        data-testid="pricelist-advisor-rule"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusDotBadge tone={severityTone(definition.severity)}>
                            {definition.severity.replaceAll("_", " ")}
                          </StatusDotBadge>
                          <p className="text-sm font-medium text-brand-navy">
                            {definition.name}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-brand-muted">{definition.message}</p>
                        {definition.applies_to_categories.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {definition.applies_to_categories.map((category) => (
                              <span
                                key={`${definition.code}-${category.code}`}
                                className="rounded-md border border-brand-border bg-dash-canvas px-2 py-0.5 text-xs text-dash-muted"
                              >
                                {category.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
