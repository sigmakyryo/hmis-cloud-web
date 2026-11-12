"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { PageActionButton, SecondaryButton } from "@/components/ui/app-buttons";
import { Drawer, DrawerActions } from "@/app/(app)/immunizations/_components/shared/Drawer";
import { CheckField, Field } from "@/app/(app)/immunizations/_components/shared/Field";
import {
  saveDaRiskConfig,
  textToTiers,
  tiersToText,
  type DaRiskPool,
} from "@/features/occupational-health/services/drug-alcohol-risk.service";
import { useToast } from "@/providers/toast-provider";
import { errorText } from "../shared/da-format";
import { DaSection } from "../shared/da-ui";

const NUMBER_FIELDS = [
  ["base_drug_rate", "Starting drug rate %"],
  ["base_alcohol_rate", "Starting alcohol rate %"],
  ["min_drug_rate", "Lowest drug rate %"],
  ["max_drug_rate", "Highest drug rate %"],
  ["min_alcohol_rate", "Lowest alcohol rate %"],
  ["max_alcohol_rate", "Highest alcohol rate %"],
  ["lookback_months", "Count incidents from the last (months)"],
  ["incident_weight", "Extra weight per incident"],
  ["site_incident_weight", "Extra weight per site incident"],
  ["max_weight", "Largest weight"],
] as const;

type NumberKey = (typeof NUMBER_FIELDS)[number][0];

export function DaRiskSettingsDrawer({ pool, onClose }: { pool: DaRiskPool; onClose: () => void }) {
  const { toast } = useToast();
  const client = useQueryClient();
  const r = pool.risk;
  const [enabled, setEnabled] = useState(r.enabled);
  const [weighted, setWeighted] = useState(r.weighted_draw);
  const [auto, setAuto] = useState(r.auto_propose);
  const [numbers, setNumbers] = useState<Record<NumberKey, string>>(
    () => Object.fromEntries(NUMBER_FIELDS.map(([k]) => [k, String(r[k])])) as Record<NumberKey, string>,
  );
  const [tierWeights, setTierWeights] = useState({
    "1": String(r.tier_weights["1"] ?? 1),
    "2": String(r.tier_weights["2"] ?? 1.5),
    "3": String(r.tier_weights["3"] ?? 2),
  });
  const [roles, setRoles] = useState(tiersToText(r.role_tiers));
  const [sites, setSites] = useState(tiersToText(r.site_tiers));

  const save = useMutation({
    mutationFn: () =>
      saveDaRiskConfig(pool.uuid, {
        enabled,
        weighted_draw: weighted,
        auto_propose: auto,
        ...(Object.fromEntries(NUMBER_FIELDS.map(([k]) => [k, Number(numbers[k])])) as Record<NumberKey, number>),
        tier_weights: { "1": Number(tierWeights["1"]), "2": Number(tierWeights["2"]), "3": Number(tierWeights["3"]) },
        role_tiers: textToTiers(roles),
        site_tiers: textToTiers(sites),
      }),
    onSuccess: () => {
      toast({ variant: "success", title: "Risk settings saved" });
      void client.invalidateQueries({ queryKey: ["oh-da", "risk"] });
      onClose();
    },
    onError: (error) => toast({ variant: "error", title: "Not saved", description: errorText(error) }),
  });

  return (
    <Drawer title={`Risk settings · ${pool.name}`} description="Rates change only after approval" onClose={onClose} wide>
      <div className="space-y-5" data-testid="oh-da-risk-settings">
        <DaSection title="Switches">
          <div className="space-y-2 pt-1">
            <CheckField label="Work out rates from risk" checked={enabled} onChange={setEnabled} />
            <CheckField label="Give higher-risk workers a bigger chance of being picked" checked={weighted} onChange={setWeighted} />
            <CheckField label="Suggest new rates every month" checked={auto} onChange={setAuto} />
          </div>
        </DaSection>
        <DaSection title="Rates and limits">
          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            {NUMBER_FIELDS.map(([key, text]) => (
              <Field key={key} label={text} type="number" value={numbers[key]} onChange={(v) => setNumbers((prev) => ({ ...prev, [key]: v }))} />
            ))}
          </div>
        </DaSection>
        <DaSection title="Risk levels">
          <div className="grid gap-3 pt-1 sm:grid-cols-3">
            {(["1", "2", "3"] as const).map((tier) => (
              <Field
                key={tier}
                label={`Weight for level ${tier}${tier === "1" ? " (standard)" : tier === "3" ? " (high)" : ""}`}
                type="number"
                value={tierWeights[tier]}
                onChange={(v) => setTierWeights((prev) => ({ ...prev, [tier]: v }))}
              />
            ))}
          </div>
          <div className="grid gap-3 pt-3 sm:grid-cols-2">
            <TierBox label="Job titles (one per line, e.g. Blaster = 3)" value={roles} onChange={setRoles} />
            <TierBox label="Sites (one per line, e.g. North pit = 2)" value={sites} onChange={setSites} />
          </div>
        </DaSection>
        <DrawerActions>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PageActionButton disabled={save.isPending} onClick={() => save.mutate()}>
            Save
          </PageActionButton>
        </DrawerActions>
      </div>
    </Drawer>
  );
}

function TierBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1.5 text-[13px]">
      <span className="text-dash-muted">{label}</span>
      <textarea
        aria-label={label}
        className="min-h-24 w-full rounded-md border border-dash-border px-3 py-2 font-mono text-[12px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
